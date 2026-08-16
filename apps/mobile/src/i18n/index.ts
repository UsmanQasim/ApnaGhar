import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import { DEFAULT_LOCALE, Locale, LOCALES } from '@ghar/shared';
import { i18nConfig } from '@ghar/i18n';

/**
 * Urdu is the DEFAULT, not the fallback. A device set to English still gets
 * Urdu unless the user opts into English in settings — the target user is far
 * more likely to have an English phone locale than to prefer English.
 */
export function detectLocale(): Locale {
  const device = Localization.getLocales()[0]?.languageCode;
  return device === Locale.EN ? Locale.EN : DEFAULT_LOCALE;
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

export { i18n };
