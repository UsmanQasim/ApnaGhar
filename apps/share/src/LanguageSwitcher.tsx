import { Locale, LOCALES } from '@ghar/shared';

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
    <form action={setLocale} className="flex flex-wrap items-center gap-xs" aria-label={label}>
      <span className="text-xs text-on-surface-variant">{label}</span>

      <div className="flex items-center gap-0.5 rounded-full border border-card-border bg-card-background p-0.5">
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
                // Smaller than the 48px floor on purpose: this is a secondary
                // control at the foot of the page, and the floor is spent on
                // the two things that matter here — Call and WhatsApp.
                'min-h-9 cursor-pointer whitespace-nowrap rounded-full px-3 text-xs leading-none',
                'transition-colors duration-150',
                // Each chip carries its own face rather than inheriting the
                // page's: a Latin label set in Nastaliq falls back glyph by
                // glyph and stops looking like one typeface.
                locale === Locale.UR
                  ? 'font-[family-name:var(--ghar-font-nastaliq)]'
                  : 'font-[family-name:var(--ghar-font-latin)]',
                selected
                  ? 'bg-primary font-semibold text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low',
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
