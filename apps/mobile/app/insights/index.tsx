import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { LeadChannel } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { ApiError, api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { NumberText, Text } from '../../src/components/Text';
import { useFormat } from '../../src/theme/useFormat';

interface Insights {
  views30: number;
  viewsChangePercent: number | null;
  leads30: number;
  savedSimilar: number | null;
  watchThrough: number | null;
  demand: Array<{
    city: string;
    locality: string;
    searchesThisWeek: number;
    changePercent: number | null;
  }>;
  leadsByChannel: Record<LeadChannel, number>;
}

/**
 * Premium buyer-demand insights.
 *
 * Everything here is a COUNT over an area — never a person. The privacy note
 * at the bottom is not boilerplate: it is the promise that makes this feature
 * defensible, and an agent who understands it is less likely to expect a list
 * of names and complain when he doesn't get one. See README §9.
 */
export default function InsightsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();

  const insights = useQuery({
    queryKey: ['insights'],
    queryFn: () => api<Insights>('/insights'),
    retry: false,
  });

  // 403 means "not premium" — a paywall, not a failure. The gate is enforced
  // server-side; this branch only decides which screen to draw.
  const locked = insights.error instanceof ApiError && insights.error.status === 403;

  if (locked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
        <Icon name="insights" size={48} color={colors.primary} />
        <Text variant="headlineSm" center>
          {t('insights.premiumOnly')}
        </Text>
        <Text variant="bodyMd" color={colors.onSurfaceVariant} center>
          {t('insights.privacyNote')}
        </Text>
        <Button label={t('premium.upgrade')} fullWidth={false} onPress={() => router.push('/billing/premium')} />
      </View>
    );
  }

  const data = insights.data;

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
        <Icon name="verified" size={18} color={colors.primary} />
        <Text variant="headlineMd" style={{ flex: 1 }}>
          {t('premium.insights')}
        </Text>
      </View>

      {/* ── Demand ────────────────────────────────────────────────────── */}
      <Text variant="headlineSm">{t('insights.marketSummary')}</Text>

      {(data?.demand ?? []).map((area) => {
        const key =
          area.changePercent === null || area.changePercent === 0
            ? 'insights.demandFlat'
            : area.changePercent > 0
              ? 'insights.demandUp'
              : 'insights.demandDown';

        return (
          <View key={`${area.city}-${area.locality}`} style={cardStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
              {/* Arrow AND wording carry the direction — a colour-only trend
                  indicator is unreadable to a red-green colourblind agent. */}
              <Icon
                name={area.changePercent !== null && area.changePercent < 0 ? 'arrow_back' : 'star'}
                size={18}
                color={colors.primary}
              />
              <Text variant="bodyMd" style={{ flex: 1 }}>
                {t(key, {
                  area: area.locality,
                  percent: Math.abs(area.changePercent ?? 0),
                })}
              </Text>
            </View>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('insights.searchedThisWeek', {
                count: area.searchesThisWeek,
                area: area.locality,
              })}
            </Text>
          </View>
        );
      })}

      {data && data.demand.length === 0 ? (
        <Text variant="bodyMd" color={colors.onSurfaceVariant}>
          {t('insights.noData')}
        </Text>
      ) : null}

      {data?.savedSimilar !== null && data?.savedSimilar !== undefined ? (
        <View style={cardStyle}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="favorite" size={18} />
            <Text variant="bodyMd" style={{ flex: 1 }}>
              {t('insights.newBuyersSaved', { count: data.savedSimilar })}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Headline numbers ──────────────────────────────────────────────
          Stat tiles, not a chart: two figures with no series and no time axis
          have nothing for a chart to add. */}
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Tile
          icon="visibility"
          value={format.count(data?.views30 ?? 0)}
          label={t('insights.viewsLast30')}
          delta={data?.viewsChangePercent ?? null}
        />
        <Tile
          icon="call"
          value={format.count(data?.leads30 ?? 0)}
          label={t('insights.leadsGenerated')}
        />
      </View>

      {data?.watchThrough !== null && data?.watchThrough !== undefined ? (
        <View style={cardStyle}>
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('insights.watchThrough')}
          </Text>
          <NumberText variant="numberLg" color={colors.primary}>
            {`${Math.round(data.watchThrough * 100)}%`}
          </NumberText>
        </View>
      ) : null}

      {/* The promise, stated plainly and last, where it is read as a
          commitment rather than a disclaimer. */}
      <View
        style={{
          flexDirection: 'row',
          gap: spacing.xs,
          backgroundColor: colors.secondaryContainer,
          borderRadius: radius.md,
          padding: spacing.sm,
        }}
      >
        <Icon name="info" size={18} />
        <Text variant="bodyMd" style={{ flex: 1 }}>
          {t('insights.privacyNote')}
        </Text>
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

function Tile({
  icon,
  value,
  label,
  delta,
}: {
  icon: 'visibility' | 'call';
  value: string;
  label: string;
  delta?: number | null;
}) {
  return (
    <View style={[cardStyle, { flex: 1 }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Icon name={icon} size={20} color={colors.primary} />
      <NumberText variant="numberLg">{value}</NumberText>
      <Text variant="labelSm" color={colors.onSurfaceVariant}>
        {label}
      </Text>
      {delta !== null && delta !== undefined ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
          <Text variant="labelSm" color={delta >= 0 ? colors.primary : colors.error}>
            {delta >= 0 ? '▲' : '▼'}
          </Text>
          <NumberText variant="numberMd" color={delta >= 0 ? colors.primary : colors.error}>
            {`${Math.abs(delta)}%`}
          </NumberText>
        </View>
      ) : null}
    </View>
  );
}
