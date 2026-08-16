import type { ReactNode } from 'react';
import { Text as RNText, type StyleProp, type TextProps, type TextStyle } from 'react-native';

import { colors, typography, type TypographyToken } from '@ghar/ui';

interface Props extends Omit<TextProps, 'style'> {
  variant?: TypographyToken;
  color?: string;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children?: ReactNode;
}

/**
 * The only Text in the app. Raw `<Text>` is banned by lint, because two things
 * must never be forgotten:
 *
 *  1. `lineHeight` — Nastaliq without ~2x leading has colliding descenders and
 *     becomes genuinely unreadable, not just ugly.
 *  2. `textAlign` — React Native's default 'left' does NOT follow RTL on
 *     Android. 'auto' resolves per the text's own script, which is what an
 *     app mixing Urdu prose with Latin numerals needs.
 */
export function Text({ variant = 'bodyMd', color, center, style, ...rest }: Props) {
  const base = typography[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: base.fontFamily,
          fontSize: base.fontSize,
          lineHeight: base.lineHeight,
          fontWeight: base.fontWeight as TextStyle['fontWeight'],
          color: color ?? colors.onSurface,
          textAlign: center ? 'center' : 'auto',
          // Nastaliq glyphs sit high in their em box; without this the visual
          // centre of a line looks shifted upward inside a fixed-height row.
          includeFontPadding: false,
        },
        style,
      ]}
    />
  );
}

/**
 * Numerals, prices and English terms. Plus Jakarta Sans, so digits stay
 * scannable next to Nastaliq. Always writes left-to-right regardless of layout
 * direction — a phone number or a price must not mirror.
 */
export function NumberText({ variant = 'numberMd', style, ...rest }: Props) {
  return <Text variant={variant} {...rest} style={[style, { writingDirection: 'ltr' }]} />;
}
