/**
 * Design tokens, transcribed from docs/design/ghar/DESIGN.md.
 *
 * The frontmatter in DESIGN.md is canonical — its prose section quotes a
 * different primary (#059669) and background (#F8FAFC) than its own token
 * block. The token values below are the ones actually used across all 25
 * exported screens, so those win. See docs/design/README.md for the full note.
 *
 * Shared by the Expo app, the admin panel and the public share pages so a
 * colour can never drift between surfaces.
 */

export const colors = {
  // Surfaces — tonal layers, not shadows.
  surface: '#f8f9ff',
  surfaceDim: '#cbdbf5',
  surfaceBright: '#f8f9ff',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#eff4ff',
  surfaceContainer: '#e5eeff',
  surfaceContainerHigh: '#dce9ff',
  surfaceContainerHighest: '#d3e4fe',
  surfaceVariant: '#d3e4fe',
  onSurface: '#0b1c30',
  onSurfaceVariant: '#3d4a42',
  inverseSurface: '#213145',
  inverseOnSurface: '#eaf1ff',

  outline: '#6d7a72',
  outlineVariant: '#bccac0',
  surfaceTint: '#006c4a',

  // Primary — "Real Estate Green". Main actions, success, progress.
  primary: '#006948',
  onPrimary: '#ffffff',
  primaryContainer: '#00855d',
  onPrimaryContainer: '#f5fff7',
  inversePrimary: '#68dba9',
  primaryFixed: '#85f8c4',
  primaryFixedDim: '#68dba9',
  onPrimaryFixed: '#002114',
  onPrimaryFixedVariant: '#005137',

  // Secondary — "Deep Slate". Headers, structure.
  secondary: '#545f73',
  onSecondary: '#ffffff',
  secondaryContainer: '#d5e0f8',
  onSecondaryContainer: '#586377',
  secondaryFixed: '#d8e3fb',
  secondaryFixedDim: '#bcc7de',
  onSecondaryFixed: '#111c2d',
  onSecondaryFixedVariant: '#3c475a',

  // Tertiary — Amber. RESERVED for price pills, verified badges, urgent CTAs.
  // Do not use it for general emphasis; its job is to survive against the green.
  tertiary: '#825100',
  onTertiary: '#ffffff',
  tertiaryContainer: '#a36700',
  onTertiaryContainer: '#fffbff',
  tertiaryFixed: '#ffddb8',
  tertiaryFixedDim: '#ffb95f',
  onTertiaryFixed: '#2a1700',
  onTertiaryFixedVariant: '#653e00',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  background: '#f8f9ff',
  onBackground: '#0b1c30',
} as const;

export type ColorToken = keyof typeof colors;

export const fonts = {
  /** Urdu. Bundle it — Android's stock Urdu rendering is inconsistent. */
  urdu: 'NotoNastaliqUrdu',
  /** Numbers, prices, English terms. Keeps data scannable next to Nastaliq. */
  sans: 'PlusJakartaSans',
} as const;

/**
 * Nastaliq needs roughly 2x line height or the descenders of one line collide
 * with the ascenders of the next. These lineHeights are not padding — they are
 * a legibility requirement of the script.
 */
export const typography = {
  headlineLg: { fontFamily: fonts.urdu, fontSize: 32, fontWeight: '700', lineHeight: 64 },
  headlineMd: { fontFamily: fonts.urdu, fontSize: 24, fontWeight: '600', lineHeight: 48 },
  headlineSm: { fontFamily: fonts.urdu, fontSize: 20, fontWeight: '600', lineHeight: 40 },
  bodyLg: { fontFamily: fonts.urdu, fontSize: 18, fontWeight: '400', lineHeight: 36 },
  bodyMd: { fontFamily: fonts.urdu, fontSize: 16, fontWeight: '400', lineHeight: 32 },
  numberLg: { fontFamily: fonts.sans, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  numberMd: { fontFamily: fonts.sans, fontSize: 16, fontWeight: '600', lineHeight: 20 },
  labelSm: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.24,
  },
} as const;

export type TypographyToken = keyof typeof typography;

/**
 * Which alphabet a locale is set in. Not the same question as direction:
 * Roman Urdu is Latin script AND left-to-right, Urdu is Nastaliq AND
 * right-to-left, but the two properties are decided separately and a locale
 * added later could mix them.
 *
 * Kept as a script name rather than a Locale so this package stays
 * dependency-free; @ghar/shared owns the locale → script mapping
 * (`isLatinScript`).
 */
export type Script = 'nastaliq' | 'latin';

/**
 * The same scale, set in Latin.
 *
 * Two things change and neither is cosmetic:
 *
 *  • the face — Nastaliq has no Latin glyphs worth the name, so Roman Urdu
 *    rendered in NotoNastaliqUrdu falls back per-character to whatever the OS
 *    picks, and the line stops looking like one typeface.
 *  • the leading — the ~2x above is a legibility requirement of Nastaliq's
 *    descenders, not a style choice. Applied to Latin it reads as
 *    double-spaced text, and a paragraph stops holding together as a block.
 *
 * Sizes are deliberately identical, so a language switch changes the script
 * without reflowing every screen.
 */
export const typographyLatin = {
  headlineLg: { fontFamily: fonts.sans, fontSize: 32, fontWeight: '700', lineHeight: 40 },
  headlineMd: { fontFamily: fonts.sans, fontSize: 24, fontWeight: '600', lineHeight: 32 },
  headlineSm: { fontFamily: fonts.sans, fontSize: 20, fontWeight: '600', lineHeight: 28 },
  bodyLg: { fontFamily: fonts.sans, fontSize: 18, fontWeight: '400', lineHeight: 28 },
  bodyMd: { fontFamily: fonts.sans, fontSize: 16, fontWeight: '400', lineHeight: 24 },
  // Already Latin in both sets — numerals and labels never used Nastaliq.
  numberLg: { fontFamily: fonts.sans, fontSize: 20, fontWeight: '700', lineHeight: 24 },
  numberMd: { fontFamily: fonts.sans, fontSize: 16, fontWeight: '600', lineHeight: 20 },
  labelSm: {
    fontFamily: fonts.sans,
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.24,
  },
} as const;

/** The type scale for a script. `typography` remains the Nastaliq default. */
export function typographyFor(script: Script) {
  return script === 'latin' ? typographyLatin : typography;
}

/**
 * CSS font stacks for the web surfaces, which load these faces from Google
 * Fonts rather than bundling them.
 *
 * The fallbacks matter more than usual: if Noto Nastaliq Urdu fails to load,
 * a system Arabic-script fallback still renders readable Urdu, whereas
 * `sans-serif` alone renders it in a naskh face that changes the shape of
 * every word.
 */
export const webFontStack = {
  nastaliq: "'Noto Nastaliq Urdu', 'Noto Naskh Arabic', 'Jameel Noori Nastaleeq', serif",
  latin: "'Plus Jakarta Sans', system-ui, -apple-system, 'Segoe UI', sans-serif",
} as const;

/**
 * Line-height multiplier for body copy on the web, where lineHeight is set as
 * a unitless ratio rather than the absolute pixel values above.
 */
export const webLineHeight = {
  nastaliq: 2,
  latin: 1.6,
} as const;

export const spacing = {
  base: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  /**
   * Hard floor for every interactive element. From DESIGN.md: users who
   * struggle with fine motor precision must still be able to hit the target.
   * Enforced by the `hitSlop` helper below — do not ship a 32px button.
   */
  touchTarget: 48,
} as const;

export const radius = {
  sm: 4,
  DEFAULT: 8,
  /** Inputs and buttons. */
  md: 12,
  /** Property cards — soft "premium" container for photography. */
  lg: 16,
  xl: 24,
  /** Badges and chips — pill, to distinguish them from buttons. */
  full: 9999,
} as const;

/** Level 2 elevation: FABs only (voice search, call agent). */
export const elevation = {
  fab: {
    shadowColor: colors.secondary,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  /** Level 1: cards use a 1px border, not a shadow. */
  card: {
    borderWidth: 1,
    borderColor: colors.surfaceContainerHigh,
  },
} as const;

/**
 * Expand a small icon's touch area to the 48px minimum without changing its
 * visual size. Use on every icon-only control.
 */
export function hitSlop(visualSize: number): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  const pad = Math.max(0, (spacing.touchTarget - visualSize) / 2);
  return { top: pad, bottom: pad, left: pad, right: pad };
}

/**
 * Semantic roles.
 *
 * ⚠️ Why the price pill does NOT use `colors.tertiary`:
 * `tertiary` (#825100) and `primary` (#006948) have effectively identical
 * relative luminance — a contrast ratio of 1.00:1 against each other. They are
 * told apart by HUE ALONE, and green-vs-amber is precisely the axis that
 * red-green colour blindness collapses (~8% of men). To a deuteranope the
 * amber price pill and the green primary button become the same colour.
 *
 * `tertiaryFixedDim` (#ffb95f) with `onTertiaryFixed` (#2a1700) keeps the same
 * amber identity, gives 10.1:1 text contrast, and sits ~4:1 in luminance away
 * from primary green — so the price is distinguishable without relying on hue.
 * Both tokens were already in the design system; this just picks the right pair.
 */
export const roles = {
  /** Price pill on property cards and video overlays. */
  priceBackground: colors.tertiaryFixedDim,
  priceText: colors.onTertiaryFixed,

  /** "Verified agent" badge. */
  verifiedBackground: colors.primary,
  verifiedText: colors.onPrimary,

  /** Primary CTA. */
  actionBackground: colors.primary,
  actionText: colors.onPrimary,

  /** Amount-due / expiry warnings. */
  warningBackground: colors.errorContainer,
  warningText: colors.onErrorContainer,

  /** Card surface — level 1 is white with a 1px border, never a shadow. */
  cardBackground: colors.surfaceContainerLowest,
  cardBorder: colors.surfaceContainerHigh,
} as const;

/**
 * Chart series colours.
 *
 * A categorical chart palette has a harder job than UI colour: the slots have
 * to stay apart for a red-green colourblind reader AND stay apart in plain
 * greyscale, on the surface they actually render on. Eyeballing that does not
 * work — these two were selected by running the pair through a CVD/ΔE
 * validator against the white card surface, and they are the pair that passed
 * every check (lightness band, chroma floor, CVD separation, normal-vision
 * separation, and 3:1 contrast).
 *
 * ⚠️ Note which green this is. `colors.primary` (#006948) FAILS the chroma
 * floor here and is luminance-identical to `colors.tertiary` — the very
 * finding that forced `roles.priceBackground` off raw tertiary. The chart pair
 * uses `primaryContainer` instead. Do not "tidy" these back to primary.
 *
 * Single-series charts (revenue over time, listings per city) use `series1`
 * alone and encode magnitude by length, never by hue.
 */
export const chart = {
  /** Categorical slot 1. Also the single-series default. */
  series1: colors.primaryContainer,
  /** Categorical slot 2. */
  series2: colors.tertiary,
  /** Hairline gridlines — recessive, never competing with the marks. */
  grid: colors.outlineVariant,
  /** Baseline / axis rule. */
  axis: colors.outline,
  /** Axis tick and value labels: text ink, never the series colour. */
  label: colors.onSurfaceVariant,
} as const;

export type ChartSlot = keyof typeof chart;

export const theme = { colors, roles, chart, fonts, typography, spacing, radius, elevation } as const;
export type Theme = typeof theme;
