import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import { DEFAULT_LOCALE, isLatinScript, Locale, LOCALES, parseLocale } from '@ghar/shared';
import { i18nConfig } from '@ghar/i18n';
import type { Script } from '@ghar/ui';

const STORAGE_KEY = 'ghar-locale';

/**
 * The locale to use when the user has never chosen one.
 *
 * Urdu is the DEFAULT, not the fallback. A device set to English still gets
 * Urdu unless the user opts into English in settings — the target user is far
 * more likely to have an English phone locale than to prefer English.
 *
 * Roman Urdu is never auto-selected: no device reports it, and guessing that
 * someone wants transliteration is a judgement the app has no basis for. It is
 * offered in settings, one tap away.
 */
export function detectLocale(): Locale {
  const device = Localization.getLocales()[0]?.languageTag;
  return parseLocale(device) === Locale.EN ? Locale.EN : DEFAULT_LOCALE;
}

/**
 * The user's stored choice, falling back to the device.
 *
 * Without this, `changeLanguage` lasted exactly as long as the process:
 * the next cold start called detectLocale() again and silently reverted an
 * English or Roman Urdu reader to Nastaliq.
 */
export async function loadLocale(): Promise<Locale> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) return parseLocale(saved);
  } catch {
    // A read failure is not worth blocking startup over; fall through to the
    // device locale, which is what a first run does anyway.
  }
  return detectLocale();
}

export async function saveLocale(locale: Locale): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Best effort. The language still changes for this session.
  }
}

export async function initI18n(locale: Locale): Promise<void> {
  if (i18n.isInitialized) {
    await i18n.changeLanguage(locale);
    return;
  }

  await i18n.use(initReactI18next).init({
    ...i18nConfig,
    lng: locale,
    supportedLngs: [...LOCALES],
    compatibilityJSON: 'v3', // required for plurals on React Native's Intl
  });
}

/** The active locale, narrowed — i18n.language is a bare string. */
export function activeLocale(): Locale {
  return parseLocale(i18n.language);
}

/**
 * Which alphabet to typeset in. Roman Urdu and English are Latin; Urdu is
 * Nastaliq. Separate from direction — Roman Urdu is Latin AND left-to-right,
 * but the two are decided independently.
 */
export function scriptFor(locale: Locale): Script {
  return isLatinScript(locale) ? 'latin' : 'nastaliq';
}

export { i18n };
