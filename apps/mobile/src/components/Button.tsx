import { ActivityIndicator, Pressable, View } from 'react-native';

import { colors, elevation, radius, spacing } from '@ghar/ui';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'tertiary' | 'ghost';

interface Props {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  /** Rendered before the label in logical order — flips correctly under RTL. */
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const PALETTE: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: 'transparent', fg: colors.secondary, border: colors.secondary },
  tertiary: { bg: colors.tertiaryFixed, fg: colors.onTertiaryFixed },
  ghost: { bg: 'transparent', fg: colors.primary },
};

/**
 * Every button in the app. Two non-negotiables baked in:
 *
 *  • minHeight 48 — DESIGN.md's accessibility floor, for users with limited
 *    fine motor precision. A 36px button is not a smaller button, it's an
 *    unusable one.
 *  • the label is always a full Urdu phrase, never an abbreviation. "ادا کریں"
 *    not "OK".
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  fullWidth = true,
}: Props) {
  const palette = PALETTE[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        {
          minHeight: spacing.touchTarget,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.xs,
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          backgroundColor: palette.bg,
          borderWidth: palette.border ? 1 : 0,
          borderColor: palette.border,
          opacity: inactive ? 0.5 : pressed ? 0.85 : 1,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
        },
        variant === 'primary' ? elevation.fab : null,
      ]}
    >
      {loading ? <ActivityIndicator color={palette.fg} /> : icon}
      <Text variant="bodyMd" color={palette.fg} center>
        {label}
      </Text>
    </Pressable>
  );
}

/** Circular icon-only control, sized at the 48px floor by construction. */
export function IconButton({
  onPress,
  children,
  label,
  background = colors.surfaceContainerLowest,
}: {
  onPress: () => void;
  children: React.ReactNode;
  label: string;
  background?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: spacing.touchTarget,
        height: spacing.touchTarget,
        borderRadius: radius.full,
        backgroundColor: background,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View pointerEvents="none">{children}</View>
    </Pressable>
  );
}
