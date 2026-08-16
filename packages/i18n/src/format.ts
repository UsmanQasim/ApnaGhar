import { AreaUnit, Locale, type Paisa } from '@ghar/shared';

/**
 * Formatting for a Pakistani audience.
 *
 * Rule of thumb enforced here: a user should NEVER see a raw number like
 * 8500000. They see "85 لاکھ". Illiterate and semi-literate users read magnitude
 * words far more reliably than long digit strings.
 */

export const URDU_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'] as const;

/** Convert Latin digits to Urdu-Indic digits. Non-digits pass through. */
export function toUrduDigits(input: string): string {
  return input.replace(/\d/g, (d) => URDU_DIGITS[Number(d)] ?? d);
}

export function toLatinDigits(input: string): string {
  return input.replace(/[۰-۹]/g, (d) => String(URDU_DIGITS.indexOf(d as (typeof URDU_DIGITS)[number])));
}

export interface NumeralOptions {
  locale: Locale;
  /** User preference: some Urdu readers still prefer Latin digits. */
  urduNumerals?: boolean;
}

function applyNumerals(text: string, opts: NumeralOptions): string {
  const useUrdu = opts.urduNumerals ?? opts.locale === Locale.UR;
  return useUrdu ? toUrduDigits(text) : text;
}

// ─────────────────────────────────────────────────────────────────────────────
// Price: لاکھ / کروڑ
// ─────────────────────────────────────────────────────────────────────────────

const LAKH = 100_000;
const CRORE = 10_000_000;
const THOUSAND = 1_000;

const UNIT_WORDS = {
  [Locale.UR]: { crore: 'کروڑ', lakh: 'لاکھ', thousand: 'ہزار', rupees: 'روپے' },
  [Locale.EN]: { crore: 'Crore', lakh: 'Lakh', thousand: 'Thousand', rupees: 'Rs' },
} as const;

/** Trim to at most `dp` decimals and drop a trailing ".0". */
function trimNumber(value: number, dp: number): string {
  const fixed = value.toFixed(dp);
  return fixed.replace(/\.?0+$/, '');
}

/**
 * Format an amount of PAISA as a human price.
 *
 *   850000000 paisa -> "85 لاکھ"      (Rs 8,500,000)
 *   120000000 paisa -> "1.2 کروڑ"
 *   3500000   paisa -> "35 ہزار"
 *   10000     paisa -> "100 روپے"     (the Rs 100 plan)
 */
export function formatPrice(
  amountPaisa: Paisa,
  opts: NumeralOptions & { withCurrency?: boolean } = { locale: Locale.UR },
): string {
  const rupees = amountPaisa / 100;
  const w = UNIT_WORDS[opts.locale];
  const abs = Math.abs(rupees);

  let text: string;
  if (abs >= CRORE) {
    text = `${trimNumber(rupees / CRORE, 2)} ${w.crore}`;
  } else if (abs >= LAKH) {
    text = `${trimNumber(rupees / LAKH, 2)} ${w.lakh}`;
  } else if (abs >= THOUSAND * 10) {
    // Only use "hazaar" from 10,000 up; "1.5 hazaar" reads worse than "1,500".
    text = `${trimNumber(rupees / THOUSAND, 1)} ${w.thousand}`;
  } else {
    text = trimNumber(rupees, 2);
    if (opts.locale === Locale.EN) return applyNumerals(`${w.rupees} ${text}`, opts);
    return applyNumerals(`${text} ${w.rupees}`, opts);
  }

  if (opts.withCurrency === false) return applyNumerals(text, opts);
  return opts.locale === Locale.EN
    ? applyNumerals(`${w.rupees} ${text}`, opts)
    : applyNumerals(`${text} ${w.rupees}`, opts);
}

/** Exact price with separators, for invoices where precision matters. */
export function formatPriceExact(amountPaisa: Paisa, opts: NumeralOptions): string {
  const rupees = amountPaisa / 100;
  // South Asian grouping: 1,23,45,678
  const [intPart = '0', decPart] = trimNumber(rupees, 2).split('.');
  const sign = intPart.startsWith('-') ? '-' : '';
  const digits = intPart.replace('-', '');
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3);
  const grouped = rest ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${last3}` : last3;
  const body = decPart ? `${sign}${grouped}.${decPart}` : `${sign}${grouped}`;
  return opts.locale === Locale.EN
    ? applyNumerals(`Rs ${body}`, opts)
    : applyNumerals(`${body} روپے`, opts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Area
// ─────────────────────────────────────────────────────────────────────────────

const AREA_WORDS: Record<Locale, Record<AreaUnit, string>> = {
  [Locale.UR]: {
    [AreaUnit.MARLA]: 'مرلہ',
    [AreaUnit.KANAL]: 'کنال',
    [AreaUnit.SQFT]: 'مربع فٹ',
    [AreaUnit.SQYD]: 'مربع گز',
  },
  [Locale.EN]: {
    [AreaUnit.MARLA]: 'Marla',
    [AreaUnit.KANAL]: 'Kanal',
    [AreaUnit.SQFT]: 'sq ft',
    [AreaUnit.SQYD]: 'sq yd',
  },
};

export function formatArea(value: number, unit: AreaUnit, opts: NumeralOptions): string {
  const n = trimNumber(value, 2);
  return applyNumerals(`${n} ${AREA_WORDS[opts.locale][unit]}`, opts);
}

// ─────────────────────────────────────────────────────────────────────────────
// Relative time
// ─────────────────────────────────────────────────────────────────────────────

const TIME_WORDS = {
  [Locale.UR]: {
    justNow: 'ابھی',
    minute: 'منٹ پہلے',
    hour: 'گھنٹے پہلے',
    day: 'دن پہلے',
    week: 'ہفتے پہلے',
    month: 'مہینے پہلے',
    year: 'سال پہلے',
  },
  [Locale.EN]: {
    justNow: 'just now',
    minute: 'min ago',
    hour: 'hours ago',
    day: 'days ago',
    week: 'weeks ago',
    month: 'months ago',
    year: 'years ago',
  },
} as const;

export function formatRelativeTime(date: Date, opts: NumeralOptions, now = new Date()): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  const w = TIME_WORDS[opts.locale];

  if (seconds < 60) return w.justNow;
  const units: Array<[limit: number, divisor: number, word: string]> = [
    [3600, 60, w.minute],
    [86400, 3600, w.hour],
    [604800, 86400, w.day],
    [2592000, 604800, w.week],
    [31536000, 2592000, w.month],
    [Number.POSITIVE_INFINITY, 31536000, w.year],
  ];
  for (const [limit, divisor, word] of units) {
    if (seconds < limit) {
      return applyNumerals(`${Math.floor(seconds / divisor)} ${word}`, opts);
    }
  }
  return w.justNow;
}

/**
 * Countdown for a share link, e.g. "27 منٹ باقی".
 * Returns null when the link never expires.
 */
export function formatTimeRemaining(
  expiresAt: Date | null,
  opts: NumeralOptions,
  now = new Date(),
): string | null {
  if (expiresAt === null) return null;
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return opts.locale === Locale.UR ? 'ختم ہو گیا' : 'expired';

  const minutes = Math.ceil(ms / 60000);
  if (opts.locale === Locale.UR) {
    if (minutes < 60) return applyNumerals(`${minutes} منٹ باقی`, opts);
    const hours = Math.ceil(minutes / 60);
    if (hours < 24) return applyNumerals(`${hours} گھنٹے باقی`, opts);
    return applyNumerals(`${Math.ceil(hours / 24)} دن باقی`, opts);
  }
  if (minutes < 60) return `${minutes} min left`;
  const hours = Math.ceil(minutes / 60);
  if (hours < 24) return `${hours} hours left`;
  return `${Math.ceil(hours / 24)} days left`;
}

/** Whether the layout should be right-to-left. */
export function isRtl(locale: Locale): boolean {
  return locale === Locale.UR;
}
