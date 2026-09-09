import { Locale, LOCALES } from '@ghar/shared';
import { radius, spacing } from '@ghar/ui';

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

export interface SwitcherTone {
  /** Label and unselected chip text. */
  fg: string;
  /** Unselected chip border. */
  border: string;
  /** Selected chip background. */
  selectedBg: string;
  /** Selected chip text — must clear 4.5:1 against selectedBg. */
  selectedFg: string;
}

/**
 * A plain <form> posting to a server action — no client component and no
 * JavaScript, so the language switches even while the page is still loading on
 * a slow connection. It has to be server-side anyway: this site is indexed and
 * shared on WhatsApp, so the language must be in the HTML that arrives.
 *
 * The tone is passed in rather than derived, because this renders both on the
 * light header and on the dark footer, and a chip that reads on one is
 * invisible on the other.
 */
export function LanguageSwitcher({
  active,
  label,
  tone,
}: {
  active: Locale;
  label: string;
  tone: SwitcherTone;
}) {
  return (
    <form
      action={setLocale}
      style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}
    >
      <span style={{ fontSize: 13, opacity: 0.75, color: tone.fg }}>{label}</span>

      {LOCALES.map((locale) => {
        const selected = locale === active;
        return (
          <button
            key={locale}
            type="submit"
            name="locale"
            value={locale}
            aria-current={selected ? 'true' : undefined}
            style={{
              minHeight: 34,
              padding: `0 ${spacing.xs}px`,
              borderRadius: radius.full,
              border: `1px solid ${selected ? tone.selectedBg : tone.border}`,
              background: selected ? tone.selectedBg : 'transparent',
              color: selected ? tone.selectedFg : tone.fg,
              // Each chip carries its own face rather than inheriting the
              // page's: a Latin label set in Nastaliq falls back glyph by
              // glyph and stops looking like one typeface.
              fontFamily:
                locale === Locale.UR
                  ? "'Noto Nastaliq Urdu', serif"
                  : "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: 13,
              lineHeight: 1.4,
              cursor: 'pointer',
            }}
          >
            {LABEL[locale]}
          </button>
        );
      })}
    </form>
  );
}
