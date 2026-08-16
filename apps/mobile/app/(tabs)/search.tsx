import { useCallback, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { PropertyType } from '@ghar/shared';
import { colors, elevation, radius, roles, spacing, typography } from '@ghar/ui';

import { api } from '../../src/api/client';
import { Icon, type IconName } from '../../src/components/Icon';
import { PropertyCard, type PropertySummary } from '../../src/components/PropertyCard';
import { Text } from '../../src/components/Text';
import { useVoiceSearch } from '../../src/search/useVoiceSearch';
import { useSearchStore } from '../../src/store/search';

/** Category tiles. Icon first, Urdu label second — DESIGN.md bans text-only nav. */
const CATEGORIES: ReadonlyArray<{ type: PropertyType; icon: IconName; key: string }> = [
  { type: PropertyType.HOUSE, icon: 'home', key: 'property.types.house' },
  { type: PropertyType.FLAT, icon: 'apartment', key: 'property.types.flat' },
  { type: PropertyType.PLOT, icon: 'landscape', key: 'property.types.plot' },
  { type: PropertyType.SHOP, icon: 'storefront', key: 'property.types.shop' },
];

/**
 * The search entry point.
 *
 * Not a results page: results live at /search/results. This screen's job is to
 * let a buyer start a search in ONE tap — by category, by "near me", or by
 * voice — before they ever touch the keyboard. Typing Urdu on a cheap Android
 * keyboard is slow, so typing is the fallback here, not the primary path.
 */
export default function SearchScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const voice = useVoiceSearch();

  const filters = useSearchStore((s) => s.filters);
  const setFilters = useSearchStore((s) => s.set);
  const toggleType = useSearchStore((s) => s.toggleType);

  const [draft, setDraft] = useState(filters.q);
  const [voiceNote, setVoiceNote] = useState<string | null>(null);

  const latest = useQuery({
    queryKey: ['search-latest'],
    queryFn: () =>
      api<{ items: PropertySummary[] }>('/search', {
        method: 'POST',
        body: { sort: 'newest', limit: 6 },
      }),
  });

  const submit = useCallback(
    (query: string) => {
      setFilters({ q: query });
      router.push('/search/results');
    },
    [setFilters, router],
  );

  const onVoice = useCallback(async () => {
    const heard = await voice.start();
    if (heard === null) {
      setVoiceNote(t('search.voiceUnavailable'));
      return;
    }
    setDraft(heard);
    submit(heard);
  }, [voice, submit, t]);

  const onCategory = useCallback(
    (type: PropertyType) => {
      toggleType(type);
      router.push('/search/results');
    },
    [toggleType, router],
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xl * 3 }}>
        {/* ── Query row ─────────────────────────────────────────────────── */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            backgroundColor: roles.cardBackground,
            borderWidth: 1,
            borderColor: roles.cardBorder,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm,
            minHeight: spacing.touchTarget,
          }}
        >
          <Icon name="search" size={20} color={colors.onSurfaceVariant} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => submit(draft)}
            returnKeyType="search"
            placeholder={t('search.placeholder')}
            placeholderTextColor={colors.onSurfaceVariant}
            accessibilityLabel={t('search.placeholder')}
            style={{
              flex: 1,
              minHeight: spacing.touchTarget,
              fontFamily: typography.bodyMd.fontFamily,
              fontSize: typography.bodyMd.fontSize,
              color: colors.onSurface,
              // 'auto' rather than 'right': the field holds Urdu prose most of
              // the time but a bare digit or a Latin locality some of the time,
              // and each should sit on its own natural side.
              textAlign: 'auto',
            }}
          />
          <Pressable
            onPress={() => void onVoice()}
            accessibilityRole="button"
            accessibilityLabel={t('search.speakToSearch')}
            hitSlop={spacing.sm}
          >
            <Icon name="mic" size={22} color={colors.primary} />
          </Pressable>
        </View>

        {voiceNote ? (
          <Text variant="bodyMd" color={colors.onErrorContainer} style={noticeStyle}>
            {voiceNote}
          </Text>
        ) : null}

        {/* ── Location shortcuts ────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
          <Chip
            icon="my_location"
            label={t('search.nearMe')}
            active={filters.near !== null}
            onPress={() =>
              // Coordinates are not read here: expo-location is not a dependency
              // yet, and asking for a permission the app cannot use is worse
              // than not asking. The API accepts `near` the moment it can.
              setFilters({ near: null, sort: filters.near ? 'relevance' : 'nearest' })
            }
          />
          <Chip
            icon="location_on"
            label={filters.city ?? t('search.changeArea')}
            active={filters.city !== null}
            onPress={() => router.push('/search/results')}
          />
        </View>

        {/* ── Categories ────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {CATEGORIES.map((category) => (
            <Pressable
              key={category.type}
              onPress={() => onCategory(category.type)}
              accessibilityRole="button"
              accessibilityState={{ selected: filters.type.includes(category.type) }}
              style={{
                flex: 1,
                minHeight: spacing.touchTarget * 1.6,
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.base,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: filters.type.includes(category.type) ? colors.primary : roles.cardBorder,
                backgroundColor: filters.type.includes(category.type)
                  ? colors.primaryFixed
                  : roles.cardBackground,
              }}
            >
              <Icon name={category.icon} size={26} />
              <Text variant="labelSm">{t(category.key)}</Text>
            </Pressable>
          ))}
        </View>

        {/* ── Latest ────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text variant="headlineSm" style={{ flex: 1 }}>
            {t('search.recentResults')}
          </Text>
          <Pressable
            onPress={() => router.push('/search/results')}
            accessibilityRole="button"
            accessibilityLabel={t('common.seeAll')}
            style={{ minHeight: spacing.touchTarget, justifyContent: 'center', paddingHorizontal: spacing.xs }}
          >
            <Text variant="bodyMd" color={colors.primary}>
              {t('common.seeAll')}
            </Text>
          </Pressable>
        </View>

        {(latest.data?.items ?? []).map((item) => (
          <PropertyCard
            key={item.id}
            item={item}
            onPress={() => router.push(`/property/${item.id}`)}
          />
        ))}

        {latest.isLoading ? (
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('common.loading')}
          </Text>
        ) : null}
      </ScrollView>

      {/* Voice FAB — one of only two elevated surfaces in the whole design
          system (DESIGN.md §Elevation). It floats because it must be findable
          without reading anything on the page. */}
      <Pressable
        onPress={() => void onVoice()}
        accessibilityRole="button"
        accessibilityLabel={t('search.speakToSearch')}
        style={({ pressed }) => [
          {
            position: 'absolute',
            bottom: spacing.lg,
            end: spacing.md,
            width: spacing.touchTarget + spacing.md,
            height: spacing.touchTarget + spacing.md,
            borderRadius: radius.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.9 : 1,
          },
          elevation.fab,
        ]}
      >
        <Icon name="mic" size={26} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}

const noticeStyle = {
  backgroundColor: colors.errorContainer,
  borderRadius: radius.md,
  padding: spacing.sm,
};

function Chip({
  icon,
  label,
  active,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.base,
        minHeight: spacing.touchTarget,
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primary : roles.cardBorder,
        backgroundColor: active ? colors.primaryFixed : roles.cardBackground,
      }}
    >
      <Icon name={icon} size={18} />
      <Text variant="bodyMd">{label}</Text>
    </Pressable>
  );
}
