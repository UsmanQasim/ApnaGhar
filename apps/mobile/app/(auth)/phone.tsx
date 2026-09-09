import { useState } from 'react';
import { KeyboardAvoidingView, Platform, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { phoneSchema } from '@ghar/shared';
import { colors, radius, spacing, typography } from '@ghar/ui';

import { ApiError, api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';

export default function PhoneScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const parsed = phoneSchema.safeParse(raw);

  async function submit() {
    if (!parsed.success) {
      setError('errors.invalidPhone');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // While OTP_DEV_MODE=true the API returns the code in its own response
      // instead of sending an SMS. Forwarding it prefills the next screen, so
      // the whole login flow is testable without an SMS aggregator. In
      // production `devCode` is simply absent and the field starts empty.
      const requested = await api<{ devCode?: string; resendInSeconds: number }>(
        '/auth/otp/request',
        { method: 'POST', body: { phone: parsed.data } },
      );

      router.push({
        pathname: '/(auth)/otp',
        params: { phone: parsed.data, ...(requested.devCode ? { devCode: requested.devCode } : {}) },
      });
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.messageKey : 'errors.somethingWrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, padding: spacing.md, gap: spacing.md, justifyContent: 'center' }}
    >
      <Text variant="headlineLg">{t('auth.welcomeTitle')}</Text>
      <Text variant="bodyLg" color={colors.onSurfaceVariant}>
        {t('auth.welcomeSubtitle')}
      </Text>

      <Text variant="bodyMd">{t('auth.enterPhone')}</Text>

      <TextInput
        value={raw}
        onChangeText={(value) => {
          setRaw(value);
          setError(null);
        }}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        placeholder={t('auth.phoneHint')}
        placeholderTextColor={colors.outline}
        maxLength={15}
        style={{
          minHeight: spacing.touchTarget,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.error : colors.outlineVariant,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          // A phone number is digits: Latin face, forced LTR so it never
          // mirrors, but the field itself sits in the RTL layout.
          fontFamily: typography.numberLg.fontFamily,
          fontSize: typography.numberLg.fontSize,
          color: colors.onSurface,
          textAlign: 'left',
          backgroundColor: colors.surfaceContainerLowest,
        }}
      />

      {error ? (
        <Text variant="bodyMd" color={colors.error}>
          {t(error)}
        </Text>
      ) : null}

      <Button
        label={t('auth.sendCode')}
        onPress={submit}
        loading={loading}
        disabled={!parsed.success}
      />
    </KeyboardAvoidingView>
  );
}
