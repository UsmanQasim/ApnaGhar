import { Locale, LOCALES } from '@ghar/shared';
import { colors, radius, spacing } from '@ghar/ui';

import { setLocale } from './locale-actions';

/**
 * Each language names itself in its own script, so an operator can find theirs
 * without first being able to read the one currently active.
 */
const LABEL: Record<Locale, string> = {
  [Locale.UR]: 'اردو',
  [Locale.UR_LATN]: 'Roman Urdu',
  [Locale.EN]: 'English',
};

/**
 * A plain <form> posting to a server action — no client component, no
 * JavaScript, no hydration boundary in an otherwise server-rendered tree.
 *
 * `inverse` renders it against the dark sidebar, which is where it lives.
 */
export function LanguageSwitcher({
  active,
  label,
  inverse = false,
}: {
  active: Locale;
  label: string;
  inverse?: boolean;
}) {
  const fg = inverse ? colors.inverseOnSurface : colors.onSurface;
  const border = inverse ? colors.outline : colors.outlineVariant;

  return (
    <form action={setLocale} style={{ display: 'grid', gap: spacing.base }}>
      <span style={{ fontSize: 12, opacity: 0.75, color: fg }}>{label}</span>

      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
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
                flex: 1,
                minHeight: 36,
                padding: `0 ${spacing.xs}px`,
                borderRadius: radius.full,
                border: `1px solid ${selected ? colors.primary : border}`,
                background: selected ? colors.primary : 'transparent',
                color: selected ? colors.onPrimary : fg,
                // Each button carries its own face rather than inheriting the
                // page's: a Latin label set in Nastaliq falls back per glyph.
                fontFamily:
                  locale === Locale.UR
                    ? "'Noto Nastaliq Urdu', serif"
                    : "'Plus Jakarta Sans', system-ui, sans-serif",
                fontSize: 12,
                lineHeight: 1.4,
                cursor: 'pointer',
              }}
            >
              {LABEL[locale]}
            </button>
          );
        })}
      </div>
    </form>
  );
}
