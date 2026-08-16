import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';

import { colors, radius, roles, spacing } from '@ghar/ui';

import { C } from '../copy';

/**
 * Shared marketing chrome.
 *
 * Everything here draws from `@ghar/ui` tokens rather than the hex values in
 * the Stitch exports. The exports and the tokens agree today; hardcoding the
 * hex is how they stop agreeing later.
 */

const NAV = [
  { href: '/', label: C.nav.home },
  { href: '/agents', label: C.nav.agents },
  { href: '/buyers', label: C.nav.buyers },
  { href: '/pricing', label: C.nav.pricing },
  { href: '/contact', label: C.nav.contact },
] as const;

export function SiteHeader() {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: roles.cardBackground,
        borderBottom: `1px solid ${roles.cardBorder}`,
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: `${spacing.xs}px ${spacing.md}px`,
          display: 'flex',
          alignItems: 'center',
          gap: spacing.md,
          flexWrap: 'wrap',
        }}
      >
        <Link href="/" style={{ fontSize: 22, fontWeight: 700, color: colors.primary, textDecoration: 'none' }}>
          {C.brand}
        </Link>

        <nav style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', flex: 1 }}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                // The 48px floor applies here too: this site is read on the
                // same cheap phones the app targets.
                minHeight: spacing.touchTarget,
                padding: `0 ${spacing.sm}px`,
                borderRadius: radius.md,
                color: colors.onSurface,
                textDecoration: 'none',
                fontSize: 16,
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link href="/#download" style={primaryLinkStyle}>
          {C.nav.download}
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer style={{ background: colors.inverseSurface, color: colors.inverseOnSurface, marginTop: spacing.xl }}>
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: spacing.lg,
          display: 'grid',
          gap: spacing.lg,
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}
      >
        <div>
          <strong style={{ fontSize: 22 }}>{C.brand}</strong>
          <p style={{ margin: `${spacing.xs}px 0 0`, opacity: 0.85, fontSize: 15 }}>{C.tagline}</p>
        </div>

        <div>
          <strong style={{ fontSize: 16 }}>{C.footer.links}</strong>
          <ul style={{ listStyle: 'none', padding: 0, margin: `${spacing.xs}px 0 0`, display: 'grid' }}>
            {[C.footer.about, C.footer.privacy, C.footer.terms, C.footer.help].map((label) => (
              <li key={label}>
                <span style={{ display: 'inline-flex', alignItems: 'center', minHeight: spacing.touchTarget, opacity: 0.85 }}>
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p style={{ margin: 0, padding: spacing.md, textAlign: 'center', opacity: 0.7, fontSize: 14 }}>
        {C.footer.rights}
      </p>
    </footer>
  );
}

export function Section({
  title,
  subtitle,
  children,
  tone = 'surface',
  id,
}: {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  tone?: 'surface' | 'raised';
  id?: string;
}) {
  return (
    <section
      id={id}
      style={{
        background: tone === 'raised' ? colors.surfaceContainerLow : colors.surface,
        padding: `${spacing.xl}px ${spacing.md}px`,
      }}
    >
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        {title ? (
          <h2 style={{ margin: 0, fontSize: 30, color: colors.onSurface, textAlign: 'center' }}>{title}</h2>
        ) : null}
        {subtitle ? (
          <p
            style={{
              margin: `${spacing.xs}px auto ${spacing.lg}px`,
              maxWidth: 720,
              textAlign: 'center',
              color: colors.onSurfaceVariant,
              fontSize: 17,
            }}
          >
            {subtitle}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <article style={{ ...cardStyle, display: 'grid', gap: spacing.xs }}>
      <span aria-hidden style={{ fontSize: 30 }}>
        {icon}
      </span>
      <h3 style={{ margin: 0, fontSize: 20 }}>{title}</h3>
      <p style={{ margin: 0, color: colors.onSurfaceVariant, fontSize: 16 }}>{body}</p>
    </article>
  );
}

export function Grid({ children, min = 260 }: { children: ReactNode; min?: number }) {
  return (
    <div
      style={{
        display: 'grid',
        gap: spacing.md,
        gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
      }}
    >
      {children}
    </div>
  );
}

export const cardStyle: CSSProperties = {
  background: roles.cardBackground,
  border: `1px solid ${roles.cardBorder}`,
  borderRadius: radius.lg,
  padding: spacing.md,
};

export const primaryLinkStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: spacing.touchTarget,
  padding: `0 ${spacing.lg}px`,
  borderRadius: radius.md,
  background: colors.primary,
  color: colors.onPrimary,
  textDecoration: 'none',
  fontSize: 16,
};

export const secondaryLinkStyle: CSSProperties = {
  ...primaryLinkStyle,
  background: 'transparent',
  color: colors.secondary,
  border: `1px solid ${colors.secondary}`,
};
