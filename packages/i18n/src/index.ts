import en from './locales/en.json';
import urLatn from './locales/ur-Latn.json';
import ur from './locales/ur.json';

export * from './format';

export const resources = {
  ur: { translation: ur },
  'ur-Latn': { translation: urLatn },
  en: { translation: en },
} as const;

export { ur, urLatn, en };

/**
 * Every bundle, keyed by locale — for the server-rendered surfaces (the admin
 * panel, the share pages) that resolve a string without an i18next instance.
 * The API's notification renderer uses it too, so an SMS goes out in the
 * recipient's own locale rather than whichever one the code happened to import.
 */
export const bundles = {
  ur,
  'ur-Latn': urLatn,
  en,
} as const;

/**
 * i18next config shared by the app, the admin panel and the share pages.
 *
 * `fallbackLng: 'ur'` — Urdu is the default, not the fallback. An English
 * string leaking into the Urdu UI is a CI failure (scripts/check-parity.mjs),
 * so this should never actually fire.
 *
 * `ur-Latn` is a full bundle, not a variant that falls through to `ur`. If it
 * were only partial, i18next would quietly serve Nastaliq lines to a reader
 * who picked Roman Urdu precisely because they cannot read Nastaliq — a
 * failure that looks like a rendering bug rather than a missing translation.
 * The parity check enforces completeness, including that no Arabic-script
 * character survives in the Roman bundle.
 */
export const i18nConfig = {
  resources,
  fallbackLng: 'ur',
  supportedLngs: ['ur', 'ur-Latn', 'en'],
  interpolation: { escapeValue: false },
  returnNull: false,
} as const;
