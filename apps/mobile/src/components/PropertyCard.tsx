import { useCallback } from 'react';
import { Image, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import * as Speech from 'expo-speech';

import { AreaUnit, PriceVisibility, PropertyStatus, type PropertyType } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { toPaisa } from '../api/client';
import { useFormat } from '../theme/useFormat';
import { Icon } from './Icon';
import { NumberText, Text } from './Text';

export interface PropertySummary {
  id: string;
  titleUr: string;
  descriptionUr: string | null;
  pricePaisa: string | null;
  priceVisibility: PriceVisibility;
  type: PropertyType;
  status: PropertyStatus;
  city: string;
  locality: string | null;
  areaValue: number;
  areaUnit: AreaUnit;
  bedrooms: number | null;
  bathrooms: number | null;
  thumbnailUrl: string | null;
  hasVideo: boolean;
  agent?: { id: string; name: string; verified: boolean } | null;
}

interface Props {
  item: PropertySummary;
  onPress: () => void;
  onCall?: () => void;
  onWhatsapp?: () => void;
  /** Rendered in the corner — used by listings management for the ⋮ menu. */
  trailing?: React.ReactNode;
}

/**
 * One property, as it appears in search results, on an agent's profile and in
 * the agent's own listing list. Deliberately a single component: three
 * near-identical cards drifting apart is how a design system dies.
 *
 * Order follows DESIGN.md — image and price first, text second. A user who
 * reads slowly should be able to reject a listing on the photo and the amber
 * pill alone, without parsing a word.
 */
export function PropertyCard({ item, onPress, onCall, onWhatsapp, trailing }: Props) {
  const { t } = useTranslation();
  const format = useFormat();

  const place = [item.locality, item.city].filter(Boolean).join('، ');
  const onRequest = item.priceVisibility === PriceVisibility.ON_REQUEST || item.pricePaisa === null;

  /**
   * Read-aloud, in the order a sighted reader takes the card: what it is,
   * where it is, what it costs. Price last because it is the decision.
   */
  const speak = useCallback(() => {
    const parts = [
      item.titleUr,
      place,
      format.area(item.areaValue, item.areaUnit),
      onRequest ? t('property.priceOnRequest') : format.price(toPaisa(item.pricePaisa)),
    ];
    Speech.speak(parts.filter(Boolean).join('۔ '), { language: 'ur-PK', rate: 0.9 });
  }, [item, place, onRequest, format, t]);

  const closed = item.status === PropertyStatus.SOLD || item.status === PropertyStatus.RENTED;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.titleUr}
      style={({ pressed }) => ({
        backgroundColor: roles.cardBackground,
        borderWidth: 1,
        borderColor: roles.cardBorder,
        borderRadius: radius.lg,
        overflow: 'hidden',
        opacity: pressed ? 0.9 : 1,
      })}
    >
      <View style={{ height: 180, backgroundColor: colors.surfaceContainerHigh }}>
        {item.thumbnailUrl ? (
          <Image
            source={{ uri: item.thumbnailUrl }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : null}

        {/* Price pill top-start: under RTL that resolves to the top-RIGHT
            corner the mock shows, without hardcoding a side. */}
        <View style={{ position: 'absolute', top: spacing.xs, start: spacing.xs }}>
          <PriceOverlay pricePaisa={item.pricePaisa} onRequest={onRequest} />
        </View>

        {item.hasVideo ? (
          <View
            style={{
              position: 'absolute',
              top: spacing.xs,
              end: spacing.xs,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.base,
              backgroundColor: colors.inverseSurface,
              paddingHorizontal: spacing.xs,
              paddingVertical: spacing.base,
              borderRadius: radius.full,
            }}
          >
            <Icon name="videocam" size={14} color={colors.inverseOnSurface} />
            <Text variant="labelSm" color={colors.inverseOnSurface}>
              {t('property.videoAvailable')}
            </Text>
          </View>
        ) : null}

        {item.hasVideo ? (
          <View
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              start: 0,
              end: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            pointerEvents="none"
          >
            <Icon name="play_circle" size={44} />
          </View>
        ) : null}

        {closed ? (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              start: 0,
              end: 0,
              backgroundColor: colors.inverseSurface,
              paddingVertical: spacing.base,
              alignItems: 'center',
            }}
          >
            <Text variant="labelSm" color={colors.inverseOnSurface}>
              {t(item.status === PropertyStatus.SOLD ? 'property.sold' : 'property.rented')}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing.sm, gap: spacing.xs }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.xs }}>
          <Text variant="headlineSm" style={{ flex: 1 }} numberOfLines={2}>
            {item.titleUr}
          </Text>
          {trailing}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
          <Icon name="location_on" size={16} color={colors.onSurfaceVariant} />
          <Text variant="bodyMd" color={colors.onSurfaceVariant} numberOfLines={1} style={{ flex: 1 }}>
            {place}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          {item.bedrooms !== null ? (
            <Spec icon="bed" value={format.count(item.bedrooms)} label={t('property.bedrooms')} />
          ) : null}
          {item.bathrooms !== null ? (
            <Spec icon="shower" value={format.count(item.bathrooms)} label={t('property.bathrooms')} />
          ) : null}
          <Spec
            icon="square_foot"
            value={format.area(item.areaValue, item.areaUnit)}
            label={t('property.area')}
          />

          {/* Speaker last in logical order so it lands at the far edge, away
              from the specs it would otherwise be mistaken for. */}
          <Pressable
            onPress={speak}
            accessibilityRole="button"
            accessibilityLabel={t('common.listen')}
            hitSlop={spacing.md}
            style={{ marginStart: 'auto' }}
          >
            <Icon name="record_voice_over" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {item.agent ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
              paddingTop: spacing.xs,
              borderTopWidth: 1,
              borderTopColor: roles.cardBorder,
            }}
          >
            <Text variant="bodyMd" numberOfLines={1} style={{ flexShrink: 1 }}>
              {item.agent.name}
            </Text>
            {item.agent.verified ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
                <Icon name="verified" size={14} />
                <Text variant="labelSm" color={colors.primary}>
                  {t('property.verifiedAgent')}
                </Text>
              </View>
            ) : null}

            {onWhatsapp ? (
              <Pressable
                onPress={onWhatsapp}
                accessibilityRole="button"
                accessibilityLabel={t('property.whatsapp')}
                style={contactButton}
              >
                <Icon name="chat" size={18} color={colors.primary} />
              </Pressable>
            ) : null}
            {onCall ? (
              <Pressable
                onPress={onCall}
                accessibilityRole="button"
                accessibilityLabel={t('property.callAgent')}
                style={[contactButton, { backgroundColor: colors.primary }]}
              >
                <Icon name="call" size={18} color={colors.onPrimary} />
                <Text variant="labelSm" color={colors.onPrimary}>
                  {t('property.callAgent')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const contactButton = {
  minHeight: spacing.touchTarget,
  minWidth: spacing.touchTarget,
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  gap: spacing.base,
  paddingHorizontal: spacing.sm,
  borderRadius: radius.md,
  backgroundColor: colors.surfaceContainer,
  marginStart: spacing.base,
};

function Spec({ icon, value, label }: { icon: 'bed' | 'shower' | 'square_foot'; value: string; label: string }) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Icon name={icon} size={16} color={colors.onSurfaceVariant} />
      <NumberText variant="numberMd">{value}</NumberText>
    </View>
  );
}

/**
 * The pill over photography. Same role tokens as PricePill, but laid out for a
 * dark image behind it rather than a light card.
 */
function PriceOverlay({ pricePaisa, onRequest }: { pricePaisa: string | null; onRequest: boolean }) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <View
      style={{
        backgroundColor: onRequest ? colors.surfaceContainerLowest : roles.priceBackground,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.base,
        borderRadius: radius.full,
      }}
    >
      <Text
        variant={onRequest ? 'bodyMd' : 'numberMd'}
        color={onRequest ? colors.onSurface : roles.priceText}
      >
        {onRequest ? t('property.priceOnRequest') : format.price(toPaisa(pricePaisa))}
      </Text>
    </View>
  );
}
