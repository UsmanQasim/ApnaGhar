import Constants from 'expo-constants';

import { useAuthStore } from '../store/auth';

const BASE_URL =
  (Constants.expoConfig?.extra?.['apiBaseUrl'] as string | undefined) ?? 'http://localhost:3000/api';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** Stable machine code — the UI resolves it through i18n, never displays it. */
    readonly code: string,
    readonly fields?: Array<{ path: string; message: string }>,
  ) {
    super(code);
    this.name = 'ApiError';
  }

  /** i18n key for this error, falling back to a generic Urdu message. */
  get messageKey(): string {
    if (this.status === 0) return 'errors.offline';
    if (this.status >= 500) return 'errors.serverDown';
    if (this.status === 403) return 'errors.notAllowed';
    if (this.status === 404) return 'errors.notFound';

    const known: Record<string, string> = {
      otp_expired: 'errors.otpExpired',
      otp_invalid: 'errors.invalidOtp',
      otp_too_many_attempts: 'errors.tooManyAttempts',
      invalid_pk_mobile_number: 'errors.invalidPhone',
    };
    return known[this.code] ?? 'errors.somethingWrong';
  }
}

let refreshInFlight: Promise<boolean> | null = null;

/**
 * Refresh is deduplicated: on a cold start the feed, the billing card and the
 * profile all fire at once, and three parallel refreshes would rotate the token
 * three times and invalidate two of them.
 */
async function refreshOnce(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      const { refreshToken, setTokens, signOut } = useAuthStore.getState();
      if (!refreshToken) return false;

      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        signOut();
        return false;
      }

      const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
      setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; retry?: boolean } = {},
): Promise<T> {
  const { accessToken } = useAuthStore.getState();

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'content-type': 'application/json',
        ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    // fetch only rejects on network failure — status 0 means "no internet",
    // which gets its own plain-Urdu message rather than a technical one.
    throw new ApiError(0, 'network_error');
  }

  if (response.status === 401 && options.retry !== false) {
    if (await refreshOnce()) return api<T>(path, { ...options, retry: false });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      code?: string;
      message?: string;
      fields?: Array<{ path: string; message: string }>;
    };
    throw new ApiError(
      response.status,
      payload.code ?? payload.message ?? 'unknown_error',
      payload.fields,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/**
 * Money arrives as a STRING, because Prisma emits BigInt and JSON has no
 * BigInt. Convert at the edge, once, and only for display — never do
 * arithmetic on the result.
 */
export function toPaisa(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'number' ? value : Number(value);
}
