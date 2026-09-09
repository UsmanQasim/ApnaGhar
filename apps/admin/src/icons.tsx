import type { SVGProps } from 'react';

/**
 * Inline SVG icons.
 *
 * The panel used emoji (▦ 💳 👥 🏢 📈) as nav icons. Emoji are rendered by the
 * OS, so they arrive in a different style on every machine, they carry the
 * platform's own colour regardless of the surface behind them, and on Windows
 * several of these land as a monochrome glyph next to full-colour neighbours.
 * None of that is fixable from here — the only fix is to draw them.
 *
 * `currentColor` throughout, so an icon inherits its state from the link that
 * contains it and there is no second place to keep colours in step.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export function OverviewIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </Svg>
  );
}

export function PaymentsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" />
      <path d="M6 14.5h3.5" />
    </Svg>
  );
}

export function AgentsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.5a3.25 3.25 0 0 1 0 6" />
      <path d="M17.5 14.5a5.5 5.5 0 0 1 3 5" />
    </Svg>
  );
}

export function ListingsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 21V8.5L10 4l7 4.5V21" />
      <path d="M17 21V11h4v10" />
      <path d="M7.5 12h5M7.5 16h5" />
      <path d="M2 21h20" />
    </Svg>
  );
}

export function ReportsIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 15.5l4-4.5 3 3 5-6" />
    </Svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 4.5h3A2.5 2.5 0 0 1 20.5 7v10a2.5 2.5 0 0 1-2.5 2.5h-3" />
      <path d="M10 8l-4 4 4 4" />
      <path d="M6 12h9" />
    </Svg>
  );
}

/** Rising / falling delta on a stat tile. Paired with a sign, never colour alone. */
export function TrendIcon({ up, ...props }: IconProps & { up: boolean }) {
  return (
    <Svg size={14} {...props}>
      {up ? <path d="M4 16.5L10 10l3.5 3.5L20 6.5" /> : <path d="M4 7.5L10 14l3.5-3.5L20 17.5" />}
      {up ? <path d="M15 6.5h5v5" /> : <path d="M15 17.5h5v-5" />}
    </Svg>
  );
}

export function AlertIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4.5 12.5l5 5 10-11" />
    </Svg>
  );
}

export function EmptyIcon(props: IconProps) {
  return (
    <Svg size={40} strokeWidth={1.25} {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M8 15h8" />
    </Svg>
  );
}
