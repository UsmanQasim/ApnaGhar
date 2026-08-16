import en from './locales/en.json';
import ur from './locales/ur.json';

export * from './format';

export const resources = {
  ur: { translation: ur },
  en: { translation: en },
} as const;

export { ur, en };

/**
 * i18next config shared by the app, the admin panel and the share pages.
 *
 * Note `fallbackLng: 'ur'`. Urdu is the default, not the fallback — an English
 * string leaking into the Urdu UI is a CI failure (see scripts/check-parity.mjs),
 * so this fallback should never actually fire.
 */
export const i18nConfig = {
  resources,
  fallbackLng: 'ur',
  supportedLngs: ['ur', 'en'],
  interpolation: { escapeValue: false },
  returnNull: false,
} as const;
