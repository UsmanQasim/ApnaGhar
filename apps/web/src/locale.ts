import { cookies, headers } from 'next/headers';

import {
  DEFAULT_LOCALE,
  isRtlLocale,
  localeFromAcceptLanguage,
  parseLocale,
  type Locale,
} from '@ghar/shared';
import { webFontStack, webLineHeight, type Script } from '@ghar/ui';

import { LOCALE_COOKIE } from './locale-cookie';

/**
 * The locale for this request: an explicit choice first, the browser second.
 *
 * Read per request rather than baked at build time — these are server
 * components, so a language switch is a cookie write and a re-render, with no
 * client bundle and no hydration boundary.
 */
export async function getLocale(): Promise<Locale> {
  const chosen = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (chosen) return parseLocale(chosen);

  try {
    return localeFromAcceptLanguage((await headers()).get('accept-language'));
  } catch {
    // headers() throws when a route is statically rendered. Falling back to
    // Urdu is correct there: it is the default, not a guess.
    return DEFAULT_LOCALE;
  }
}

/**
 * Everything `<html>` needs, in one call.
 *
 * Direction and script are separate questions and Roman Urdu is why: it is
 * Urdu, written in Latin letters, left to right. Deriving `dir` from "is it
 * Urdu?" would flip a Roman Urdu page into RTL and mirror the whole layout.
 */
export function documentAttributes(locale: Locale): {
  lang: Locale;
  dir: 'rtl' | 'ltr';
  script: Script;
  fontFamily: string;
  lineHeight: number;
} {
  const rtl = isRtlLocale(locale);
  const script: Script = rtl ? 'nastaliq' : 'latin';

  return {
    lang: locale,
    dir: rtl ? 'rtl' : 'ltr',
    script,
    fontFamily: webFontStack[script],
    lineHeight: webLineHeight[script],
  };
}
