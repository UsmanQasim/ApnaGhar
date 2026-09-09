/**
 * The hero illustration.
 *
 * Drawn in SVG rather than photographed, for three reasons that all matter on
 * this particular site: there is no licensed photography to use; a hero image
 * is the heaviest thing on a page opened over Pakistani mobile data; and a
 * stock photo of a foreign house undercuts the one claim the page is making,
 * which is that these are real local properties.
 *
 * What it shows is the product's actual differentiator — a property card with
 * a video tour — rather than an abstract shape.
 *
 * `aria-hidden`: it repeats the headline beside it and would only add noise to
 * a screen reader. Nothing here is information the text does not carry.
 */
export function HeroArt({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 360"
      className={className}
      role="presentation"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ghar-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ghar-color-surface-container-lowest)" />
          <stop offset="100%" stopColor="var(--ghar-color-surface-container-low)" />
        </linearGradient>
        <linearGradient id="ghar-thumb" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--ghar-color-primary-container)" />
          <stop offset="100%" stopColor="var(--ghar-color-primary)" />
        </linearGradient>
        <linearGradient id="ghar-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--ghar-color-secondary-container)" />
          <stop offset="100%" stopColor="var(--ghar-color-surface-container)" />
        </linearGradient>
      </defs>

      {/* ── Back card: a second listing, peeking, to suggest a feed ────── */}
      <g opacity="0.55">
        <rect
          x="196"
          y="26"
          width="196"
          height="120"
          rx="16"
          fill="url(#ghar-card)"
          stroke="var(--ghar-role-card-border)"
        />
        <rect x="212" y="42" width="164" height="58" rx="10" fill="url(#ghar-sky)" />
        <rect x="212" y="110" width="96" height="8" rx="4" fill="var(--ghar-color-outline-variant)" />
        <rect x="212" y="124" width="60" height="8" rx="4" fill="var(--ghar-color-outline-variant)" />
      </g>

      {/* ── Main listing card ─────────────────────────────────────────── */}
      <g>
        <rect
          x="24"
          y="60"
          width="266"
          height="256"
          rx="20"
          fill="url(#ghar-card)"
          stroke="var(--ghar-role-card-border)"
        />

        {/* Video thumbnail */}
        <rect x="40" y="76" width="234" height="132" rx="14" fill="url(#ghar-thumb)" />

        {/* A rooftop skyline inside the thumbnail, so it reads as property
            rather than as a coloured rectangle. */}
        <g opacity="0.28" fill="var(--ghar-color-on-primary)">
          <path d="M56 190v-34l22-16 22 16v34z" />
          <path d="M108 190v-46l26-18 26 18v46z" />
          <path d="M168 190v-28l20-14 20 14v28z" />
          <path d="M216 190v-40l22-15 22 15v40z" />
        </g>

        {/* Play button — the one element that says "video" at a glance. */}
        <circle cx="157" cy="142" r="26" fill="var(--ghar-color-surface-container-lowest)" opacity="0.95" />
        <path d="M150 132l18 10-18 10z" fill="var(--ghar-color-primary)" />

        {/* Price pill. Amber on a dim fixed tone, per the token note: raw
            tertiary is luminance-identical to primary and collapses for a
            red-green colourblind reader. */}
        <g>
          <rect x="52" y="88" width="86" height="26" rx="13" fill="var(--ghar-color-tertiary-fixed-dim)" />
          <rect x="64" y="97" width="62" height="8" rx="4" fill="var(--ghar-color-on-tertiary-fixed)" opacity="0.75" />
        </g>

        {/* Title and meta lines */}
        <rect x="40" y="224" width="176" height="11" rx="5.5" fill="var(--ghar-color-on-surface)" opacity="0.82" />
        <rect x="40" y="244" width="120" height="9" rx="4.5" fill="var(--ghar-color-outline-variant)" />

        {/* Verified agent row */}
        <circle cx="50" cy="284" r="14" fill="var(--ghar-color-secondary-container)" />
        <rect x="72" y="274" width="92" height="9" rx="4.5" fill="var(--ghar-color-outline-variant)" />
        <g>
          <rect x="72" y="290" width="64" height="16" rx="8" fill="var(--ghar-color-primary-fixed)" />
          <path
            d="M80 298l3.5 3.5 7-7"
            fill="none"
            stroke="var(--ghar-color-on-primary-fixed)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      </g>

      {/* ── Floating chip: voice search, the other differentiator ──────── */}
      <g>
        <rect
          x="238"
          y="196"
          width="158"
          height="56"
          rx="16"
          fill="var(--ghar-color-surface-container-lowest)"
          stroke="var(--ghar-role-card-border)"
        />
        <circle cx="268" cy="224" r="17" fill="var(--ghar-color-primary-fixed)" />
        <g
          fill="none"
          stroke="var(--ghar-color-on-primary-fixed)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="264.5" y="216" width="7" height="10" rx="3.5" />
          <path d="M260.5 224a7.5 7.5 0 0 0 15 0" />
          <path d="M268 231.5v3" />
        </g>
        <rect x="294" y="214" width="84" height="8" rx="4" fill="var(--ghar-color-outline-variant)" />
        <rect x="294" y="228" width="56" height="8" rx="4" fill="var(--ghar-color-outline-variant)" />
      </g>
    </svg>
  );
}
