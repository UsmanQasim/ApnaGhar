import { View } from 'react-native';

import { chart, colors, radius, spacing } from '@ghar/ui';

import { NumberText, Text } from './Text';

export interface Bar {
  key: string;
  label: string;
  value: number;
  /** Pre-formatted for display — the caller owns Urdu numerals and units. */
  display: string;
}

/**
 * A horizontal bar chart, built from Views.
 *
 * Horizontal rather than vertical because the labels are Urdu: a vertical
 * chart puts Nastaliq under the axis rotated or truncated, and neither is
 * readable. Horizontal gives every label a full line at its natural size.
 *
 * Single series, so magnitude is carried by BAR LENGTH and colour is constant
 * (`chart.series1`). Colour here would be decoration pretending to be data.
 * Every bar is directly labelled, so the chart is still readable if colour
 * fails entirely — which is the point.
 */
export function BarChart({ data, maxValue }: { data: Bar[]; maxValue?: number }) {
  const max = maxValue ?? Math.max(1, ...data.map((bar) => bar.value));

  return (
    <View style={{ gap: spacing.sm }} accessible accessibilityRole="summary">
      {data.map((bar) => {
        const fraction = Math.max(0, Math.min(1, bar.value / max));
        return (
          <View
            key={bar.key}
            style={{ gap: spacing.base }}
            accessible
            accessibilityLabel={`${bar.label}: ${bar.display}`}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <Text variant="bodyMd" style={{ flex: 1 }} numberOfLines={1}>
                {bar.label}
              </Text>
              {/* The value is text ink, never the series colour — a number
                  wearing the mark's colour reads as a second encoding. */}
              <NumberText variant="numberMd" color={chart.label}>
                {bar.display}
              </NumberText>
            </View>

            <View
              style={{
                height: 10,
                borderRadius: radius.sm,
                backgroundColor: colors.surfaceContainerHigh,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  // Percentage width, so the bar grows from the start edge and
                  // therefore from the RIGHT under RTL — the direction an Urdu
                  // reader's eye already travels.
                  width: `${fraction * 100}%`,
                  height: '100%',
                  borderRadius: radius.sm,
                  backgroundColor: chart.series1,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Views over time, as a sparkline-style column strip.
 *
 * Columns rather than a line: React Native has no SVG dependency here, and a
 * View-based line would be a stack of rotated rectangles — more code, worse
 * result. Columns answer the same question (is it rising?) honestly.
 */
export function ColumnStrip({
  data,
  height = 96,
}: {
  data: Array<{ key: string; value: number; label: string }>;
  height?: number;
}) {
  const max = Math.max(1, ...data.map((point) => point.value));

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2, height }}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={data.map((point) => `${point.label}: ${point.value}`).join('، ')}
    >
      {data.map((point) => (
        <View
          key={point.key}
          style={{
            flex: 1,
            // Anchored to the baseline with a rounded top — the data-end is
            // rounded, the zero end is not.
            height: Math.max(2, (point.value / max) * height),
            borderTopStartRadius: radius.sm,
            borderTopEndRadius: radius.sm,
            backgroundColor: chart.series1,
          }}
        />
      ))}
    </View>
  );
}
