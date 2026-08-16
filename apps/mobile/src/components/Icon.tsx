import { Text as RNText } from 'react-native';

import { colors, spacing } from '@ghar/ui';

/**
 * The Stitch exports use Material Symbols. The app has no icon font bundled
 * yet — adding one is ~400KB, which matters on the target device — so these
 * are the closest emoji stand-ins, mapped by the ORIGINAL Material name.
 *
 * Keeping the Material names means swapping in real icons later is a change to
 * this one file: replace the record's value with an <MaterialSymbol/> and every
 * screen follows. Do not scatter raw emoji across screens again.
 *
 * DESIGN.md requires an icon on every navigation and category control, because
 * a user who cannot read still has to find their way. An icon here is never
 * decorative — it always sits beside, or stands in for, a label.
 */
const GLYPHS = {
  search: '🔍',
  mic: '🎤',
  my_location: '📍',
  location_on: '📍',
  home: '🏠',
  apartment: '🏢',
  landscape: '🟩',
  storefront: '🏪',
  warehouse: '🏭',
  business: '🏢',
  bed: '🛏️',
  shower: '🚿',
  bathtub: '🚿',
  straighten: '📐',
  square_foot: '📐',
  play_arrow: '▶️',
  play_circle: '▶️',
  videocam: '🎥',
  volume_up: '🔊',
  record_voice_over: '🔊',
  verified: '✅',
  verified_user: '✅',
  star: '⭐',
  star_border: '☆',
  favorite: '❤️',
  favorite_border: '🤍',
  share: '↗️',
  chat: '💬',
  call: '📞',
  tune: '⚙️',
  filter_list: '⚙️',
  arrow_forward: '→',
  arrow_back: '←',
  map: '🗺️',
  sell: '🏷️',
  info: 'ℹ️',
  add_circle: '➕',
  format_list_bulleted: '📋',
  person: '👤',
  payments: '💳',
  receipt: '🧾',
  insights: '📈',
  warning: '⚠️',
  block: '🚫',
  visibility: '👁️',
  visibility_off: '🙈',
  check: '✓',
  close: '✕',
} as const;

export type IconName = keyof typeof GLYPHS;

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  /**
   * Screen-reader label. Omit ONLY when an adjacent visible label already says
   * the same thing — then the icon is decorative and must be hidden instead of
   * read out twice.
   */
  label?: string;
}

export function Icon({ name, size = 20, color = colors.onSurface, label }: Props) {
  return (
    <RNText
      accessibilityElementsHidden={label === undefined}
      importantForAccessibility={label === undefined ? 'no-hide-descendants' : 'yes'}
      accessibilityLabel={label}
      allowFontScaling={false}
      style={{
        fontSize: size,
        // Emoji sit low in the em box; a line height equal to the size keeps
        // them optically centred inside a fixed-height row.
        lineHeight: size + 2,
        color,
        // Icons must NOT mirror under RTL — an emoji house pointing the other
        // way is not a translation, it's a different picture. Directional
        // arrows are handled by picking the right name, not by flipping.
        writingDirection: 'ltr',
      }}
    >
      {GLYPHS[name]}
    </RNText>
  );
}

/** Icon sized to sit inside the 48px touch floor without extra padding math. */
export const ICON_ROW_HEIGHT = spacing.touchTarget;
