import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PriceVisibility, type Paisa } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { useFormat } from '../theme/useFormat';
import { Text } from './Text';

interface Props {
  pricePaisa: Paisa | null;
  visibility: PriceVisibility;
}

/**
 * The amber pill over property photography.
 *
 * Uses `roles.priceBackground` rather than `colors.tertiary`: the raw tertiary
 * is luminance-identical to the primary green (1.00:1), so a red-green
 * colourblind user could not tell the price pill from a button. See
 * docs/design/README.md §2.
 */
export function PricePill({ pricePaisa, visibility }: Props) {
  const { t } = useTranslation();
  const format = useFormat();

  const onRequest = visibility === PriceVisibility.ON_REQUEST || pricePaisa === null;

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: onRequest ? colors.surfaceContainerHighest : roles.priceBackground,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.base,
        // Pill shape marks it as information, not a tappable button.
        borderRadius: radius.full,
      }}
    >
      <Text
        variant="numberMd"
        color={onRequest ? colors.onSurface : roles.priceText}
        // "قیمت: رابطہ کریں" is Urdu prose; a price is digits + an Urdu unit.
        // Both need the Urdu face for the word part, so variant stays numberMd
        // only for the digit-led case.
        style={onRequest ? { fontFamily: undefined } : undefined}
      >
        {onRequest ? t('property.priceOnRequest') : format.price(pricePaisa)}
      </Text>
    </View>
  );
}
