import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { InvoiceStatus, PLANS, PlanCode } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { api, toPaisa } from '../../src/api/client';
import { Icon, type IconName } from '../../src/components/Icon';
import { NumberText, Text } from '../../src/components/Text';
import { INVOICE_STATUS_KEY, type BillingSummary, type Invoice } from '../../src/billing/types';
import { useFormat } from '../../src/theme/useFormat';

const STATUS_ICON: Record<InvoiceStatus, IconName> = {
  open: 'receipt',
  due: 'receipt',
  partially_paid: 'receipt',
  paid: 'check',
  overdue: 'warning',
  void: 'close',
};

/**
 * Payment history — the agent's answer to "what am I actually paying for?".
 *
 * Every number on this screen comes from the server or from PLANS. Nothing is
 * hardcoded: the mock's "20 listings" premium pitch is exactly the drift this
 * guards against (docs/design/README.md §3).
 */
export default function PaymentHistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();

  const summary = useQuery({
    queryKey: ['billing-summary'],
    queryFn: () => api<BillingSummary>('/billing/summary'),
  });

  const invoices = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<Invoice[]>('/billing/invoices'),
  });

  const data = summary.data;
  const included = data?.includedListings ?? null;
  const overQuota = included !== null && (data?.activeListings ?? 0) > included;

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
        <Text variant="headlineMd" style={{ flex: 1 }}>
          {t('billing.myPayments')}
        </Text>
      </View>

      {/* ── Current plan ──────────────────────────────────────────────── */}
      <View style={cardStyle}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Icon name="star" size={18} />
          <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
            {t('billing.currentPlan')}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs }}>
          <Text variant="headlineSm">
            {t(data?.plan === PlanCode.PREMIUM ? 'billing.planPremium' : 'billing.planBasic')}
          </Text>
          <NumberText variant="numberMd" color={colors.onSurfaceVariant}>
            {format.priceExact(data?.planPricePaisa ?? PLANS[PlanCode.BASIC].pricePaisa)}
          </NumberText>
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('billing.perMonth')}
          </Text>
        </View>

        {/* Quota. On premium `included` is null — the word "unlimited", never
            a number, because premium having a cap is what broke the pricing
            model the last time (README §2). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
            {t('billing.quotaLabel')}
          </Text>
          {included === null ? (
            <Text variant="bodyMd" color={colors.primary}>
              {t('billing.unlimited')}
            </Text>
          ) : (
            <NumberText variant="numberMd" color={overQuota ? colors.error : colors.onSurface}>
              {`${format.count(data?.activeListings ?? 0)} / ${format.count(included)}`}
            </NumberText>
          )}
        </View>

        {overQuota ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base }}>
            <Icon name="warning" size={16} />
            <Text variant="labelSm" color={colors.onErrorContainer}>
              {t('billing.overQuota')}
            </Text>
          </View>
        ) : null}

        {data?.subscription ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
              {t('billing.nextBillingDate')}
            </Text>
            <NumberText variant="numberMd">
              {new Date(data.subscription.currentPeriodEnd).toLocaleDateString(format.intlLocale, {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </NumberText>
          </View>
        ) : null}
      </View>

      {/* ── Outstanding ───────────────────────────────────────────────── */}
      {data && toPaisa(data.balancePaisa) > 0 ? (
        <Pressable
          onPress={() => router.push('/billing/pay')}
          accessibilityRole="button"
          accessibilityLabel={t('billing.payNow')}
          style={[cardStyle, { borderColor: colors.error }]}
        >
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('billing.amountDue')}
          </Text>
          <NumberText variant="numberLg" color={colors.error}>
            {format.priceExact(toPaisa(data.balancePaisa))}
          </NumberText>
          <Text variant="bodyMd" color={colors.primary}>
            {t('billing.payNow')}
          </Text>
        </Pressable>
      ) : null}

      {/* ── Invoices ──────────────────────────────────────────────────── */}
      <Text variant="headlineSm">{t('billing.pastInvoices')}</Text>

      {(invoices.data ?? []).map((invoice) => (
        <Pressable
          key={invoice.id}
          onPress={() => router.push(`/billing/invoice/${invoice.id}`)}
          accessibilityRole="button"
          accessibilityLabel={invoice.number}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
            minHeight: spacing.touchTarget,
            padding: spacing.sm,
            borderRadius: radius.lg,
            backgroundColor: roles.cardBackground,
            borderWidth: 1,
            borderColor: roles.cardBorder,
          }}
        >
          <Icon
            name={STATUS_ICON[invoice.status]}
            size={20}
            color={invoice.status === 'overdue' ? colors.error : colors.primary}
          />
          <View style={{ flex: 1 }}>
            <NumberText variant="numberMd">
              {new Date(invoice.periodStart).toLocaleDateString(format.intlLocale, {
                month: 'short',
                year: 'numeric',
              })}
            </NumberText>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t(INVOICE_STATUS_KEY[invoice.status])}
            </Text>
          </View>
          <NumberText variant="numberMd">{format.priceExact(toPaisa(invoice.totalPaisa))}</NumberText>
        </Pressable>
      ))}

      {invoices.data && invoices.data.length === 0 ? (
        <Text variant="bodyMd" color={colors.onSurfaceVariant} center>
          {t('billing.noPayments')}
        </Text>
      ) : null}

      {/* ── Premium upsell ────────────────────────────────────────────────
          Rendered ONLY when the server says premium would actually have saved
          this agent money over his real spend. `premiumSavingPaisa` is null
          otherwise, and null means show nothing — never invent a saving from a
          listing count he has never reached. */}
      {data?.premiumSavingPaisa ? (
        <Pressable
          onPress={() => router.push('/billing/premium')}
          accessibilityRole="button"
          accessibilityLabel={t('premium.upgrade')}
          style={[cardStyle, { backgroundColor: colors.primaryFixed, borderColor: colors.primary }]}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Icon name="star" size={20} />
            <View style={{ flex: 1 }}>
              <Text variant="bodyLg">{t('premium.becomePremium')}</Text>
              <Text variant="bodyMd" color={colors.onSurfaceVariant}>
                {t('premium.savedLastMonths', {
                  amount: format.priceExact(toPaisa(data.premiumSavingPaisa)),
                  months: data.recentCycles,
                })}
              </Text>
            </View>
            <Icon name="arrow_back" size={18} />
          </View>
        </Pressable>
      ) : null}
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
