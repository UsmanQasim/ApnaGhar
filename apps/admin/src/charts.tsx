import type { CSSProperties } from 'react';

import { chart, colors, radius, spacing } from '@ghar/ui';

import { muted } from './ui';

/**
 * Charts, in plain HTML and CSS.
 *
 * No chart library: three chart forms do not justify shipping a plotting
 * runtime to an internal panel, and hand-built marks let the design tokens
 * apply directly rather than through a theming adapter.
 *
 * The colour rules these follow (see packages/ui `chart`):
 *  • single-measure charts use ONE hue and encode magnitude by length —
 *    colouring each bar differently would be decoration pretending to be data
 *  • the two-category chart uses the validated `series1`/`series2` pair, and
 *    always ships a legend AND direct labels, so identity never rests on
 *    colour alone
 *  • values and labels wear text ink, never the series colour
 *  • gridlines are recessive; a gridline competing with the data is worse
 *    than no gridline
 */

const axisLabel: CSSProperties = {
  fontSize: 12,
  color: chart.label,
  fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
  direction: 'ltr',
  fontVariantNumeric: 'tabular-nums',
};

/** Vertical columns over time. One measure, one hue, magnitude by height. */
export function ColumnChart({
  data,
  height = 220,
  formatValue,
}: {
  data: Array<{ key: string; label: string; value: number }>;
  height?: number;
  formatValue: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));
  // Four gridlines including zero — enough to read a level, few enough to stay
  // recessive behind the marks.
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((fraction) => ({
    fraction,
    label: formatValue(max * fraction),
  }));

  return (
    <figure style={{ margin: 0 }}>
      <div style={{ display: 'flex', gap: spacing.xs }}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column-reverse',
            justifyContent: 'space-between',
            height,
            ...axisLabel,
          }}
        >
          {ticks.map((tick) => (
            <span key={tick.fraction}>{tick.label}</span>
          ))}
        </div>

        <div style={{ position: 'relative', flex: 1, height }}>
          {ticks.map((tick) => (
            <div
              key={tick.fraction}
              aria-hidden
              style={{
                position: 'absolute',
                insetInline: 0,
                bottom: `${tick.fraction * 100}%`,
                borderTop: `1px solid ${tick.fraction === 0 ? chart.axis : chart.grid}`,
              }}
            />
          ))}

          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'flex-end',
              // 2px of surface between adjacent fills, so two equal columns
              // never merge into one wide block.
              gap: 2,
            }}
          >
            {data.map((point) => (
              <div
                key={point.key}
                title={`${point.label}: ${formatValue(point.value)}`}
                style={{
                  flex: 1,
                  height: `${Math.max(1, (point.value / max) * 100)}%`,
                  background: chart.series1,
                  // Rounded at the DATA end only; the zero end stays square,
                  // anchored to the baseline.
                  borderStartStartRadius: 4,
                  borderStartEndRadius: 4,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 2, marginTop: spacing.base, marginInlineStart: 48 }}>
        {data.map((point) => (
          <span key={point.key} style={{ flex: 1, textAlign: 'center', ...axisLabel }}>
            {point.label}
          </span>
        ))}
      </div>
    </figure>
  );
}

/** Horizontal bars. Urdu labels get a full line at their natural size. */
export function RowChart({
  data,
  formatValue,
}: {
  data: Array<{ key: string; label: string; value: number }>;
  formatValue: (value: number) => string;
}) {
  const max = Math.max(1, ...data.map((row) => row.value));

  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: spacing.xs }}>
      {data.map((row) => (
        <li key={row.key} style={{ display: 'grid', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <span style={{ flex: 1, fontSize: 14 }}>{row.label}</span>
            {/* Every bar directly labelled: the chart stays readable if colour
                fails entirely. */}
            <span style={axisLabel}>{formatValue(row.value)}</span>
          </div>
          <div
            style={{
              height: 10,
              background: colors.surfaceContainerHigh,
              borderRadius: radius.sm,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(row.value / max) * 100}%`,
                height: '100%',
                background: chart.series1,
                borderRadius: radius.sm,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Part-to-whole across two categories, as one stacked bar.
 *
 * Not a pie: two arcs are harder to compare than two segments of a line, and a
 * pie has nowhere to put an Urdu label without a leader line. Legend AND
 * percentages are both present — with two series, colour alone would be the
 * only distinguishing channel otherwise.
 */
export function ShareBar({
  data,
}: {
  data: Array<{ key: string; label: string; value: number }>;
}) {
  const total = data.reduce((sum, slice) => sum + slice.value, 0);
  const slots = [chart.series1, chart.series2];

  if (total === 0) return <p style={muted}>—</p>;

  return (
    <div style={{ display: 'grid', gap: spacing.xs }}>
      <div style={{ display: 'flex', gap: 2, height: 16 }}>
        {data.map((slice, index) => (
          <div
            key={slice.key}
            title={`${slice.label}: ${Math.round((slice.value / total) * 100)}%`}
            style={{
              width: `${(slice.value / total) * 100}%`,
              background: slots[index % slots.length],
              borderRadius: radius.sm,
            }}
          />
        ))}
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
        {data.map((slice, index) => (
          <li key={slice.key} style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: slots[index % slots.length],
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, fontSize: 14 }}>{slice.label}</span>
            <span style={axisLabel}>{Math.round((slice.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
