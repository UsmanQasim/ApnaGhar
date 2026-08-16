import { cookies } from 'next/headers';

const BASE = process.env['API_BASE_URL'] ?? 'http://localhost:3000/api';

export class AdminApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

/**
 * Server-side fetch only. The admin token lives in an httpOnly cookie and is
 * never handed to client JS — this panel can approve payments and suspend
 * accounts, so an XSS on it would be a very expensive bug.
 */
export async function adminApi<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const token = (await cookies()).get('ghar_admin')?.value;

  const response = await fetch(`${BASE}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: 'no-store',
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { code?: string };
    throw new AdminApiError(response.status, payload.code ?? 'request_failed');
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Rupees for display. Money crosses the wire as a paisa string. */
export function rupees(paisa: string | number | bigint): string {
  return (Number(paisa) / 100).toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  });
}
