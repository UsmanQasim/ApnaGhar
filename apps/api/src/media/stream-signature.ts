import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Cloudflare Stream webhook signature, extracted as a pure function so it can
 * be tested without Nest's DI container.
 *
 * This is a security boundary, not a formality: this webhook is what flips a
 * video to `ready`. An unauthenticated one would let anyone mark arbitrary
 * media as processed, and — because publish checks media state — publish a
 * listing with content we never transcoded or inspected.
 *
 * Header format: `time=1700000000,sig1=<hex>`
 * Signed value:  HMAC-SHA256(secret, `${time}.${rawBody}`)
 */

export const REPLAY_WINDOW_SECONDS = 300;

export function parseSignatureHeader(
  header: string | undefined,
): { time: number; signature: string } | null {
  if (!header) return null;

  const parts: Record<string, string> = {};
  for (const segment of header.split(',')) {
    const [key, value] = segment.split('=');
    if (key && value) parts[key.trim()] = value.trim();
  }

  const time = Number(parts['time']);
  const signature = parts['sig1'];
  if (!Number.isFinite(time) || !signature) return null;

  return { time, signature };
}

export function computeStreamSignature(secret: string, time: number, rawBody: string): string {
  return createHmac('sha256', secret).update(`${time}.${rawBody}`).digest('hex');
}

export function verifyStreamSignature(
  secret: string,
  header: string | undefined,
  rawBody: string,
  now: Date = new Date(),
): boolean {
  const parsed = parseSignatureHeader(header);
  if (!parsed) return false;

  // Replay window. A valid signature is valid forever without this, so a
  // captured webhook could be resent months later.
  const ageSeconds = Math.abs(now.getTime() / 1000 - parsed.time);
  if (ageSeconds > REPLAY_WINDOW_SECONDS) return false;

  const expected = computeStreamSignature(secret, parsed.time, rawBody);
  if (expected.length !== parsed.signature.length) return false;

  return timingSafeEqual(Buffer.from(expected), Buffer.from(parsed.signature));
}
