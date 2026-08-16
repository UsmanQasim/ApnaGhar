import { useCallback, useEffect, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';

import {
  AreaUnit,
  LeadChannel,
  PriceVisibility,
  PropertyPurpose,
  PropertyStatus,
  PropertyType,
  ViewSource,
} from '@ghar/shared';
import { colors, elevation, radius, roles, spacing } from '@ghar/ui';

import { api, toPaisa } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { NumberText, Text } from '../../src/components/Text';
import { useAuthStore } from '../../src/store/auth';
import { useFormat } from '../../src/theme/useFormat';

interface Media {
  id: string;
  kind: 'image' | 'video';
  playbackUrl: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
}

interface PropertyDetail {
  id: string;
  purpose: PropertyPurpose;
  type: PropertyType;
  status: PropertyStatus;
  titleUr: string;
  descriptionUr: string | null;
  pricePaisa: string | null;
  priceVisibility: PriceVisibility;
  rentPeriod: 'month' | 'year' | null;
  areaValue: number;
  areaUnit: AreaUnit;
  bedrooms: number | null;
  bathrooms: number | null;
  furnished: boolean;
  addressText: string | null;
  city: string;
  locality: string | null;
  viewCount: number;
  media: Media[];
  agentId: string;
  agent: {
    isVerified: boolean;
    agencyName: string | null;
    user: { name: string | null; avatarUrl: string | null };
  };
}

interface LeadResponse {
  agentName: string | null;
  phone: string;
  whatsappPhone: string;
}

/**
 * A single property.
 *
 * The contact buttons are the point of the screen — everything above them
 * exists to get the buyer to tap one. They are pinned to the bottom rather
 * than placed after the description, because a buyer who has decided from the
 * video should never have to scroll past 400 words of Urdu prose to call.
 */
export default function PropertyDetailScreen() {
  const { id, contact } = useLocalSearchParams<{ id: string; contact?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const signedIn = useAuthStore((s) => s.accessToken !== null);

  const [saved, setSaved] = useState(false);

  const property = useQuery({
    queryKey: ['property', id],
    queryFn: () => api<PropertyDetail>(`/listings/${id}`),
    enabled: Boolean(id),
  });

  // Recorded once per open, and deliberately not awaited — a failed analytics
  // write must never keep the property from rendering.
  useEffect(() => {
    if (!id) return;
    void api('/views', {
      method: 'POST',
      body: { propertyId: id, source: ViewSource.SEARCH },
    }).catch(() => undefined);
  }, [id]);

  /**
   * Creating the lead IS how the number is obtained — there is no route that
   * returns an agent's phone without recording who asked for it. See
   * EngagementService.createLead.
   */
  const lead = useMutation({
    mutationFn: (channel: LeadChannel) =>
      api<LeadResponse>('/leads', { method: 'POST', body: { propertyId: id, channel } }),
  });

  const favorite = useMutation({
    mutationFn: () => api<{ saved: boolean }>(`/favorites/${id}`, { method: 'POST' }),
    onSuccess: (result) => setSaved(result.saved),
  });

  const call = useCallback(async () => {
    const result = await lead.mutateAsync(LeadChannel.CALL);
    void Linking.openURL(`tel:${result.phone}`);
  }, [lead]);

  const whatsapp = useCallback(async () => {
    const result = await lead.mutateAsync(LeadChannel.WHATSAPP);
    const number = result.whatsappPhone.replace('+', '');
    void Linking.openURL(`https://wa.me/${number}`);
  }, [lead]);

  // Deep link from a result card: /property/x?contact=tel opens the dialer as
  // soon as the lead is recorded, so the card's کال button is one tap, not two.
  useEffect(() => {
    if (contact === 'tel') void call();
    if (contact === 'whatsapp') void whatsapp();
    // Intentionally only on mount for a given contact intent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact]);

  const data = property.data;

  const speak = useCallback(() => {
    if (!data) return;
    const parts = [
      data.titleUr,
      [data.locality, data.city].filter(Boolean).join('، '),
      format.area(data.areaValue, data.areaUnit),
      data.priceVisibility === PriceVisibility.ON_REQUEST
        ? t('property.priceOnRequest')
        : format.price(toPaisa(data.pricePaisa)),
      data.descriptionUr ?? '',
    ];
    Speech.speak(parts.filter(Boolean).join('۔ '), { language: 'ur-PK', rate: 0.9 });
  }, [data, format, t]);

  if (property.isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyLg" color={colors.onSurfaceVariant}>
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
        <Icon name="info" size={40} color={colors.onSurfaceVariant} />
        <Text variant="headlineSm" center>
          {t('property.notFound')}
        </Text>
        <Button label={t('common.back')} variant="secondary" fullWidth={false} onPress={() => router.back()} />
      </View>
    );
  }

  const hero = data.media[0];
  const place = [data.addressText, data.locality, data.city].filter(Boolean).join('، ');
  const onRequest = data.priceVisibility === PriceVisibility.ON_REQUEST || data.pricePaisa === null;
  const closed = data.status === PropertyStatus.SOLD || data.status === PropertyStatus.RENTED;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.touchTarget * 2.5 }}>
        {/* ── Media ─────────────────────────────────────────────────────── */}
        <View style={{ height: 280, backgroundColor: colors.surfaceContainerHigh }}>
          {hero?.thumbnailUrl ? (
            <Image
              source={{ uri: hero.thumbnailUrl }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="cover"
            />
          ) : null}

          {hero?.kind === 'video' ? (
            <Pressable
              onPress={() => hero.playbackUrl && void Linking.openURL(hero.playbackUrl)}
              accessibilityRole="button"
              accessibilityLabel={t('property.videoAvailable')}
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                start: 0,
                end: 0,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon name="play_circle" size={56} />
            </Pressable>
          ) : null}

          {/* Header controls float over the media, as in the mock. */}
          <View
            style={{
              position: 'absolute',
              top: spacing.xl,
              start: spacing.md,
              end: spacing.md,
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.xs,
            }}
          >
            <Round label={t('common.back')} onPress={() => router.back()}>
              <Icon name="arrow_forward" size={20} />
            </Round>
            <View style={{ flex: 1 }} />
            <Round
              label={t('common.share')}
              onPress={() => void Share.share({ message: `${data.titleUr}\n${place}` })}
            >
              <Icon name="share" size={18} />
            </Round>
            {signedIn ? (
              <Round
                label={saved ? t('property.saved') : t('property.saveListing')}
                onPress={() => favorite.mutate()}
              >
                <Icon name={saved ? 'favorite' : 'favorite_border'} size={18} />
              </Round>
            ) : null}
          </View>
        </View>

        <View style={{ padding: spacing.md, gap: spacing.md }}>
          {closed ? (
            <View style={{ backgroundColor: colors.surfaceContainerHighest, borderRadius: radius.md, padding: spacing.sm }}>
              <Text variant="bodyMd">
                {t(data.status === PropertyStatus.SOLD ? 'property.soldBanner' : 'property.rentedBanner')}
              </Text>
            </View>
          ) : null}

          {/* ── Price + title ───────────────────────────────────────────── */}
          <View style={{ gap: spacing.xs }}>
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: onRequest ? colors.surfaceContainerHighest : roles.priceBackground,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.xs,
                borderRadius: radius.full,
              }}
            >
              <Text
                variant={onRequest ? 'bodyLg' : 'numberLg'}
                color={onRequest ? colors.onSurface : roles.priceText}
              >
                {onRequest ? t('property.priceOnRequest') : format.price(toPaisa(data.pricePaisa))}
              </Text>
            </View>

            {data.purpose === PropertyPurpose.RENT && data.rentPeriod ? (
              <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                {t(data.rentPeriod === 'month' ? 'property.perMonth' : 'property.perYear')}
              </Text>
            ) : null}

            <Text variant="headlineMd">{data.titleUr}</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing.base,
                  backgroundColor: colors.secondaryContainer,
                  paddingHorizontal: spacing.sm,
                  paddingVertical: spacing.base,
                  borderRadius: radius.full,
                }}
              >
                <Icon name="sell" size={14} />
                <Text variant="labelSm">
                  {t(data.purpose === PropertyPurpose.SALE ? 'property.forSale' : 'property.forRent')}
                </Text>
              </View>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('property.viewsCount', { count: data.viewCount })}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
              <Icon name="location_on" size={18} color={colors.onSurfaceVariant} />
              <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
                {place}
              </Text>
            </View>
          </View>

          {/* ── Specs ───────────────────────────────────────────────────── */}
          <View
            style={{
              flexDirection: 'row',
              backgroundColor: roles.cardBackground,
              borderWidth: 1,
              borderColor: roles.cardBorder,
              borderRadius: radius.lg,
              paddingVertical: spacing.sm,
            }}
          >
            {data.bedrooms !== null ? (
              <SpecCell icon="bed" value={format.count(data.bedrooms)} label={t('property.bedrooms')} />
            ) : null}
            {data.bathrooms !== null ? (
              <SpecCell icon="shower" value={format.count(data.bathrooms)} label={t('property.bathrooms')} />
            ) : null}
            <SpecCell
              icon="square_foot"
              value={format.area(data.areaValue, data.areaUnit)}
              label={t('property.area')}
            />
          </View>

          {/* ── Agent ───────────────────────────────────────────────────── */}
          <Pressable
            onPress={() => router.push(`/agent/${data.agentId}`)}
            accessibilityRole="button"
            accessibilityLabel={data.agent.user.name ?? t('property.postedBy')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.sm,
              backgroundColor: roles.cardBackground,
              borderWidth: 1,
              borderColor: roles.cardBorder,
              borderRadius: radius.lg,
              padding: spacing.sm,
              minHeight: spacing.touchTarget,
            }}
          >
            <View
              style={{
                width: spacing.touchTarget,
                height: spacing.touchTarget,
                borderRadius: radius.full,
                backgroundColor: colors.surfaceContainerHigh,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {data.agent.user.avatarUrl ? (
                <Image source={{ uri: data.agent.user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Icon name="person" size={22} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyLg">{data.agent.user.name ?? t('property.postedBy')}</Text>
              {data.agent.agencyName ? (
                <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                  {data.agent.agencyName}
                </Text>
              ) : null}
            </View>
            {data.agent.isVerified ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
                <Icon name="verified_user" size={16} />
                <Text variant="labelSm" color={colors.primary}>
                  {t('property.verified')}
                </Text>
              </View>
            ) : null}
          </Pressable>

          {/* ── Description + TTS ───────────────────────────────────────── */}
          {data.descriptionUr ? (
            <View style={{ gap: spacing.xs }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text variant="headlineSm" style={{ flex: 1 }}>
                  {t('property.details')}
                </Text>
                {/* TTS beside the description, per DESIGN.md — the whole
                    listing is read aloud, not just this paragraph. */}
                <Pressable
                  onPress={speak}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.listen')}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: spacing.base,
                    minHeight: spacing.touchTarget,
                    paddingHorizontal: spacing.sm,
                    borderRadius: radius.full,
                    backgroundColor: colors.primaryFixed,
                  }}
                >
                  <Icon name="record_voice_over" size={18} />
                  <Text variant="bodyMd">{t('common.listen')}</Text>
                </Pressable>
              </View>
              <Text variant="bodyMd">{data.descriptionUr}</Text>
            </View>
          ) : null}

          {/* ── Map ─────────────────────────────────────────────────────── */}
          <View style={{ gap: spacing.xs }}>
            <Text variant="headlineSm">{t('property.location')}</Text>
            <Pressable
              onPress={() =>
                void Linking.openURL(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`,
                )
              }
              accessibilityRole="button"
              accessibilityLabel={t('property.expandMap')}
              style={{
                height: 140,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: roles.cardBorder,
                backgroundColor: colors.surfaceContainer,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.base,
              }}
            >
              {/* No map SDK is bundled — react-native-maps is a native
                  dependency and this screen has to work in Expo Go today. The
                  tap hands off to the device's map app, which the target user
                  already has and already trusts. */}
              <Icon name="map" size={32} />
              <Text variant="bodyMd" color={colors.primary}>
                {t('property.expandMap')}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ── Contact bar ─────────────────────────────────────────────────── */}
      <View
        style={[
          {
            position: 'absolute',
            bottom: 0,
            start: 0,
            end: 0,
            flexDirection: 'row',
            gap: spacing.sm,
            padding: spacing.sm,
            backgroundColor: roles.cardBackground,
            borderTopWidth: 1,
            borderTopColor: roles.cardBorder,
          },
          elevation.fab,
        ]}
      >
        <View style={{ flex: 1 }}>
          <Button
            label={t('property.whatsapp')}
            variant="secondary"
            loading={lead.isPending}
            onPress={() => void whatsapp()}
            icon={<Icon name="chat" size={18} color={colors.secondary} />}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            label={t('property.callAgent')}
            loading={lead.isPending}
            onPress={() => void call()}
            icon={<Icon name="call" size={18} color={colors.onPrimary} />}
          />
        </View>
      </View>
    </View>
  );
}

function Round({
  children,
  label,
  onPress,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: spacing.touchTarget,
        height: spacing.touchTarget,
        borderRadius: radius.full,
        backgroundColor: colors.surfaceContainerLowest,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </Pressable>
  );
}

function SpecCell({
  icon,
  value,
  label,
}: {
  icon: 'bed' | 'shower' | 'square_foot';
  value: string;
  label: string;
}) {
  return (
    <View
      style={{ flex: 1, alignItems: 'center', gap: spacing.base }}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <Icon name={icon} size={20} color={colors.primary} />
      <NumberText variant="numberLg">{value}</NumberText>
      <Text variant="labelSm" color={colors.onSurfaceVariant}>
        {label}
      </Text>
    </View>
  );
}
