import { Alert, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { PLANS, PlanCode, premiumBreakEvenListings } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { api, toPaisa } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { NumberText, Text } from '../../src/components/Text';
import { type BillingSummary } from '../../src/billing/types';
import { useFormat } from '../../src/theme/useFormat';

const BENEFITS = [
  'premium.unlimitedListings',
  'premium.topPlacement',
  'premium.insights',
  'premium.verifiedBadge',
  'premium.flyer',
  'premium.bulkTools',
  'premium.prioritySupport',
] as const;

/**
 * The premium upgrade screen.
 *
 * Two things here are computed, never written down:
 *
 *  • the listing count where premium stops costing more — `premiumBreakEven
 *    Listings()`. It is 21 today. If someone caps premium's listings it
 *    becomes Infinity and the shared package's test fails, rather than this
 *    screen quietly telling agents something untrue (README §2).
 *  • the saving, which comes from the SERVER's view of what the agent actually
 *    spent. `premiumSavingPaisa` is null when premium would not have saved him
 *    money, and null means show no saving at all — not a smaller one.
 */
export default function PremiumScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const queryClient = useQueryClient();

  const summary = useQuery({
    queryKey: ['billing-summary'],
    queryFn: () => api<BillingSummary>('/billing/summary'),
  });

  const changePlan = useMutation({
    mutationFn: (plan: PlanCode) =>
      api('/billing/plan', { method: 'POST', body: { plan, immediate: plan === PlanCode.PREMIUM } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing-summary'] });
      router.back();
    },
  });

  const data = summary.data;
  const isPremium = data?.plan === PlanCode.PREMIUM;
  const breakEven = premiumBreakEvenListings();

  const confirm = (plan: PlanCode) =>
    Alert.alert(
      t(plan === PlanCode.PREMIUM ? 'premium.confirmUpgrade' : 'premium.switchToBasic'),
      format.priceExact(PLANS[plan].pricePaisa),
      [
        { text: t('common.no'), style: 'cancel' },
        { text: t('common.yes'), onPress: () => changePlan.mutate(plan) },
      ],
    );

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          style={{ minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="arrow_forward" size={22} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text variant="headlineMd">{t('premium.title')}</Text>
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('premium.subtitle')}
          </Text>
        </View>
      </View>

      {/* ── The honest saving, or nothing ─────────────────────────────── */}
      {data?.premiumSavingPaisa ? (
        <View style={[cardStyle, { backgroundColor: colors.primaryFixed, borderColor: colors.primary }]}>
          <Text variant="bodyLg">
            {t('premium.savedLastMonths', {
              amount: format.priceExact(toPaisa(data.premiumSavingPaisa)),
              months: data.recentCycles,
            })}
          </Text>
        </View>
      ) : data && !isPremium ? (
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <Icon name="info" size={18} />
            {/* Telling an agent premium is NOT worth it today is the reason he
                believes us when it is. */}
            <Text variant="bodyMd" style={{ flex: 1 }}>
              {t('premium.noSaving')}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Plans ─────────────────────────────────────────────────────── */}
      <View style={{ gap: spacing.sm }}>
        {[PlanCode.BASIC, PlanCode.PREMIUM].map((plan) => {
          const definition = PLANS[plan];
          const current = data?.plan === plan;

          return (
            <View
              key={plan}
              style={[
                cardStyle,
                current ? { borderColor: colors.primary, borderWidth: 2 } : null,
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text variant="headlineSm" style={{ flex: 1 }}>
                  {t(plan === PlanCode.PREMIUM ? 'billing.planPremium' : 'billing.planBasic')}
                </Text>
                {current ? (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: spacing.base,
                      backgroundColor: colors.primaryFixed,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: spacing.base,
                      borderRadius: radius.full,
                    }}
                  >
                    <Icon name="check" size={14} />
                    <Text variant="labelSm">{t('premium.currentPlanLabel')}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
                <NumberText variant="numberLg" color={colors.primary}>
                  {format.priceExact(definition.pricePaisa)}
                </NumberText>
                <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                  {t('billing.perMonth')}
                </Text>
              </View>

              <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                {definition.includedListings === null
                  ? t('premium.unlimitedListings')
                  : t('billing.includedListings', { count: definition.includedListings })}
              </Text>

              {!current ? (
                <Button
                  label={t(plan === PlanCode.PREMIUM ? 'premium.upgrade' : 'premium.switchToBasic')}
                  variant={plan === PlanCode.PREMIUM ? 'primary' : 'secondary'}
                  loading={changePlan.isPending}
                  onPress={() => confirm(plan)}
                />
              ) : null}
            </View>
          );
        })}
      </View>

      {/* Computed, not written down. */}
      {Number.isFinite(breakEven) ? (
        <Text variant="bodyMd" color={colors.onSurfaceVariant} center>
          {t('premium.breakEven', { count: breakEven })}
        </Text>
      ) : null}

      {/* ── What you get ──────────────────────────────────────────────── */}
      <View style={cardStyle}>
        {BENEFITS.map((key) => (
          <View key={key} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: spacing.touchTarget }}>
            <Icon name="check" size={18} color={colors.primary} />
            <Text variant="bodyMd" style={{ flex: 1 }}>
              {t(key)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const cardStyle = {
  gap: spacing.xs,
  backgroundColor: roles.cardBackground,
  borderWidth: 1,
  borderColor: roles.cardBorder,
  borderRadius: radius.lg,
  padding: spacing.md,
};
