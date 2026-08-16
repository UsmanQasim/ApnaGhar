import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * JazzCash secure-hash, extracted as a pure function so it can be unit tested
 * without Nest's DI container. Security-critical code that is awkward to test
 * tends to go untested, and this is the one function standing between you and
 * a forged "payment successful" callback.
 *
 * Algorithm: HMAC-SHA256 over `salt + '&' + values`, where `values` is every
 * non-empty parameter EXCEPT pp_SecureHash, sorted by key, joined by '&'.
 */
export function buildSecureHash(integritySalt: string, params: Record<string, string>): string {
  const payload = Object.keys(params)
    .filter((key) => key !== 'pp_SecureHash')
    .sort()
    .map((key) => params[key] ?? '')
    .filter((value) => value !== '')
    .join('&');

  return createHmac('sha256', integritySalt)
    .update(`${integritySalt}&${payload}`)
    .digest('hex')
    .toUpperCase();
}

/**
 * Constant-time comparison. A naive `===` short-circuits on the first differing
 * byte, which leaks how much of a guessed hash was correct.
 */
export function verifySecureHash(
  integritySalt: string,
  params: Record<string, string>,
): boolean {
  const received = (params['pp_SecureHash'] ?? '').toUpperCase();
  const expected = buildSecureHash(integritySalt, params);
  if (received.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

/** JazzCash timestamps are yyyyMMddHHmmss in Pakistan Standard Time (UTC+5). */
export function formatJazzCashTimestamp(date: Date): string {
  const pkt = new Date(date.getTime() + 5 * 3_600_000);
  const p = (n: number): string => String(n).padStart(2, '0');
  return (
    `${pkt.getUTCFullYear()}${p(pkt.getUTCMonth() + 1)}${p(pkt.getUTCDate())}` +
    `${p(pkt.getUTCHours())}${p(pkt.getUTCMinutes())}${p(pkt.getUTCSeconds())}`
  );
}

/** '000' and '121' are JazzCash's success codes; everything else is a failure. */
export function isJazzCashSuccessCode(code: string): boolean {
  return code === '000' || code === '121';
}
