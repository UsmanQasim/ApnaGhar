import { Locale, LOCALES } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { setLocale } from './locale-actions';

/**
 * Each language names itself in its own script, so a reader can find theirs
 * without first being able to read the one currently active. That is the whole
 * reason this is not "Urdu / Roman Urdu / English" in the active language.
 */
const LABEL: Record<Locale, string> = {
  [Locale.UR]: 'اردو',
  [Locale.UR_LATN]: 'Roman Urdu',
  [Locale.EN]: 'English',
};

/**
 * A plain <form> posting to a server action — no client component, no
 * JavaScript. This page is opened from WhatsApp on cheap Android handsets over
 * patchy mobile data; a language switch should not wait on a bundle.
 */
export function LanguageSwitcher({ active, label }: { active: Locale; label: string }) {
  return (
    <form
      action={setLocale}
      style={{ display: 'flex', alignItems: 'center', gap: spacing.base, flexWrap: 'wrap' }}
    >
      <span style={{ fontSize: 14, color: colors.onSurfaceVariant }}>{label}</span>

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
              // The 48px floor applies here too — this is the control a user
              // reaches for when the page is in a script they cannot read.
              minHeight: spacing.touchTarget,
              padding: `0 ${spacing.sm}px`,
              borderRadius: radius.full,
              border: `1px solid ${selected ? colors.primary : roles.cardBorder}`,
              background: selected ? colors.primaryFixed : roles.cardBackground,
              color: colors.onSurface,
              // Latin label in a Nastaliq page and vice versa: let each button
              // carry its own face rather than inheriting the page's.
              fontFamily: locale === Locale.UR ? "'Noto Nastaliq Urdu', serif" : "'Plus Jakarta Sans', system-ui, sans-serif",
              fontSize: 14,
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
