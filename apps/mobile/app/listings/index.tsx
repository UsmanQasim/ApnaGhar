import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { PropertyStatus, PropertyVisibility } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { PropertyCard, type PropertySummary } from '../../src/components/PropertyCard';
import { Text } from '../../src/components/Text';

const TABS: ReadonlyArray<{ status: PropertyStatus | null; label: string }> = [
  { status: null, label: 'dashboard.filterAll' },
  { status: PropertyStatus.ACTIVE, label: 'dashboard.tabActive' },
  { status: PropertyStatus.PENDING_PAYMENT, label: 'dashboard.tabPending' },
  { status: PropertyStatus.SOLD, label: 'dashboard.tabSold' },
  { status: PropertyStatus.RENTED, label: 'dashboard.tabRented' },
  { status: PropertyStatus.DRAFT, label: 'dashboard.tabDraft' },
];

/**
 * The agent's own listings.
 *
 * Shows drafts and hidden listings, which no other surface does — GET /listings
 * is the agent-scoped route, distinct from /search. Marking a property sold
 * here is the single most valuable action on the screen, because it frees a
 * quota slot: an agent sitting at 3 of 3 who has actually sold one is being
 * charged Rs 50 for a listing he doesn't need.
 */
export default function MyListingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<PropertyStatus | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const listings = useQuery({
    queryKey: ['my-listings', status],
    queryFn: () =>
      api<{ items: PropertySummary[] }>(`/listings${status ? `?status=${status}` : ''}`),
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    // The quota tile and the billing card both move when a listing closes.
    void queryClient.invalidateQueries({ queryKey: ['billing-summary'] });
    void queryClient.invalidateQueries({ queryKey: ['agent-stats'] });
  }, [queryClient]);

  const outcome = useMutation({
    mutationFn: ({ id, result }: { id: string; result: 'sold' | 'rented' }) =>
      api(`/listings/${id}/outcome`, { method: 'POST', body: { outcome: result } }),
    onSuccess: () => {
      invalidate();
      Alert.alert(t('dashboard.outcomeSaved'));
    },
  });

  const visibility = useMutation({
    mutationFn: ({ id, value }: { id: string; value: PropertyVisibility }) =>
      api(`/listings/${id}/visibility`, { method: 'PATCH', body: { visibility: value } }),
    onSuccess: invalidate,
  });

  const confirmOutcome = useCallback(
    (item: PropertySummary, result: 'sold' | 'rented') => {
      setMenuFor(null);
      Alert.alert(
        t(result === 'sold' ? 'dashboard.markSoldConfirm' : 'dashboard.markRentedConfirm'),
        item.titleUr,
        [
          { text: t('common.no'), style: 'cancel' },
          { text: t('common.yes'), onPress: () => outcome.mutate({ id: item.id, result }) },
        ],
      );
    },
    [outcome, t],
  );

  const items = listings.data?.items ?? [];

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          padding: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: roles.cardBorder,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{ minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrow_forward" size={22} />
        </Pressable>
        <Text variant="headlineSm" style={{ flex: 1 }}>
          {t('dashboard.myListings')}
        </Text>
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={TABS}
        keyExtractor={(tab) => tab.status ?? 'all'}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: spacing.xs, padding: spacing.sm }}
        renderItem={({ item: tab }) => {
          const active = status === tab.status;
          return (
            <Pressable
              onPress={() => setStatus(tab.status)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={{
                minHeight: spacing.touchTarget,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radius.full,
                borderWidth: 1,
                borderColor: active ? colors.primary : roles.cardBorder,
                backgroundColor: active ? colors.primaryFixed : roles.cardBackground,
              }}
            >
              <Text variant="bodyMd">{t(tab.label)}</Text>
            </Pressable>
          );
        }}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <View style={{ gap: spacing.xs }}>
            <PropertyCard
              item={item}
              onPress={() => router.push(`/property/${item.id}`)}
              trailing={
                <Pressable
                  onPress={() => setMenuFor(menuFor === item.id ? null : item.id)}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.more')}
                  hitSlop={spacing.sm}
                  style={{ minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text variant="headlineSm">⋮</Text>
                </Pressable>
              }
            />

            {menuFor === item.id ? (
              <View
                style={{
                  gap: spacing.xs,
                  padding: spacing.sm,
                  borderRadius: radius.lg,
                  backgroundColor: colors.surfaceContainerLow,
                  borderWidth: 1,
                  borderColor: roles.cardBorder,
                }}
              >
                <Button
                  label={t('dashboard.editListing')}
                  variant="ghost"
                  onPress={() => router.push(`/(tabs)/post?draft=${item.id}`)}
                />
                <Button
                  label={t('dashboard.shareListing')}
                  variant="ghost"
                  onPress={() => router.push(`/share/${item.id}`)}
                />
                <Button
                  label={t('visibility.hiddenFromAgents')}
                  variant="ghost"
                  onPress={() =>
                    visibility.mutate({ id: item.id, value: PropertyVisibility.HIDDEN_FROM_AGENTS })
                  }
                />
                {item.status !== PropertyStatus.SOLD && item.status !== PropertyStatus.RENTED ? (
                  <>
                    <Button
                      label={t('dashboard.markSold')}
                      variant="secondary"
                      onPress={() => confirmOutcome(item, 'sold')}
                    />
                    <Button
                      label={t('dashboard.markRented')}
                      variant="secondary"
                      onPress={() => confirmOutcome(item, 'rented')}
                    />
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={
          listings.isLoading ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {t('common.loading')}
            </Text>
          ) : (
            <View style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl }}>
              <Icon name="format_list_bulleted" size={40} color={colors.onSurfaceVariant} />
              <Text variant="headlineSm">{t('dashboard.noListings')}</Text>
              <Text variant="bodyMd" color={colors.onSurfaceVariant} center>
                {t('dashboard.noListingsHint')}
              </Text>
              <Button
                label={t('dashboard.createFirst')}
                fullWidth={false}
                onPress={() => router.push('/(tabs)/post')}
              />
            </View>
          )
        }
      />
    </View>
  );
}
