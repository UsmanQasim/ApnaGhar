/**
 * The cookie name, on its own.
 *
 * `locale-actions.ts` is a `'use server'` module and such a file may ONLY
 * export async functions — a exported constant there is a build error. Same
 * reason `session-cookie.ts` exists separately in the admin panel.
 */
export const LOCALE_COOKIE = 'ghar-locale';

/** A year. The choice is a preference, not a session. */
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
