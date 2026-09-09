import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import Link from 'next/link';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { LanguageSwitcher } from '../src/LanguageSwitcher';
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
 * Navigation is built per request now, not at module scope: the labels are
 * locale-dependent, and a module-level constant would freeze whichever
 * language happened to be imported first for every operator.
 */
function navFor(S: AdminStrings) {
  return [
    { href: '/', label: S.nav.overview, icon: '▦' },
    { href: '/payments', label: S.nav.payments, icon: '💳' },
    { href: '/agents', label: S.nav.agents, icon: '👥' },
    { href: '/listings', label: S.nav.listings, icon: '🏢' },
    { href: '/reports', label: S.reports.title, icon: '📈' },
  ] as const;
}

/**
 * Admin shell — sidebar + content, RTL.
 *
 * Rewritten from the original LTR English scaffold to match the Stitch export,
 * which is Urdu and right-to-left like every other surface in the product. An
 * operator who spends their day in Urdu listings should not have to switch
 * reading direction to approve a payment.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  // The login page renders inside this same layout. Showing it the sidebar
  // would offer a signed-out visitor a menu where every link bounces straight
  // back here, so the chrome is drawn only once there is a session.
  const signedIn = (await cookies()).has(SESSION_COOKIE);

  const locale = await getLocale();
  const doc = documentAttributes(locale);
  const S = stringsFor(locale);
  const NAV = navFor(S);

  return (
    <html lang={doc.lang} dir={doc.dir}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@500;700&display=swap"
        />
      </head>
      <body
        style={{
          margin: 0,
          background: colors.surface,
          color: colors.onSurface,
          // The face follows the SCRIPT, not the language: Roman Urdu is Urdu
          // written in Latin letters, and Nastaliq has no usable Latin glyphs.
          // Numerals inside tables opt into Plus Jakarta Sans locally either
          // way, so figures stay scannable.
          fontFamily: doc.fontFamily,
          // ~2x leading is a legibility requirement of Nastaliq's descenders,
          // not a style choice; on Latin the same value reads double-spaced.
          lineHeight: doc.lineHeight,
        }}
      >
        {!signedIn ? (
          <main style={{ padding: spacing.lg, display: 'grid', gap: spacing.lg, justifyItems: 'center' }}>
            {children}
            <LanguageSwitcher active={locale} label={S.language} />
          </main>
        ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', minHeight: '100vh' }}>
          <aside
            style={{
              background: colors.inverseSurface,
              color: colors.inverseOnSurface,
              padding: spacing.md,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.lg,
            }}
          >
            <div>
              <strong style={{ fontSize: 18 }}>{S.panel}</strong>
              <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>{S.marketplace}</p>
            </div>

            <nav style={{ display: 'grid', gap: spacing.base }}>
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.xs,
                    minHeight: spacing.touchTarget,
                    padding: `0 ${spacing.sm}px`,
                    borderRadius: radius.md,
                    color: colors.inverseOnSurface,
                    textDecoration: 'none',
                    fontSize: 15,
                  }}
                >
                  <span aria-hidden>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>

            {/* Was action="/api/logout" — a route that never existed in this app,
                so the button silently 404'd. A server action clears the cookie
                where it was set, on the server. */}
            <div style={{ marginTop: 'auto' }}>
              <LanguageSwitcher active={locale} label={S.language} inverse />
            </div>

            <form action={signOut}>
              <button
                type="submit"
                style={{
                  minHeight: spacing.touchTarget,
                  width: '100%',
                  background: 'transparent',
                  border: `1px solid ${colors.outline}`,
                  borderRadius: radius.md,
                  color: colors.inverseOnSurface,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                {S.nav.logout}
              </button>
            </form>
          </aside>

          <div>
            <header
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                padding: `${spacing.sm}px ${spacing.lg}px`,
                background: roles.cardBackground,
                borderBottom: `1px solid ${roles.cardBorder}`,
              }}
            >
              <strong style={{ fontSize: 16 }}>{S.brand}</strong>
            </header>

            <main style={{ padding: spacing.lg, maxWidth: 1240 }}>{children}</main>
          </div>
        </div>
        )}
      </body>
    </html>
  );
}
