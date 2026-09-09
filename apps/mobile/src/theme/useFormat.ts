import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { AreaUnit, isLatinScript, parseLocale, type Paisa } from '@ghar/shared';
import {
  formatArea,
  formatPrice,
  formatPriceExact,
  formatRelativeTime,
  formatTimeRemaining,
} from '@ghar/i18n';

import { isolateNumber } from '../i18n/rtl';

/**
 * Every user-visible number goes through here. Two reasons it is a hook rather
 * than a bare import:
 *
 *  1. it picks up the active locale automatically, so no screen can forget
 *  2. it applies bidi isolation, so digits inside an Urdu sentence do not drag
 *     the surrounding punctuation to the wrong side
 *
 * A screen should never call `String(price)` — the user must see "85 لاکھ",
 * never "8500000".
 */
export function useFormat(urduNumerals = false) {
  const { i18n } = useTranslation();
  // Was `i18n.language === EN ? EN : UR`, which quietly folded Roman Urdu into
  // Urdu — every price, area and timestamp on every screen would have come
  // back in Nastaliq inside an otherwise Latin-script page.
  const locale = parseLocale(i18n.language);

  const opts = useMemo(() => ({ locale, urduNumerals }), [locale, urduNumerals]);

  return {
    locale,
    /**
     * BCP-47 tag for Intl (`toLocaleDateString` and friends).
     *
     * Roman Urdu maps to en-PK on purpose: asking Intl for "ur-PK" returns
     * month names in Arabic script, which is precisely what a Roman Urdu
     * reader chose this locale to avoid. Same calendar and conventions,
     * readable alphabet.
     */
    intlLocale: isLatinScript(locale) ? 'en-PK' : 'ur-PK',
    /** "85 لاکھ روپے" — magnitude words, never raw digit strings. */
    price: useCallback((paisa: Paisa) => isolateNumber(formatPrice(paisa, opts)), [opts]),
    /** Exact, grouped south-asian style. Invoices only. */
    priceExact: useCallback((paisa: Paisa) => isolateNumber(formatPriceExact(paisa, opts)), [opts]),
    /** "5 مرلہ" */
    area: useCallback(
      (value: number, unit: AreaUnit) => isolateNumber(formatArea(value, unit, opts)),
      [opts],
    ),
    /** "3 دن پہلے" */
    relativeTime: useCallback((date: Date) => formatRelativeTime(date, opts), [opts]),
    /** "27 منٹ باقی" — share-link countdown. null when the link never expires. */
    timeRemaining: useCallback(
      (expiresAt: Date | null) => formatTimeRemaining(expiresAt, opts),
      [opts],
    ),
    /** Bare count, bidi-isolated. */
    count: useCallback((n: number) => isolateNumber(n), []),
  };
}
