import type { CSSProperties, ReactNode } from 'react';

import { colors, radius, roles, spacing } from '@ghar/ui';

/**
 * Admin primitives, built on the shared design tokens.
 *
 * The original payments page hardcoded hex values (`#dce9ff`, `#ba1a1a`).
 * That is exactly the drift docs/design/README.md warns about: the tokens are
 * the implementation source of truth, and a colour that exists in two places
 * eventually exists in two different values.
 */

export const card: CSSProperties = {
  background: roles.cardBackground,
  border: `1px solid ${roles.cardBorder}`,
  borderRadius: radius.lg,
  padding: spacing.md,
};

export const muted: CSSProperties = {
  color: colors.onSurfaceVariant,
  fontSize: 13,
  margin: 0,
};

export function Card({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <section style={{ ...card, ...style }}>{children}</section>;
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header style={{ marginBottom: spacing.lg }}>
      <h1 style={{ margin: 0, fontSize: 24, color: colors.onSurface }}>{title}</h1>
      {subtitle ? <p style={{ ...muted, marginTop: spacing.base }}>{subtitle}</p> : null}
    </header>
  );
}

/**
 * A headline number with its own trend.
 *
 * The delta is coloured but ALSO carries an arrow glyph, because colour alone
 * fails for a red-green colourblind operator — the same reasoning that moved
 * the price pill off `colors.tertiary` (docs/design/README.md §2).
 */
export function StatTile({
  label,
  value,
  delta,
  suffix,
}: {
  label: string;
  value: string;
  delta?: number | null;
  suffix?: string;
}) {
  const up = delta !== null && delta !== undefined && delta >= 0;

  return (
    <div style={{ ...card, display: 'grid', gap: spacing.base, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <span style={{ ...muted, flex: 1 }}>{label}</span>
        {delta !== null && delta !== undefined ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 12,
              color: up ? colors.primary : colors.error,
              background: up ? colors.primaryFixed : colors.errorContainer,
              borderRadius: radius.full,
              padding: '2px 8px',
              direction: 'ltr',
            }}
          >
            <span aria-hidden>{up ? '▲' : '▼'}</span>
            {up ? '+' : ''}
            {delta}
            {suffix ?? '%'}
          </span>
        ) : null}
      </div>
      <strong style={{ fontSize: 26, color: colors.onSurface, direction: 'ltr', textAlign: 'end' }}>
        {value}
      </strong>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const palette = {
    neutral: { bg: colors.surfaceContainer, fg: colors.onSurface },
    good: { bg: colors.primaryFixed, fg: colors.onPrimaryFixed },
    warn: { bg: colors.tertiaryFixed, fg: colors.onTertiaryFixed },
    bad: { bg: colors.errorContainer, fg: colors.onErrorContainer },
  }[tone];

  return (
    <span
      style={{
        background: palette.bg,
        color: palette.fg,
        borderRadius: radius.full,
        padding: '2px 10px',
        fontSize: 12,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </span>
  );
}

export const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  fontSize: 14,
};

export const thStyle: CSSProperties = {
  textAlign: 'start',
  padding: `${spacing.xs}px ${spacing.sm}px`,
  color: colors.onSurfaceVariant,
  fontWeight: 500,
  borderBottom: `1px solid ${roles.cardBorder}`,
  whiteSpace: 'nowrap',
};

export const tdStyle: CSSProperties = {
  padding: `${spacing.sm}px`,
  borderBottom: `1px solid ${roles.cardBorder}`,
  verticalAlign: 'middle',
};

/** Buttons stay at the 48px touch floor — this panel gets used on tablets too. */
export const buttonStyle: CSSProperties = {
  minHeight: spacing.touchTarget,
  padding: `0 ${spacing.md}px`,
  borderRadius: radius.md,
  border: `1px solid ${roles.cardBorder}`,
  background: roles.cardBackground,
  color: colors.onSurface,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

export const primaryButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: colors.primary,
  borderColor: colors.primary,
  color: colors.onPrimary,
};

export const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: colors.errorContainer,
  borderColor: colors.errorContainer,
  color: colors.onErrorContainer,
};

/** Rupees for display. Money crosses the wire as a paisa string. */
export function rupees(paisa: string | number | bigint): string {
  return (Number(paisa) / 100).toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  });
}
