import { useCallback, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';

import { PaymentProviderCode } from '@ghar/shared';
import { colors, radius, roles, spacing, typography } from '@ghar/ui';

import { api, toPaisa } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Icon } from '../../src/components/Icon';
import { NumberText, Text } from '../../src/components/Text';
import { usePickImage } from '../../src/media/usePickImage';
import { useFormat } from '../../src/theme/useFormat';

interface Methods {
  available: PaymentProviderCode[];
  manual: {
    easypaisa: { number: string | null; accountTitle: string | null };
    jazzcash: { number: string | null; accountTitle: string | null };
  };
}

interface ProofTarget {
  proofKey: string;
  method: 'PUT';
  url: string;
  headers: Record<string, string>;
}

type Wallet = 'easypaisa' | 'jazzcash';

const PROVIDER: Record<Wallet, PaymentProviderCode> = {
  easypaisa: PaymentProviderCode.MANUAL_EASYPAISA,
  jazzcash: PaymentProviderCode.MANUAL_JAZZCASH,
};

/**
 * The manual wallet payment flow — Rail A in README §8, and the one that ships
 * first because it works today without a merchant account.
 *
 * Three numbered steps, in the order the agent actually performs them: send
 * the money in his wallet app, screenshot the receipt, come back and tell us.
 * Numbering them is not decoration — this flow leaves the app and comes back,
 * and an agent who loses his place gives up.
 */
export default function PayScreen() {
  const { invoiceId, amount } = useLocalSearchParams<{ invoiceId?: string; amount?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const format = useFormat();
  const queryClient = useQueryClient();
  const pickImage = usePickImage();

  const [wallet, setWallet] = useState<Wallet>('easypaisa');
  const [txnId, setTxnId] = useState('');
  const [payerMsisdn, setPayerMsisdn] = useState('');
  const [proofKey, setProofKey] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const methods = useQuery({
    queryKey: ['payment-methods'],
    queryFn: () => api<Methods>('/payments/methods'),
  });

  const summary = useQuery({
    queryKey: ['billing-summary'],
    queryFn: () => api<{ balancePaisa: string }>('/billing/summary'),
  });

  const amountPaisa = amount ? Number(amount) : toPaisa(summary.data?.balancePaisa);
  const details = methods.data?.manual[wallet];

  /**
   * The screenshot goes straight to storage; only the resulting key reaches
   * our API. Uploading through the API would put a 3MB image on the request
   * path of a route an agent hits when he is already frustrated about money.
   */
  const attachProof = useCallback(async () => {
    setError(null);
    const file = await pickImage();
    if (!file) return;

    setUploading(true);
    try {
      const target = await api<ProofTarget>('/media/proof-url', {
        method: 'POST',
        body: { contentType: file.type, byteSize: file.size },
      });

      await fetch(target.url, {
        method: target.method,
        headers: target.headers,
        body: { uri: file.uri, type: file.type, name: 'proof' } as unknown as BodyInit,
      });

      setProofKey(target.proofKey);
    } catch {
      setError(t('errors.somethingWrong'));
    } finally {
      setUploading(false);
    }
  }, [pickImage, t]);

  const submit = useMutation({
    mutationFn: () =>
      api<{ id: string; provisionalUntil: string | null }>('/payments/manual', {
        method: 'POST',
        body: {
          ...(invoiceId ? { invoiceId } : {}),
          provider: PROVIDER[wallet],
          amountPaisa,
          providerTxnId: txnId.trim(),
          payerMsisdn: payerMsisdn.trim(),
          proofKey,
        },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['billing-summary'] });
      void queryClient.invalidateQueries({ queryKey: ['invoices'] });
      router.replace('/billing/history');
    },
    onError: () => setError(t('errors.somethingWrong')),
  });

  const onSubmit = useCallback(() => {
    if (!proofKey) {
      setError(t('billing.proofRequired'));
      return;
    }
    if (txnId.trim().length < 4) {
      setError(t('billing.txnRequired'));
      return;
    }
    submit.mutate();
  }, [proofKey, txnId, submit, t]);

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
          {t('billing.methodTitle')}
        </Text>
      </View>

      {/* Amount, stated before anything is asked of the agent. */}
      <View
        style={{
          backgroundColor: roles.cardBackground,
          borderWidth: 1,
          borderColor: roles.cardBorder,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.base,
        }}
      >
        <Text variant="bodyMd" color={colors.onSurfaceVariant}>
          {t('billing.amount')}
        </Text>
        <NumberText variant="numberLg" color={colors.primary}>
          {format.priceExact(amountPaisa)}
        </NumberText>
      </View>

      {/* ── Wallet choice ─────────────────────────────────────────────── */}
      <Text variant="bodyLg">{t('billing.chooseMethod')}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {(['easypaisa', 'jazzcash'] as const).map((option) => {
          const selected = wallet === option;
          return (
            <Pressable
              key={option}
              onPress={() => setWallet(option)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: spacing.xs,
                minHeight: spacing.touchTarget,
                borderRadius: radius.md,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primary : roles.cardBorder,
                backgroundColor: selected ? colors.primaryFixed : roles.cardBackground,
              }}
            >
              <Icon name="payments" size={18} />
              <Text variant="bodyMd">{t(`billing.${option}`)}</Text>
              {selected ? <Icon name="check" size={16} color={colors.primary} /> : null}
            </Pressable>
          );
        })}
      </View>

      {/* ── Step 1 ────────────────────────────────────────────────────── */}
      <Step number={1} label={t('billing.step1')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
          <NumberText variant="numberLg" style={{ flex: 1 }}>
            {details?.number ?? '—'}
          </NumberText>
          <Pressable
            onPress={() => {
              if (!details?.number) return;
              void Clipboard.setStringAsync(details.number);
              setCopied(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={t('billing.copyNumber')}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: spacing.base,
              minHeight: spacing.touchTarget,
              paddingHorizontal: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.surfaceContainer,
            }}
          >
            <Icon name="check" size={16} />
            <Text variant="bodyMd">{copied ? t('common.copied') : t('billing.copyNumber')}</Text>
          </Pressable>
        </View>
        {details?.accountTitle ? (
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('billing.accountTitle')}: {details.accountTitle}
          </Text>
        ) : null}
      </Step>

      {/* ── Step 2 ────────────────────────────────────────────────────── */}
      <Step number={2} label={t('billing.step2')}>
        <Button
          label={
            uploading
              ? t('common.loading')
              : proofKey
                ? t('billing.screenshotChosen')
                : t('billing.pickScreenshot')
          }
          variant={proofKey ? 'secondary' : 'primary'}
          loading={uploading}
          onPress={() => void attachProof()}
          icon={<Icon name={proofKey ? 'check' : 'visibility'} size={18} color={proofKey ? colors.secondary : colors.onPrimary} />}
        />
      </Step>

      {/* ── Step 3 ────────────────────────────────────────────────────── */}
      <Step number={3} label={t('billing.step3')}>
        <TextInput
          value={txnId}
          onChangeText={setTxnId}
          placeholder={t('billing.transactionId')}
          placeholderTextColor={colors.onSurfaceVariant}
          accessibilityLabel={t('billing.transactionId')}
          autoCapitalize="characters"
          style={inputStyle}
        />
        <TextInput
          value={payerMsisdn}
          onChangeText={setPayerMsisdn}
          placeholder={t('auth.phoneHint')}
          placeholderTextColor={colors.onSurfaceVariant}
          accessibilityLabel={t('billing.payerNumber')}
          keyboardType="phone-pad"
          style={inputStyle}
        />
      </Step>

      {/* The promise that makes this flow tolerable: work continues while a
          human checks the receipt. Stated before the button, not after. */}
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
          {t('billing.provisionalNote')}
        </Text>
      </View>

      {error ? (
        <Text
          variant="bodyMd"
          color={colors.onErrorContainer}
          style={{ backgroundColor: colors.errorContainer, borderRadius: radius.md, padding: spacing.sm }}
        >
          {error}
        </Text>
      ) : null}

      <Button
        label={t('billing.submitForVerification')}
        loading={submit.isPending}
        onPress={onSubmit}
        icon={<Icon name="verified" size={18} color={colors.onPrimary} />}
      />
    </ScrollView>
  );
}

const inputStyle = {
  minHeight: spacing.touchTarget,
  borderWidth: 1,
  borderColor: roles.cardBorder,
  borderRadius: radius.md,
  paddingHorizontal: spacing.sm,
  backgroundColor: roles.cardBackground,
  fontFamily: typography.numberMd.fontFamily,
  fontSize: typography.numberMd.fontSize,
  color: colors.onSurface,
  textAlign: 'left' as const,
  writingDirection: 'ltr' as const,
};

function Step({
  number,
  label,
  children,
}: {
  number: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        gap: spacing.xs,
        backgroundColor: roles.cardBackground,
        borderWidth: 1,
        borderColor: roles.cardBorder,
        borderRadius: radius.lg,
        padding: spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: radius.full,
            backgroundColor: colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <NumberText variant="numberMd" color={colors.onPrimary}>
            {String(number)}
          </NumberText>
        </View>
        <Text variant="bodyLg" style={{ flex: 1 }}>
          {label}
        </Text>
      </View>
      {children}
    </View>
  );
}
