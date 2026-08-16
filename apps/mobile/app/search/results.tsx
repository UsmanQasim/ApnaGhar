import { useCallback, useState } from 'react';
import { FlatList, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { colors, elevation, radius, roles, spacing, typography } from '@ghar/ui';

import { api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { FilterSheet } from '../../src/components/FilterSheet';
import { Icon } from '../../src/components/Icon';
import { PropertyCard, type PropertySummary } from '../../src/components/PropertyCard';
import { Text } from '../../src/components/Text';
import { useFormat } from '../../src/theme/useFormat';
import { useVoiceSearch } from '../../src/search/useVoiceSearch';
import { toSearchBody, useSearchStore } from '../../src/store/search';

interface Page {
  items: PropertySummary[];
  nextCursor: string | null;
  total?: number;
}

/**
 * Search results.
 *
 * Contact buttons sit on the CARD, not only on the detail screen: the mock puts
 * کال right there, and for an agent's business the call is the conversion. A
 * buyer who has already decided from the photo and the price should not have to
 * open a second screen to dial.
 */
export default function SearchResultsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const voice = useVoiceSearch();

  const filters = useSearchStore((s) => s.filters);
  const set = useSearchStore((s) => s.set);
  const activeCount = useSearchStore((s) => s.activeCount);

  const [draft, setDraft] = useState(filters.q);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const results = useInfiniteQuery({
    queryKey: ['search', filters],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<Page>('/search', { method: 'POST', body: toSearchBody(filters, pageParam) }),
    getNextPageParam: (last) => last.nextCursor,
  });

  const items = results.data?.pages.flatMap((page) => page.items) ?? [];
  const total = results.data?.pages[0]?.total ?? null;

  const dial = useCallback((scheme: 'tel' | 'whatsapp', id: string) => {
    // The agent's number is never in the list payload — a scraped phone list is
    // exactly what an agent fears most. Contact goes through the detail screen,
    // which records the lead and returns the number for that one tap.
    router.push(`/property/${id}?contact=${scheme}`);
  }, [router]);

  const filterCount = activeCount();

  return (
    <View style={{ flex: 1 }}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          padding: spacing.sm,
          backgroundColor: roles.cardBackground,
          borderBottomWidth: 1,
          borderBottomColor: roles.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={spacing.sm}
          style={{ minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Under RTL "back" points forward-right; the mock shows arrow_forward
              for exactly this reason. */}
          <Icon name="arrow_forward" size={22} />
        </Pressable>

        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.xs,
            borderWidth: 1,
            borderColor: roles.cardBorder,
            borderRadius: radius.md,
            paddingHorizontal: spacing.sm,
          }}
        >
          <Icon name="search" size={18} color={colors.onSurfaceVariant} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => set({ q: draft })}
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
              textAlign: 'auto',
            }}
          />
          <Pressable
            onPress={() => void voice.start()}
            accessibilityRole="button"
            accessibilityLabel={t('search.speakToSearch')}
            hitSlop={spacing.sm}
          >
            <Icon name="mic" size={20} color={colors.primary} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => setFiltersOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={t('search.filters')}
          style={{
            minWidth: spacing.touchTarget,
            minHeight: spacing.touchTarget,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="tune" size={22} />
          {filterCount > 0 ? (
            <View
              style={{
                position: 'absolute',
                top: spacing.base,
                end: spacing.base,
                minWidth: 18,
                height: 18,
                borderRadius: radius.full,
                backgroundColor: colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 4,
              }}
            >
              <Text variant="labelSm" color={colors.onPrimary}>
                {format.count(filterCount)}
              </Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* ── Results ───────────────────────────────────────────────────── */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl * 3 }}
        onEndReached={() => {
          if (results.hasNextPage && !results.isFetchingNextPage) void results.fetchNextPage();
        }}
        onEndReachedThreshold={1.5}
        ListHeaderComponent={
          total !== null ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ marginBottom: spacing.xs }}>
              {t('search.resultsCount', { count: total })}
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <PropertyCard
            item={item}
            onPress={() => router.push(`/property/${item.id}`)}
            onCall={item.agent ? () => dial('tel', item.id) : undefined}
            onWhatsapp={item.agent ? () => dial('whatsapp', item.id) : undefined}
          />
        )}
        ListEmptyComponent={
          results.isLoading ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {t('common.loading')}
            </Text>
          ) : (
            <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
              <Icon name="search" size={40} color={colors.onSurfaceVariant} />
              <Text variant="headlineSm">{t('search.noResults')}</Text>
              <Text variant="bodyMd" color={colors.onSurfaceVariant} center>
                {t('search.noResultsHint')}
              </Text>
              <Button
                label={t('search.clearFilters')}
                variant="secondary"
                fullWidth={false}
                onPress={() => useSearchStore.getState().clear()}
              />
            </View>
          )
        }
        ListFooterComponent={
          results.isFetchingNextPage ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant} center>
              {t('search.loadingMore')}
            </Text>
          ) : null
        }
      />

      <Pressable
        onPress={() => void voice.start()}
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

      <FilterSheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} resultCount={total} />
    </View>
  );
}
