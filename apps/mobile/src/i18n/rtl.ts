import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';

import { Locale } from '@ghar/shared';

/**
 * RTL is the single most error-prone part of an Urdu-first React Native app,
 * because `I18nManager.forceRTL` does NOT take effect until the JS bundle
 * reloads. Native layout direction is decided at startup.
 *
 * If you call forceRTL(true) and just re-render, you get a half-flipped UI:
 * flexbox mirrors but native components (TextInput caret, ScrollView anchoring,
 * Switch, the back gesture) keep the old direction. That inconsistency is
 * exactly the bug that makes an app feel broken to an Urdu reader.
 *
 * So: set it once at boot, and if the direction actually changed, reload.
 */

export function isRtlLocale(locale: Locale): boolean {
  return locale === Locale.UR;
}

/**
 * Call before the first render. Returns true when a reload was triggered, in
 * which case the caller should render nothing — the app is about to restart.
 */
export async function applyLayoutDirection(locale: Locale): Promise<boolean> {
  const shouldBeRtl = isRtlLocale(locale);

  I18nManager.allowRTL(true);

  if (I18nManager.isRTL === shouldBeRtl) return false;

  I18nManager.forceRTL(shouldBeRtl);

  // Expo Go and the web build cannot reload this way; in development the
  // direction applies on the next manual refresh.
  if (Platform.OS === 'web' || __DEV__) {
    console.warn(
      `[rtl] Layout direction changed to ${shouldBeRtl ? 'RTL' : 'LTR'}. ` +
        'Reload the app manually to apply it.',
    );
    return false;
  }

  await Updates.reloadAsync();
  return true;
}

/**
 * Physical direction, for the handful of things that must NOT mirror.
 *
 * Mirror: layout, icons with direction (arrows, chevrons), progress bars.
 * Do NOT mirror: media playback controls (play always points at the timeline
 * head), phone numbers, and Latin-script brand marks.
 */
export const isRTL = (): boolean => I18nManager.isRTL;

/**
 * Numerals inside an RTL paragraph are rendered left-to-right by the bidi
 * algorithm, which is correct — but a bare number adjacent to punctuation can
 * flip the punctuation to the wrong side. Wrapping in LRM isolates it.
 *
 *   "5 مرلہ, 3 بیڈروم"  →  the comma can jump. Wrap the digits.
 */
const LRM = '‎';
export function isolateNumber(value: string | number): string {
  return `${LRM}${value}${LRM}`;
}
