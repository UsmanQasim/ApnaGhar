import { Locale, LOCALES } from '@ghar/shared';

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
 * `inverse` renders it against the dark sidebar, which is where it lives on a
 * wide screen; the header carries a second copy below `lg`, where the sidebar
 * has collapsed to a nav strip with no room for it.
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
  return (
    <form action={setLocale} className="grid gap-1">
      <span className={`text-xs ${inverse ? 'text-inverse-on-surface/70' : 'text-on-surface-variant'}`}>
        {label}
      </span>

      <div className="flex gap-1">
        {LOCALES.map((locale) => {
          const selected = locale === active;

          return (
            <button
              key={locale}
              type="submit"
              name="locale"
              value={locale}
              aria-current={selected ? 'true' : undefined}
              className={[
                'min-h-9 flex-1 cursor-pointer whitespace-nowrap rounded-full border px-2 text-[11px] leading-none',
                'transition-colors duration-150',
                // Each chip carries its own face rather than inheriting the
                // page's: a Latin label set in Nastaliq falls back glyph by
                // glyph and stops looking like one typeface.
                locale === Locale.UR ? 'font-[family-name:var(--ghar-font-nastaliq)]' : 'font-[family-name:var(--ghar-font-latin)]',
                selected
                  ? 'border-primary bg-primary text-on-primary'
                  : inverse
                    ? 'border-outline/60 text-inverse-on-surface/85 hover:bg-white/10'
                    : 'border-card-border text-on-surface-variant hover:bg-surface-container-low',
              ].join(' ')}
            >
              {LABEL[locale]}
            </button>
          );
        })}
      </div>
    </form>
  );
}
