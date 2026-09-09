import type { SVGProps } from 'react';

/**
 * Drawn icons for the marketing site.
 *
 * The feature cards used emoji (🎥 ✅ 💬 🎤 ⚡ 📈 ⭐). Emoji are rendered by the
 * operating system, so the page arrived in a different style on every machine,
 * carried the platform's own colours regardless of the surface behind them,
 * and landed as flat monochrome next to full-colour neighbours on Windows.
 * On a page whose whole job is to look trustworthy, that is not a small thing.
 *
 * `currentColor` throughout, so an icon takes its colour from the tile that
 * holds it and there is no second place to keep the palette in step.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
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

/** Video tours. */
export function VideoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.5" y="6" width="13" height="12" rx="2.5" />
      <path d="M15.5 10.5 21 7.5v9l-5.5-3z" />
      <path d="M6.5 12.5h3" />
    </Svg>
  );
}

/** Verified agents. */
export function ShieldCheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 2.75 4.5 6v6c0 4.4 3.1 7.7 7.5 9.25 4.4-1.55 7.5-4.85 7.5-9.25V6L12 2.75Z" />
      <path d="M8.75 12.25 11 14.5l4.25-4.5" />
    </Svg>
  );
}

/** Direct contact. */
export function ChatIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M20.5 12c0 4.14-3.8 7.5-8.5 7.5a9.9 9.9 0 0 1-2.6-.34L4.5 20.5l1.2-3.4A7.1 7.1 0 0 1 3.5 12c0-4.14 3.8-7.5 8.5-7.5s8.5 3.36 8.5 7.5Z" />
      <path d="M8.75 11.5h6.5M8.75 14h4" />
    </Svg>
  );
}

/** Voice search. */
export function MicIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="2.75" width="6" height="11" rx="3" />
      <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
      <path d="M12 18v3.25" />
    </Svg>
  );
}

/** Premium leads. */
export function SparkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3 13.9 9.2 20 11l-6.1 1.8L12 19l-1.9-6.2L4 11l6.1-1.8L12 3Z" />
      <path d="M18.5 3.5v3M20 5h-3" />
    </Svg>
  );
}

/** Analytics. */
export function ChartIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 3v18h18" />
      <path d="M7 16v-4M11.5 16V8M16 16v-6M20 16v-9" />
    </Svg>
  );
}

/** Faster sales. */
export function BoltIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M13.5 2.5 5 13.5h5.5L10 21.5 19 10.5h-5.5l0-8Z" />
    </Svg>
  );
}

/** Time saved. */
export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.25l3.25 2" />
    </Svg>
  );
}

/** Privacy. */
export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <path d="M12 14v2.5" />
    </Svg>
  );
}

/** Real footage / camera. */
export function CameraIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8.5h3l1.5-2.25h9L18 8.5h3v11H3v-11Z" />
      <circle cx="12" cy="13.5" r="3.25" />
    </Svg>
  );
}

/** Bulk tools / listings. */
export function LayersIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 8.5 4.5L12 12 3.5 7.5 12 3Z" />
      <path d="m4.5 12 7.5 4 7.5-4" />
      <path d="m4.5 16.5 7.5 4 7.5-4" />
    </Svg>
  );
}

/** Support. */
export function LifebuoyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.75" />
      <path d="m5.6 5.6 3.75 3.75M18.4 5.6l-3.75 3.75M18.4 18.4l-3.75-3.75M5.6 18.4l3.75-3.75" />
    </Svg>
  );
}

/** Search. */
export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="6.75" />
      <path d="m16 16 4.5 4.5" />
    </Svg>
  );
}

/** A tick for feature lists. */
export function CheckIcon(props: IconProps) {
  return (
    <Svg size={18} strokeWidth={2} {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Svg>
  );
}

/** Location pin, for the contact block. */
export function PinIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 21.5s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11Z" />
      <circle cx="12" cy="10.5" r="2.75" />
    </Svg>
  );
}

/** Phone, for the contact block. */
export function PhoneIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6.5 3.5h3l1.5 4-2 1.5a12 12 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z" />
    </Svg>
  );
}

/** Mail, for the contact block. */
export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="2.75" y="5" width="18.5" height="14" rx="2.5" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </Svg>
  );
}

/** The brand roofline. Also used by the admin panel's sidebar. */
export function GharMark({ size = 24, ...rest }: IconProps) {
  return (
    <Svg size={size} strokeWidth={1.75} {...rest}>
      <path d="M3 10.5 12 4l9 6.5" />
      <path d="M5.5 12v8h13v-8" />
      <path d="M10 20v-4.5h4V20" />
    </Svg>
  );
}
