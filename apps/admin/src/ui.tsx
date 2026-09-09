import type { ReactNode } from 'react';

import { EmptyIcon, TrendIcon } from './icons';

/**
 * Admin primitives.
 *
 * These were inline style objects on the shared tokens. The tokens have not
 * moved — they are the same values, now reaching CSS through
 * @ghar/ui/tailwind-theme.css, which is generated from tokens.ts and checked
 * for staleness by a test. What changes is that a class can express what an
 * inline style cannot: hover, focus-visible, and a media query. Between them
 * those three account for most of why the panel felt flat and did not
 * usefully resize.
 *
 * Buttons are exported as class strings rather than components, because the
 * call sites need to stay plain <button> and <form action> elements — several
 * are inside server-action forms where a wrapper component would be a
 * needless client boundary.
 */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`card p-md ${className}`}>{children}</section>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-lg flex flex-wrap items-end gap-sm">
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-on-surface">{title}</h1>
        {subtitle ? <p className="mt-1 mb-0 text-sm text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-xs">{actions}</div> : null}
    </header>
  );
}

/**
 * A headline number with its own trend.
 *
 * The delta is coloured but ALSO carries a direction glyph and a sign, because
 * colour alone fails for a red-green colourblind operator — the same reasoning
 * that moved the price pill off `colors.tertiary` (docs/design/README.md §2).
 *
 * The number is `.numeric`: Latin face, tabular figures, forced LTR. Money
 * that mirrors inside an Urdu page is not a cosmetic problem.
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
  const hasDelta = delta !== null && delta !== undefined;
  const up = hasDelta && delta >= 0;

  return (
    <div className="card min-w-0 p-md transition-shadow duration-150 hover:shadow-[0_2px_8px_rgb(11_28_48_/_0.07)]">
      <div className="flex items-center gap-xs">
        <span className="min-w-0 flex-1 truncate text-[13px] text-on-surface-variant">{label}</span>

        {hasDelta ? (
          <span
            className={[
              'numeric inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
              up ? 'bg-primary-fixed text-on-primary-fixed' : 'bg-error-container text-on-error-container',
            ].join(' ')}
          >
            <TrendIcon up={up} />
            {up ? '+' : ''}
            {delta}
            {suffix ?? '%'}
          </span>
        ) : null}
      </div>

      <strong className="numeric mt-xs block text-[28px] font-semibold leading-none tracking-tight text-on-surface">
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
    neutral: 'bg-surface-container text-on-surface',
    good: 'bg-primary-fixed text-on-primary-fixed',
    warn: 'bg-tertiary-fixed text-on-tertiary-fixed',
    bad: 'bg-error-container text-on-error-container',
  }[tone];

  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${palette}`}
    >
      {children}
    </span>
  );
}

/**
 * What a table says when it has nothing to say.
 *
 * Every list in this panel previously rendered a bare sentence in muted grey,
 * which reads as a rendering failure rather than a state. An icon and a
 * centred block reads as "there is nothing here", which is usually good news
 * in a payments queue.
 */
export function EmptyState({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="grid justify-items-center gap-xs px-md py-xl text-center">
      <span className="text-outline-variant">
        <EmptyIcon />
      </span>
      <p className="m-0 text-sm font-medium text-on-surface-variant">{children}</p>
      {hint ? <p className="m-0 max-w-[38ch] text-xs text-outline">{hint}</p> : null}
    </div>
  );
}

/**
 * Tables scroll horizontally on their own rather than pushing the page wide.
 * A body that scrolls sideways loses the sidebar and the header with it.
 */
export function TableScroll({ children }: { children: ReactNode }) {
  return <div className="-mx-md overflow-x-auto px-md">{children}</div>;
}

/* ── Buttons ────────────────────────────────────────────────────────────────
 * Class strings, not components: several call sites are submit buttons inside
 * server-action forms, and wrapping them would force a client boundary.
 * The 48px floor from DESIGN.md applies here too — this panel is used on
 * tablets, and an operator approving payments should not have to aim.
 */

const buttonBase =
  'touch inline-flex items-center justify-center gap-xs rounded-md px-md text-sm font-medium ' +
  'transition-colors duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50';

export const buttonStyle =
  `${buttonBase} border border-card-border bg-card-background text-on-surface ` +
  'hover:bg-surface-container-low hover:border-outline-variant';

export const primaryButtonStyle =
  `${buttonBase} border border-primary bg-primary text-on-primary hover:bg-primary-container`;

export const dangerButtonStyle =
  `${buttonBase} border border-error-container bg-error-container text-on-error-container ` +
  'hover:brightness-95';

export const ghostButtonStyle =
  `${buttonBase} border border-transparent text-on-surface-variant hover:bg-surface-container-low`;

/**
 * Inputs and selects, matching the button metrics so a filter row lines up.
 *
 * Deliberately sets no width. It used to include `w-full`, which fought every
 * flex-basis at the call site — Tailwind resolves `w-full` and `w-auto` by
 * stylesheet order, not class order, so each filter control took its own row.
 * Width belongs to the layout, not the control.
 */
export const fieldStyle =
  'touch rounded-md border border-card-border bg-card-background px-sm text-sm ' +
  'text-on-surface transition-colors hover:border-outline-variant ' +
  'focus:border-primary focus:outline-none';

/** Rupees for display. Money crosses the wire as a paisa string. */
export function rupees(paisa: string | number | bigint): string {
  return (Number(paisa) / 100).toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  });
}
