import { useCallback, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, Share, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { LeadChannel } from '@ghar/shared';
import { colors, elevation, radius, roles, spacing } from '@ghar/ui';

import { api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { PropertyCard, type PropertySummary } from '../../src/components/PropertyCard';
import { NumberText, Text } from '../../src/components/Text';
import { useFormat } from '../../src/theme/useFormat';

interface AgentProfile {
  userId: string;
  agencyName: string | null;
  isVerified: boolean;
  city: string | null;
  bioUr: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  activeCount: number;
  closedCount: number;
  memberSince: string;
  user: { name: string | null; avatarUrl: string | null };
}

/**
 * An agent's public shopfront.
 *
 * Note what is NOT here: the phone number. A profile page is exactly the
 * surface someone would walk to harvest every agent in a city, so the number is
 * released one lead at a time by POST /leads — the same route the property
 * detail screen uses, and the same one that tells the agent someone asked.
 */
export default function AgentProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();

  const [tab, setTab] = useState<'active' | 'closed'>('active');

  const profile = useQuery({
    queryKey: ['agent', id],
    queryFn: () => api<AgentProfile>(`/agents/${id}`),
    enabled: Boolean(id),
  });

  const listings = useQuery({
    queryKey: ['agent-listings', id, tab],
    queryFn: () =>
      api<{ items: PropertySummary[] }>(`/agents/${id}/listings?closed=${tab === 'closed'}`),
    enabled: Boolean(id),
  });

  const lead = useMutation({
    mutationFn: (channel: LeadChannel) =>
      api<{ phone: string; whatsappPhone: string }>('/leads', {
        method: 'POST',
        // A lead against an agent still needs a property — the agent's newest
        // active listing is the one the customer is almost certainly looking at.
        body: { propertyId: listings.data?.items[0]?.id, channel },
      }),
  });

  const contact = useCallback(
    async (channel: LeadChannel) => {
      if (!listings.data?.items[0]) return;
      const result = await lead.mutateAsync(channel);
      void Linking.openURL(
        channel === LeadChannel.CALL
          ? `tel:${result.phone}`
          : `https://wa.me/${result.whatsappPhone.replace('+', '')}`,
      );
    },
    [lead, listings.data],
  );

  const data = profile.data;

  if (!data) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyLg" color={colors.onSurfaceVariant}>
          {profile.isLoading ? t('common.loading') : t('errors.notFound')}
        </Text>
      </View>
    );
  }

  const memberYear = new Date(data.memberSince).getFullYear();

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: spacing.touchTarget * 2.5 }}>
        {/* ── Header ────────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            padding: spacing.sm,
          }}
        >
          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel={t('common.back')}
            style={roundStyle}
          >
            <Icon name="arrow_forward" size={20} />
          </Pressable>
          <View style={{ flex: 1 }} />
          <Pressable
            onPress={() => void Share.share({ message: data.user.name ?? t('property.postedBy') })}
            accessibilityRole="button"
            accessibilityLabel={t('common.share')}
            style={roundStyle}
          >
            <Icon name="share" size={18} />
          </Pressable>
        </View>

        {/* ── Identity ──────────────────────────────────────────────────── */}
        <View style={{ alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.md }}>
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: radius.full,
              backgroundColor: colors.surfaceContainerHigh,
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {data.user.avatarUrl ? (
              <Image source={{ uri: data.user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
            ) : (
              <Icon name="person" size={40} />
            )}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
            {data.isVerified ? <Icon name="verified" size={18} label={t('property.verified')} /> : null}
            <Text variant="headlineMd">{data.user.name ?? t('property.postedBy')}</Text>
          </View>

          {data.agencyName ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
              <Icon name="business" size={16} color={colors.onSurfaceVariant} />
              <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                {data.agencyName}
              </Text>
            </View>
          ) : null}

          {data.ratingAvg !== null ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
              <Icon name="star" size={16} />
              <NumberText variant="numberMd">{format.count(data.ratingAvg)}</NumberText>
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {t('agent.reviews', { count: data.ratingCount })}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Stats ─────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', padding: spacing.md, gap: spacing.sm }}>
          <Stat value={format.count(data.activeCount)} label={t('agent.totalListings')} />
          <Stat value={format.count(data.closedCount)} label={t('agent.successfulSales')} />
          <Stat value={format.count(memberYear)} label={t('agent.memberSinceLabel')} />
        </View>

        {/* ── About ─────────────────────────────────────────────────────── */}
        {data.bioUr ? (
          <View style={{ paddingHorizontal: spacing.md, gap: spacing.xs }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
              <Icon name="info" size={18} color={colors.primary} />
              <Text variant="headlineSm">{t('agent.about')}</Text>
            </View>
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {data.bioUr}
            </Text>
          </View>
        ) : null}

        {/* ── Listings ──────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: spacing.xs, padding: spacing.md }}>
          <Tab label={t('agent.activeListings')} active={tab === 'active'} onPress={() => setTab('active')} />
          <Tab label={t('agent.soldListings')} active={tab === 'closed'} onPress={() => setTab('closed')} />
        </View>

        <View style={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
          {(listings.data?.items ?? []).map((item) => (
            <PropertyCard key={item.id} item={item} onPress={() => router.push(`/property/${item.id}`)} />
          ))}
          {listings.data && listings.data.items.length === 0 ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant} center>
              {t('agent.noListings')}
            </Text>
          ) : null}
        </View>
      </ScrollView>

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
            onPress={() => void contact(LeadChannel.WHATSAPP)}
            icon={<Icon name="chat" size={18} color={colors.secondary} />}
          />
        </View>
        <View style={{ flex: 1.4 }}>
          <Button
            label={t('agent.callAgent')}
            loading={lead.isPending}
            onPress={() => void contact(LeadChannel.CALL)}
            icon={<Icon name="call" size={18} color={colors.onPrimary} />}
          />
        </View>
      </View>
    </View>
  );
}

const roundStyle = {
  width: spacing.touchTarget,
  height: spacing.touchTarget,
  borderRadius: radius.full,
  backgroundColor: colors.surfaceContainerLowest,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
};

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        gap: spacing.base,
        backgroundColor: roles.cardBackground,
        borderWidth: 1,
        borderColor: roles.cardBorder,
        borderRadius: radius.lg,
        paddingVertical: spacing.sm,
      }}
      accessible
      accessibilityLabel={`${label}: ${value}`}
    >
      <NumberText variant="numberLg" color={colors.primary}>
        {value}
      </NumberText>
      <Text variant="labelSm" color={colors.onSurfaceVariant} center>
        {label}
      </Text>
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      style={{
        flex: 1,
        minHeight: spacing.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.md,
        backgroundColor: active ? colors.primary : colors.surfaceContainer,
      }}
    >
      <Text variant="bodyMd" color={active ? colors.onPrimary : colors.onSurface}>
        {label}
      </Text>
    </Pressable>
  );
}
