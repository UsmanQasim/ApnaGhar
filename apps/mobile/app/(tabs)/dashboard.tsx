import { RefreshControl, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { PlanCode } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { api, toPaisa } from '../../src/api/client';
import { BillingCard } from '../../src/components/BillingCard';
import { NumberText, Text } from '../../src/components/Text';
import { useFormat } from '../../src/theme/useFormat';

interface Summary {
  plan: PlanCode;
  activeListings: number;
  balancePaisa: string;
  recentSpendPaisa: string;
  recentCycles: number;
}

interface Stats {
  viewsThisMonth: number;
  leadsThisMonth: number;
  listedThisMonth: number;
  soldThisMonth: number;
}

export default function DashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const summary = useQuery<Summary>({
    queryKey: ['billing-summary'],
    queryFn: () => api<Summary>('/billing/summary'),
  });

  const stats = useQuery<Stats>({
    queryKey: ['agent-stats'],
    queryFn: () => api<Stats>('/agents/me/stats'),
  });

  return (
    <ScrollView
      contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
      refreshControl={
        <RefreshControl
          refreshing={summary.isRefetching}
          onRefresh={() => void summary.refetch()}
          tintColor={colors.primary}
        />
      }
    >
      <Text variant="headlineMd">{t('dashboard.title')}</Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        <StatTile label={t('dashboard.views')} value={stats.data?.viewsThisMonth ?? 0} />
        <StatTile label={t('dashboard.leads')} value={stats.data?.leadsThisMonth ?? 0} />
        <StatTile label={t('dashboard.listed')} value={stats.data?.listedThisMonth ?? 0} />
        <StatTile label={t('dashboard.soldCount')} value={stats.data?.soldThisMonth ?? 0} />
      </View>

      {summary.data ? (
        <BillingCard
          plan={summary.data.plan}
          activeListings={summary.data.activeListings}
          amountDuePaisa={toPaisa(summary.data.balancePaisa)}
          recentSpendPaisa={toPaisa(summary.data.recentSpendPaisa)}
          recentCycles={summary.data.recentCycles}
          onPayNow={() => router.push('/billing/pay')}
          onUpgrade={() => router.push('/billing/premium')}
        />
      ) : null}
    </ScrollView>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  const format = useFormat();

  return (
    <View
      style={{
        flexGrow: 1,
        flexBasis: '45%',
        backgroundColor: roles.cardBackground,
        borderWidth: 1,
        borderColor: roles.cardBorder,
        borderRadius: radius.lg,
        padding: spacing.md,
        gap: spacing.base,
        minHeight: spacing.touchTarget * 1.5,
      }}
    >
      {/* Number first and large: it is the thing being read. The Urdu label
          underneath is context, and stays smaller. */}
      <NumberText variant="numberLg" color={colors.primary}>
        {format.count(value)}
      </NumberText>
      <Text variant="bodyMd" color={colors.onSurfaceVariant}>
        {label}
      </Text>
    </View>
  );
}
