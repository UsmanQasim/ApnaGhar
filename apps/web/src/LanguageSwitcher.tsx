import { Locale, LOCALES } from '@ghar/shared';

import { setLocale } from './locale-actions';

/**
 * Each language names itself in its own script, so a visitor can find theirs
 * without first being able to read the one currently on screen.
 */
const LABEL: Record<Locale, string> = {
  [Locale.UR]: 'اردو',
  [Locale.UR_LATN]: 'Roman Urdu',
  [Locale.EN]: 'English',
};

/**
 * Short forms for the header, where three full labels do not fit.
 *
 * Roman Urdu is "Roman", not "RU": a two-letter code next to "EN" reads as a
 * country code, and the country code RU is Russia.
 */
const SHORT: Record<Locale, string> = {
  [Locale.UR]: 'اردو',
  [Locale.UR_LATN]: 'Roman',
  [Locale.EN]: 'EN',
};

export interface SwitcherTone {
  /** Tailwind class for the label and unselected chip text. */
  fg: string;
  /** Tailwind class for the unselected chip border. */
  border: string;
  /** Tailwind class for the selected chip background. */
  selectedBg: string;
  /** Tailwind class for the selected chip text. Must clear 4.5:1 on selectedBg. */
  selectedFg: string;
}

const DEFAULT_TONE: SwitcherTone = {
  fg: 'text-on-surface-variant',
  border: 'border-card-border',
  selectedBg: 'bg-primary',
  selectedFg: 'text-on-primary',
};

/**
 * A plain <form> posting to a server action — no client component and no
 * JavaScript, so the language switches even while the page is still loading on
 * a slow connection. It has to be server-side anyway: this site is indexed and
 * shared on WhatsApp, so the language must be in the HTML that arrives.
 *
 * NOT a <select>. A native dropdown cannot show three scripts legibly in its
 * closed state, its open list is drawn by the OS in the OS's own font, and on
 * Android it opens a full-screen modal — three taps to change language on the
 * device most of these visitors use. Three chips are one tap and always
 * visible.
 */
export function LanguageSwitcher({
  active,
  label,
  tone = DEFAULT_TONE,
  compact = false,
}: {
  active: Locale;
  label: string;
  tone?: SwitcherTone;
  /** Header variant: short codes, no visible label, tighter metrics. */
  compact?: boolean;
}) {
  return (
    <form
      action={setLocale}
      className="flex items-center gap-1"
      aria-label={label}
    >
      {compact ? null : (
        <span className={`text-xs opacity-70 ${tone.fg}`}>{label}</span>
      )}

      <div
        className={`flex items-center gap-0.5 rounded-full border p-0.5 ${tone.border}`}
      >
        {LOCALES.map((locale) => {
          const selected = locale === active;

          return (
            <button
              key={locale}
              type="submit"
              name="locale"
              value={locale}
              aria-current={selected ? 'true' : undefined}
              title={LABEL[locale]}
              className={[
                'cursor-pointer whitespace-nowrap rounded-full px-2.5 text-xs leading-none',
                'transition-colors duration-150',
                compact ? 'min-h-8' : 'min-h-9',
                // Each chip carries its own face rather than inheriting the
                // page's: a Latin label set in Nastaliq falls back glyph by
                // glyph and stops looking like one typeface.
                locale === Locale.UR
                  ? 'font-[family-name:var(--ghar-font-nastaliq)]'
                  : 'font-[family-name:var(--ghar-font-latin)]',
                selected
                  ? `${tone.selectedBg} ${tone.selectedFg} font-semibold`
                  : `bg-transparent ${tone.fg} hover:bg-black/5`,
              ].join(' ')}
            >
              {compact ? SHORT[locale] : LABEL[locale]}
            </button>
          );
        })}
      </div>
    </form>
  );
}
