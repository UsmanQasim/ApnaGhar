import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { InvoiceStatus } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { api, toPaisa } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Icon } from '../../../src/components/Icon';
import { NumberText, Text } from '../../../src/components/Text';
import { INVOICE_ITEM_KEY, INVOICE_STATUS_KEY, type Invoice } from '../../../src/billing/types';
import { useFormat } from '../../../src/theme/useFormat';

const OPEN_STATUSES: readonly InvoiceStatus[] = ['open', 'due', 'partially_paid', 'overdue'];

/**
 * One invoice, itemised.
 *
 * Item descriptions come from the SERVER (`descriptionUr`), not from a client
 * lookup table: the invoice is a financial record and what the agent reads has
 * to be what was actually charged, even if the app is an old build with a
 * stale string table. The i18n keys are a fallback for the type, nothing more.
 */
export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();

  const invoices = useQuery({
    queryKey: ['invoices'],
    queryFn: () => api<Invoice[]>('/billing/invoices'),
  });

  const invoice = invoices.data?.find((item) => item.id === id) ?? null;

  if (!invoice) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text variant="bodyLg" color={colors.onSurfaceVariant}>
          {invoices.isLoading ? t('common.loading') : t('errors.notFound')}
        </Text>
      </View>
    );
  }

  const total = toPaisa(invoice.totalPaisa);
  const paid = toPaisa(invoice.amountPaidPaisa);
  const remaining = Math.max(0, total - paid);
  const payable = OPEN_STATUSES.includes(invoice.status) && remaining > 0;

  const dueDate = invoice.dueAt
    ? new Date(invoice.dueAt).toLocaleDateString(format.intlLocale, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.touchTarget * 2.5 }}>
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
            {t('billing.title')}
          </Text>
        </View>

        {/* ── Status + amount ───────────────────────────────────────────── */}
        <View style={cardStyle}>
          <View
            style={{
              alignSelf: 'flex-start',
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.base,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.base,
              borderRadius: radius.full,
              backgroundColor:
                invoice.status === 'paid'
                  ? colors.primaryFixed
                  : invoice.status === 'overdue'
                    ? colors.errorContainer
                    : colors.secondaryContainer,
            }}
          >
            <Icon
              name={invoice.status === 'paid' ? 'check' : invoice.status === 'overdue' ? 'warning' : 'receipt'}
              size={14}
            />
            <Text variant="labelSm">{t(INVOICE_STATUS_KEY[invoice.status])}</Text>
          </View>

          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {payable ? t('billing.totalDue') : t('billing.total')}
          </Text>
          <NumberText variant="numberLg" color={payable ? colors.error : colors.onSurface}>
            {format.priceExact(payable ? remaining : total)}
          </NumberText>

          {dueDate ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {t('billing.dueBy', { date: dueDate })}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
            <Text variant="labelSm" color={colors.onSurfaceVariant}>
              {t('billing.invoiceNumber')}
            </Text>
            {/* The agent quotes this number on the wallet transfer, so it must
                render LTR and unmirrored even inside the RTL layout. */}
            <NumberText variant="numberMd">{invoice.number}</NumberText>
          </View>
        </View>

        {/* ── Items ─────────────────────────────────────────────────────── */}
        <Text variant="headlineSm">{t('billing.items')}</Text>
        <View style={cardStyle}>
          {invoice.items.map((item) => (
            <View
              key={item.id}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, minHeight: spacing.touchTarget }}
            >
              <Text variant="bodyMd" style={{ flex: 1 }}>
                {item.descriptionUr || t(INVOICE_ITEM_KEY[item.type])}
              </Text>
              <NumberText
                variant="numberMd"
                color={toPaisa(item.amountPaisa) < 0 ? colors.primary : colors.onSurface}
              >
                {format.priceExact(toPaisa(item.amountPaisa))}
              </NumberText>
            </View>
          ))}

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
            <Text variant="bodyLg" style={{ flex: 1 }}>
              {t('billing.total')}
            </Text>
            <NumberText variant="numberLg">{format.priceExact(total)}</NumberText>
          </View>

          {paid > 0 ? (
            <>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
                  {t('billing.paidAmount')}
                </Text>
                <NumberText variant="numberMd" color={colors.primary}>
                  {format.priceExact(paid)}
                </NumberText>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                <Text variant="bodyMd" color={colors.onSurfaceVariant} style={{ flex: 1 }}>
                  {t('billing.remaining')}
                </Text>
                <NumberText variant="numberMd">{format.priceExact(remaining)}</NumberText>
              </View>
            </>
          ) : null}
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.base, justifyContent: 'center' }}>
          <Icon name="verified" size={16} color={colors.primary} />
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {t('billing.secureNote')}
          </Text>
        </View>
      </ScrollView>

      {payable ? (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            start: 0,
            end: 0,
            padding: spacing.sm,
            backgroundColor: roles.cardBackground,
            borderTopWidth: 1,
            borderTopColor: roles.cardBorder,
          }}
        >
          <Button
            label={t('billing.payThis')}
            onPress={() => router.push(`/billing/pay?invoiceId=${invoice.id}&amount=${remaining}`)}
            icon={<Icon name="payments" size={18} color={colors.onPrimary} />}
          />
        </View>
      ) : null}
    </View>
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
