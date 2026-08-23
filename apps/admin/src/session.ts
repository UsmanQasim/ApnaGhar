'use server';

import { cookies } from 'next/headers';

import { SESSION_COOKIE } from './session-cookie';

/**
 * Admin sign-in.
 *
 * The panel had no login route at all — the code read a `ghar_admin` cookie
 * that nothing ever set, so every page 401'd against the API. These actions
 * fill that gap.
 *
 * Server actions, not client fetches, for the same reason `adminApi` is
 * server-only: the access token must never be handed to client JS. It arrives
 * here, goes straight into an httpOnly cookie, and the browser never sees it.
 */

const BASE = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api';

export interface ActionResult {
  ok: boolean;
  /** Machine-readable code, mapped to Urdu by the form. */
  code?: string;
  /** Dev convenience: the API echoes the OTP when OTP_DEV_MODE=true. */
  devCode?: string;
}

type Json = Record<string, unknown>;

async function post(path: string, body: unknown): Promise<{ status: number; json: Json }> {
  try {
    const response = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const json = (await response.json().catch(() => ({}))) as Json;
    return { status: response.status, json };
  } catch {
    // Unreachable host — API not deployed, or asleep on Render's free tier.
    return { status: 0, json: {} };
  }
}

/**
 * Read the `role` claim without verifying the signature.
 *
 * Safe here because this is a UI gate, not an authorisation decision: the API
 * verifies the signature on every request and rejects a non-admin regardless.
 * Checking it up front just means a customer who signs in gets an honest
 * "this account is not an admin" instead of a panel where every panel 403s.
 */
function roleFromToken(token: string): string | null {
  const segment = token.split('.')[1];
  if (!segment) return null;

  try {
    const payload = JSON.parse(
      Buffer.from(segment.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'),
    ) as Json;
    return typeof payload['role'] === 'string' ? payload['role'] : null;
  } catch {
    return null;
  }
}

export async function requestOtp(phone: string): Promise<ActionResult> {
  const { status, json } = await post('/auth/otp/request', { phone });

  if (status === 0) return { ok: false, code: 'api_unreachable' };
  if (status >= 400) {
    return { ok: false, code: typeof json['code'] === 'string' ? json['code'] : 'otp_request_failed' };
  }

  return { ok: true, devCode: typeof json['devCode'] === 'string' ? json['devCode'] : undefined };
}

export async function verifyOtp(phone: string, code: string): Promise<ActionResult> {
  const { status, json } = await post('/auth/otp/verify', { phone, code });

  if (status === 0) return { ok: false, code: 'api_unreachable' };
  if (status >= 400) {
    return { ok: false, code: typeof json['code'] === 'string' ? json['code'] : 'otp_invalid' };
  }

  const accessToken = typeof json['accessToken'] === 'string' ? json['accessToken'] : null;
  if (!accessToken) return { ok: false, code: 'otp_invalid' };

  if (roleFromToken(accessToken) !== 'admin') return { ok: false, code: 'not_admin' };

  const jar = await cookies();

  jar.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Matches JWT_ACCESS_TTL (15m by default). Deliberately not longer than the
    // token itself — a cookie that outlives its JWT produces confusing 401s
    // instead of a clean redirect back to this form.
    maxAge: 15 * 60,
  });

  return { ok: true };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
