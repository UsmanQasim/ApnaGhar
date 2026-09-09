'use client';

import { parseLocale, type Locale } from '@ghar/shared';

import { LOCALE_COOKIE } from './locale-cookie';

/**
 * The locale, for CLIENT components that have no server parent to hand it
 * down — in practice only `app/error.tsx`, which React requires to be a
 * client component and renders outside the normal tree.
 *
 * Reads the cookie directly, which is why the cookie is deliberately not
 * httpOnly: it is a display preference, not a credential.
 */
export function useLocale(): Locale {
  if (typeof document === 'undefined') return parseLocale(undefined);

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));

  return parseLocale(match?.slice(LOCALE_COOKIE.length + 1));
}
