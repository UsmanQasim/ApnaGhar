import type { ReactNode } from 'react';
import Link from 'next/link';

import type { Locale } from '@ghar/shared';

import { LanguageSwitcher } from '../LanguageSwitcher';
import { copyFor, type WebCopy } from '../copy';
import { getLocale } from '../locale';
import { GharMark, MailIcon, PhoneIcon, PinIcon } from './icons';

/**
 * Shared marketing chrome.
 *
 * Everything draws from `@ghar/ui` tokens through the generated Tailwind
 * theme, rather than the hex values in the Stitch exports. The exports and the
 * tokens agree today; hardcoding the hex is how they stop agreeing later.
 */

/**
 * Built per request, not at module scope: nav labels are locale-dependent, and
 * a module-level constant would freeze whichever language happened to be
 * imported first for every visitor.
 */
function navFor(C: WebCopy) {
  return [
    { href: '/', label: C.nav.home },
    { href: '/buyers', label: C.nav.buyers },
    { href: '/agents', label: C.nav.agents },
    { href: '/pricing', label: C.nav.pricing },
    { href: '/contact', label: C.nav.contact },
  ] as const;
}

export async function SiteHeader() {
  const locale: Locale = await getLocale();
  const C = copyFor(locale);

  return (
    <header className="sticky top-0 z-30 border-b border-card-border bg-card-background/80 backdrop-blur-md">
      <div className="shell flex items-center gap-sm px-md py-2">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 text-xl font-bold text-primary no-underline"
        >
          <span className="grid size-9 place-items-center rounded-md bg-primary text-on-primary">
            <GharMark size={20} />
          </span>
          {C.brand}
        </Link>

        {/*
         * Hidden below `md` rather than crammed: five Urdu nav labels do not
         * fit on a phone, and the old header wrapped them onto three rows that
         * pushed the CTA off screen. The same links are repeated in the footer,
         * which is where a phone visitor reaches for them.
         */}
        <nav className="ms-auto hidden items-center md:flex" aria-label={C.nav.home}>
          {navFor(C).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-link touch inline-flex items-center rounded-md px-sm text-[15px] text-on-surface no-underline transition-colors hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ms-auto flex items-center gap-xs md:ms-0">
          <LanguageSwitcher active={locale} label={C.language} compact />

          <Link
            href="/#download"
            className="touch hidden shrink-0 items-center rounded-md bg-primary px-md text-sm font-semibold text-on-primary no-underline transition-colors hover:bg-primary-container sm:inline-flex"
          >
            {C.nav.download}
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * The footer.
 *
 * Rebuilt from a two-column block whose links were 48px-tall stacked spans
 * with nothing to align to — the widest gaps on the page, and the reason it
 * read as unfinished. Now four columns that collapse cleanly: brand, links,
 * contact, language. Each column has a heading, so on a phone the stack still
 * reads as sections rather than one long list.
 *
 * Note `md:grid-cols-[1.4fr_1fr_1.2fr]` — the brand column carries a sentence
 * of prose and needs more room than the link lists, and equal columns are what
 * made the old one look accidental.
 */
export async function SiteFooter() {
  const locale: Locale = await getLocale();
  const C = copyFor(locale);

  const links = [C.footer.about, C.footer.privacy, C.footer.terms, C.footer.help];

  return (
    <footer className="mt-auto bg-inverse-surface text-inverse-on-surface">
      <div className="shell px-md pt-xl pb-lg">
        <div className="grid gap-lg md:grid-cols-[1.4fr_1fr_1.2fr]">
          {/* ── Brand ──────────────────────────────────────────────────── */}
          <div className="max-w-[42ch]">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-md bg-primary text-on-primary">
                <GharMark size={20} />
              </span>
              <strong className="text-xl">{C.brand}</strong>
            </div>
            <p className="mt-xs mb-0 text-sm/relaxed opacity-75">{C.tagline}</p>
          </div>

          {/* ── Links ──────────────────────────────────────────────────── */}
          <nav aria-label={C.footer.links}>
            <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.08em] opacity-60">
              {C.footer.links}
            </h2>
            <ul className="mt-xs grid list-none gap-1 p-0">
              {links.map((label) => (
                <li key={label}>
                  {/*
                   * A span, not an <a>: these pages do not exist yet. A link
                   * to nowhere on a marketing footer is worse than plain text
                   * — it reads as broken rather than as "coming soon".
                   */}
                  <span className="inline-block py-1 text-sm opacity-85">{label}</span>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Contact ────────────────────────────────────────────────── */}
          <div>
            <h2 className="m-0 text-xs font-semibold uppercase tracking-[0.08em] opacity-60">
              {C.contact.title}
            </h2>
            <ul className="mt-xs grid list-none gap-2 p-0 text-sm">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 shrink-0 opacity-70">
                  <PinIcon size={16} />
                </span>
                <span className="opacity-85">{C.contact.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="shrink-0 opacity-70">
                  <PhoneIcon size={16} />
                </span>
                <span className="numeric opacity-85">+92 51 000 0000</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="shrink-0 opacity-70">
                  <MailIcon size={16} />
                </span>
                <span className="latin opacity-85">hello@ghar.pk</span>
              </li>
            </ul>
          </div>
        </div>

        <hr className="hairline my-lg opacity-25" />

        {/* Bottom bar: the two things that are not navigation. */}
        <div className="flex flex-wrap items-center justify-between gap-sm">
          <p className="m-0 text-xs opacity-60">{C.footer.rights}</p>

          <LanguageSwitcher
            active={locale}
            label={C.language}
            tone={{
              fg: 'text-inverse-on-surface',
              border: 'border-outline/60',
              selectedBg: 'bg-inverse-on-surface',
              selectedFg: 'text-inverse-surface',
            }}
          />
        </div>
      </div>
    </footer>
  );
}

/**
 * A page section with consistent rhythm.
 *
 * `align` matters for RTL: a centred heading over start-aligned body copy is
 * the mismatch that made several pages look misaligned in Urdu. Sections now
 * declare one alignment and everything inside follows it.
 */
export function Section({
  title,
  subtitle,
  children,
  tone = 'surface',
  align = 'center',
  id,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  tone?: 'surface' | 'raised' | 'ambient';
  align?: 'center' | 'start';
  id?: string;
}) {
  const background =
    tone === 'raised' ? 'bg-surface-container-low' : tone === 'ambient' ? 'ambient' : 'bg-surface';

  return (
    <section id={id} className={`section ${background}`}>
      <div className="shell">
        {title ? (
          <h2
            className={`m-0 text-[clamp(24px,3.4vw,34px)] font-bold tracking-tight text-on-surface ${
              align === 'center' ? 'text-center' : 'text-start'
            }`}
          >
            {title}
          </h2>
        ) : null}

        {subtitle ? (
          <p
            className={`mt-xs mb-lg text-[17px] text-balance text-on-surface-variant ${
              align === 'center' ? 'mx-auto max-w-[64ch] text-center' : 'max-w-[64ch] text-start'
            }`}
          >
            {subtitle}
          </p>
        ) : (
          <div className={title ? 'h-lg' : ''} />
        )}

        {children}
      </div>
    </section>
  );
}

/**
 * A feature tile.
 *
 * The icon sits in a tinted well rather than floating: a bare glyph on a white
 * card gives the eye nothing to anchor on, and it was why the old cards read
 * as a list of paragraphs with decoration on top.
 */
export function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="card card-hover flex h-full flex-col items-start gap-xs p-md">
      <span className="grid size-11 place-items-center rounded-md bg-primary-fixed text-on-primary-fixed">
        {icon}
      </span>
      <h3 className="m-0 text-lg font-semibold text-on-surface">{title}</h3>
      <p className="m-0 text-[15px] text-on-surface-variant">{body}</p>
    </article>
  );
}

/** Auto-fitting card grid. `items-stretch` keeps every card the same height. */
export function Grid({ children, min = 260 }: { children: ReactNode; min?: number }) {
  return (
    <div
      className="grid items-stretch gap-md"
      style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(${min}px, 100%), 1fr))` }}
    >
      {children}
    </div>
  );
}

/* ── Shared class strings ───────────────────────────────────────────────────
 * Exported as strings rather than components so the call sites stay plain
 * <a> and <Link> elements.
 */

export const cardStyle = 'card p-md';

const linkBase =
  'touch inline-flex items-center justify-center rounded-md px-lg text-[15px] font-semibold ' +
  'no-underline transition-colors duration-150';

export const primaryLinkStyle = `${linkBase} bg-primary text-on-primary hover:bg-primary-container`;

export const secondaryLinkStyle =
  `${linkBase} border border-outline-variant bg-card-background text-on-surface ` +
  'hover:border-outline hover:bg-surface-container-low';
