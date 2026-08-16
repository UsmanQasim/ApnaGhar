import assert from 'node:assert/strict';
import { test } from 'node:test';

import { chart, colors, hitSlop, radius, roles, spacing, typography } from './tokens';

/** Relative luminance per WCAG 2.1. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * These are not decorative checks. The whole product thesis is that a
 * semi-literate user on a cheap phone in daylight can use this app. Contrast
 * and touch targets are the two things that decide whether that is true.
 */

test('body text on background clears WCAG AA (4.5:1)', () => {
  assert.ok(
    contrast(colors.onSurface, colors.surface) >= 4.5,
    `onSurface on surface is ${contrast(colors.onSurface, colors.surface).toFixed(2)}:1`,
  );
});

test('white text on primary green clears AA — this is every primary button', () => {
  assert.ok(
    contrast(colors.onPrimary, colors.primary) >= 4.5,
    `onPrimary on primary is ${contrast(colors.onPrimary, colors.primary).toFixed(2)}:1`,
  );
});

test('price pill text clears AA', () => {
  assert.ok(
    contrast(roles.priceText, roles.priceBackground) >= 4.5,
    `price pill is ${contrast(roles.priceText, roles.priceBackground).toFixed(2)}:1`,
  );
});

test('raw tertiary is luminance-identical to primary — documents why roles exist', () => {
  // This is the finding that forced the semantic roles. If someone "simplifies"
  // the price pill back to colors.tertiary, this test explains the cost.
  const ratio = contrast(colors.tertiary, colors.primary);
  assert.ok(
    ratio < 1.2,
    `expected tertiary and primary to be luminance-identical (they are ${ratio.toFixed(2)}:1)`,
  );
});

test('error text on its container clears AA', () => {
  assert.ok(
    contrast(colors.onErrorContainer, colors.errorContainer) >= 4.5,
    `onErrorContainer on errorContainer is ${contrast(colors.onErrorContainer, colors.errorContainer).toFixed(2)}:1`,
  );
});

test('price pill is distinguishable from primary green WITHOUT relying on hue', () => {
  // ~8% of men cannot separate green from amber by hue. The pill and the
  // primary button both sit on photography, so they must differ in luminance
  // or a colourblind user reads the price as a button.
  const ratio = contrast(roles.priceBackground, roles.actionBackground);
  assert.ok(
    ratio >= 3,
    `price pill vs primary button is only ${ratio.toFixed(2)}:1 — indistinguishable in greyscale`,
  );
});

test('verified badge and price pill are not confusable with each other', () => {
  assert.ok(contrast(roles.verifiedBackground, roles.priceBackground) >= 3);
});

test('touch target floor is 48px and hitSlop reaches it', () => {
  assert.equal(spacing.touchTarget, 48);
  const slop = hitSlop(24);
  assert.equal(24 + slop.left + slop.right, 48);
  assert.equal(24 + slop.top + slop.bottom, 48);
  // Already large enough: no negative padding.
  const big = hitSlop(56);
  assert.equal(big.left, 0);
});

test('every Urdu style has ~2x line height, or Nastaliq descenders collide', () => {
  const urduStyles = ['headlineLg', 'headlineMd', 'headlineSm', 'bodyLg', 'bodyMd'] as const;
  for (const key of urduStyles) {
    const style = typography[key];
    const ratio = style.lineHeight / style.fontSize;
    assert.ok(
      ratio >= 1.8,
      `${key} line-height ratio is ${ratio.toFixed(2)}, needs >= 1.8 for Nastaliq`,
    );
  }
});

test('body text is never below 16px', () => {
  assert.ok(typography.bodyMd.fontSize >= 16);
  assert.ok(typography.bodyLg.fontSize >= 16);
});

test('card and pill radii match the design language', () => {
  assert.equal(radius.lg, 16); // property cards
  assert.equal(radius.md, 12); // inputs and buttons
  assert.equal(radius.full, 9999); // badges/chips
});

// ─────────────────────────────────────────────────────────────────────────────
// Colour-vision-deficiency separation, in OKLab
//
// WCAG contrast is the wrong tool for two SERIES colours. It compares relative
// luminance, which answers "can I read text on this?" — not "are these two
// marks different?". Two hues can sit at almost the same luminance (this pair
// is 1.44:1) and still be trivially distinguishable, which is exactly the case
// here. The right measure is perceptual distance under a simulation of each
// kind of colour blindness.
//
// The simulation below is the Viénot/Brettel/Mollon dichromat approximation
// applied in linear RGB, with distance measured as OKLab ΔE ×100. It is an
// approximation, not the authority — the pair was selected by running a
// dedicated validator — but it reproduces that validator's normal-vision
// figure exactly, and it is what stops someone re-picking these two values
// without re-checking them.
// ─────────────────────────────────────────────────────────────────────────────

type Rgb = [number, number, number];

function toLinear(hex: string): Rgb {
  const channel = (i: number): number => {
    const value = parseInt(hex.slice(i, i + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return [channel(1), channel(3), channel(5)];
}

const CVD_MATRICES: Record<'deutan' | 'protan' | 'tritan', [Rgb, Rgb, Rgb]> = {
  deutan: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7],
  ],
  protan: [
    [0.1115, 0.8885, 0],
    [0.1115, 0.8885, 0],
    [0.004, -0.004, 1],
  ],
  tritan: [
    [1, 0, 0],
    [0, 0.4333, 0.5667],
    [0, 0.2477, 0.7523],
  ],
};

function simulate(rgb: Rgb, kind: keyof typeof CVD_MATRICES): Rgb {
  const [rowR, rowG, rowB] = CVD_MATRICES[kind];
  const apply = (row: Rgb): number => row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2];
  return [apply(rowR), apply(rowG), apply(rowB)];
}

function oklab([r, g, b]: Rgb): Rgb {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function deltaE(a: Rgb, b: Rgb): number {
  const [l1, a1, b1] = oklab(a);
  const [l2, a2, b2] = oklab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2) * 100;
}

test('chart series are far apart for a full-colour reader', () => {
  // Floor of 15. Below this, two series are hard to tell apart even with
  // normal colour vision — a legend does not rescue a chart whose marks look
  // the same.
  const separation = deltaE(toLinear(chart.series1), toLinear(chart.series2));
  assert.ok(
    separation >= 15,
    `chart series 1 vs 2 is only ΔE ${separation.toFixed(1)} for normal vision`,
  );
});

test('chart series stay apart under every kind of colour blindness', () => {
  // ~8% of men cannot separate green from amber by hue — and green-vs-amber is
  // precisely this pair. Target ΔE 8; below that the two plans in a stacked
  // bar merge into one block for those readers.
  for (const kind of ['deutan', 'protan', 'tritan'] as const) {
    const separation = deltaE(
      simulate(toLinear(chart.series1), kind),
      simulate(toLinear(chart.series2), kind),
    );
    assert.ok(
      separation >= 8,
      `chart series collapse under ${kind}: ΔE ${separation.toFixed(1)}`,
    );
  }
});

test('chart series are NOT separable by luminance alone — so labels are mandatory', () => {
  // Documents the trade-off deliberately. These two are told apart by hue and
  // chroma, not brightness, so every chart using both MUST also carry a legend
  // and direct labels (see apps/admin/src/charts.tsx). If someone later drops
  // the labels "because the colours are clear", this test explains why they
  // were there.
  assert.ok(contrast(chart.series1, chart.series2) < 2);
});

test('chart series clear 3:1 against the white card surface they render on', () => {
  for (const slot of [chart.series1, chart.series2] as const) {
    const ratio = contrast(slot, colors.surfaceContainerLowest);
    assert.ok(ratio >= 3, `chart slot ${slot} is only ${ratio.toFixed(2)}:1 on the card surface`);
  }
});

test('chart grid and axis stay recessive against the marks', () => {
  // A gridline that competes with the data is worse than no gridline.
  assert.ok(contrast(chart.grid, colors.surfaceContainerLowest) < 3);
});
