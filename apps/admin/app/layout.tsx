import type { ReactNode } from 'react';
import { cookies } from 'next/headers';

import './globals.css';

import { LanguageSwitcher } from '../src/LanguageSwitcher';
import { Nav, type NavItem } from '../src/Nav';
import {
  AgentsIcon,
  ListingsIcon,
  LogoutIcon,
  OverviewIcon,
  PaymentsIcon,
  ReportsIcon,
} from '../src/icons';
import { documentAttributes, getLocale } from '../src/locale';
import { signOut } from '../src/session';
import { SESSION_COOKIE } from '../src/session-cookie';
import { S, stringsFor, type AdminStrings } from '../src/strings';

export const metadata = {
  // Static: metadata is generated once, not per request, so it uses the
  // default locale. The panel is never indexed, so this costs nothing.
  title: S.brand,
  // Never indexed. This panel can approve payments and suspend accounts.
  robots: { index: false, follow: false },
};

/**
 * Navigation is built per request, not at module scope: the labels are
 * locale-dependent, and a module-level constant would freeze whichever
 * language happened to be imported first for every operator.
 */
function navFor(S: AdminStrings): NavItem[] {
  return [
    { href: '/', label: S.nav.overview, icon: <OverviewIcon /> },
    { href: '/payments', label: S.nav.payments, icon: <PaymentsIcon /> },
    { href: '/agents', label: S.nav.agents, icon: <AgentsIcon /> },
    { href: '/listings', label: S.nav.listings, icon: <ListingsIcon /> },
    { href: '/reports', label: S.reports.title, icon: <ReportsIcon /> },
  ];
}

/**
 * Admin shell — sidebar and content.
 *
 * Two things drive the layout:
 *
 *  • It is bilingual AND bidirectional, so the sidebar is placed with logical
 *    properties and grid order rather than left/right. In Urdu it lands on the
 *    right without a single mirrored rule.
 *  • It is genuinely responsive now. The old shell was a fixed
 *    `260px minmax(0,1fr)` grid, which on anything under ~900px pushed the
 *    content into a column too narrow to read a table in — and inline styles
 *    cannot express a media query, so there was no way to fix it in place.
 *    Below `lg` the sidebar becomes a horizontally scrollable strip at the top.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // The login page renders inside this same layout. Showing it the sidebar
  // would offer a signed-out visitor a menu where every link bounces straight
  // back here, so the chrome is drawn only once there is a session.
  const signedIn = (await cookies()).has(SESSION_COOKIE);

  const locale = await getLocale();
  const doc = documentAttributes(locale);
  const S = stringsFor(locale);

  return (
    <html lang={doc.lang} dir={doc.dir} data-script={doc.script}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>
        {!signedIn ? (
          <main className="grid min-h-screen place-items-center gap-lg p-md">
            {children}
            <LanguageSwitcher active={locale} label={S.language} />
          </main>
        ) : (
          <div className="lg:grid lg:min-h-screen lg:grid-cols-[264px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-lg bg-inverse-surface p-md text-inverse-on-surface lg:sticky lg:top-0 lg:h-screen">
              <BrandMark panel={S.panel} marketplace={S.marketplace} />

              {/* Horizontal and scrollable below lg, vertical above it. The
                  overflow rule matters: five items do not fit on a phone, and
                  a nav that silently clips its last entry is worse than one
                  that scrolls. */}
              <div className="-mx-md min-w-0 overflow-x-auto px-md lg:mx-0 lg:overflow-visible lg:px-0">
                <Nav items={navFor(S)} />
              </div>

              <div className="mt-auto hidden gap-sm lg:grid">
                <LanguageSwitcher active={locale} label={S.language} inverse />

                <form action={signOut}>
                  <button
                    type="submit"
                    className="touch flex w-full items-center justify-center gap-xs rounded-md border border-outline/60 text-sm text-inverse-on-surface transition-colors hover:border-outline hover:bg-white/10"
                  >
                    <LogoutIcon size={16} />
                    {S.nav.logout}
                  </button>
                </form>
              </div>
            </aside>

            <div className="flex min-w-0 flex-col">
              <header className="sticky top-0 z-10 flex items-center gap-sm border-b border-card-border bg-card-background/85 px-md py-xs backdrop-blur-sm lg:px-lg">
                <span className="text-base font-semibold">{S.brand}</span>

                {/* Only below lg, where the sidebar has no room for them. */}
                <div className="ms-auto flex items-center gap-sm lg:hidden">
                  <LanguageSwitcher active={locale} label={S.language} />
                  <form action={signOut}>
                    <button
                      type="submit"
                      aria-label={S.nav.logout}
                      className="touch grid w-12 place-items-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-container-low"
                    >
                      <LogoutIcon size={18} />
                    </button>
                  </form>
                </div>
              </header>

              <main className="mx-auto w-full max-w-[1240px] flex-1 p-md lg:p-lg">{children}</main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}

/**
 * The wordmark. A drawn roofline rather than a house emoji: this sits at the
 * top of every screen an operator sees, and it is the one place the panel gets
 * to look like a product rather than a form.
 */
function BrandMark({ panel, marketplace }: { panel: string; marketplace: string }) {
  return (
    <div className="flex items-center gap-sm">
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-on-primary">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 4l9 6.5" />
          <path d="M5.5 12v8h13v-8" />
          <path d="M10 20v-4.5h4V20" />
        </svg>
      </span>

      <span className="min-w-0">
        <strong className="block truncate text-[17px] leading-tight">{panel}</strong>
        <span className="block truncate text-xs leading-tight opacity-70">{marketplace}</span>
      </span>
    </div>
  );
}
