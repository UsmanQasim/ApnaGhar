import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { UserRole } from '@ghar/shared';
import { colors, radius, spacing, typography } from '@ghar/ui';

import { ApiError, api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { useAuthStore } from '../../src/store/auth';

interface VerifyResponse {
  accessToken: string;
  refreshToken: string;
  isNew: boolean;
}

interface RequestResponse {
  /** Only present while OTP_DEV_MODE=true on the API. Never sent in production. */
  devCode?: string;
  resendInSeconds: number;
}

/**
 * The access token carries `{ sub, role }`. Reading it here saves a round trip
 * to `/agents/me` that a customer (who has no agent record) would fail anyway.
 * This is a *decode*, not a verify — the server is the only thing that trusts
 * this token, and it verifies the signature on every request.
 */
function readToken(accessToken: string): { userId: string; role: UserRole } | null {
  try {
    const segment = accessToken.split('.')[1];
    if (!segment) return null;

    const json = JSON.parse(decodeBase64Url(segment)) as { sub?: string; role?: string };
    if (!json.sub || !json.role) return null;

    return { userId: json.sub, role: json.role as UserRole };
  } catch {
    return null;
  }
}

/**
 * Hermes ships `atob`, but only for standard base64 and only on recent
 * versions — a JWT segment is base64*url* and unpadded. Twelve lines of table
 * lookup is cheaper than a polyfill dependency and cannot regress with the
 * engine.
 */
const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function decodeBase64Url(input: string): string {
  const normalised = input.replace(/-/g, '+').replace(/_/g, '/');

  let bits = 0;
  let accumulator = 0;
  const bytes: number[] = [];

  for (const char of normalised) {
    const value = B64.indexOf(char);
    if (value === -1) continue; // padding, whitespace

    accumulator = (accumulator << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes.push((accumulator >> bits) & 0xff);
    }
  }

  // The payload is UTF-8; a phone number or a UUID is ASCII, but the claim set
  // is not contractually ASCII-only, so decode properly.
  return decodeURIComponent(
    bytes.map((b) => `%${b.toString(16).padStart(2, '0')}`).join(''),
  );
}

export default function OtpScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setTokens, setUser } = useAuthStore();

  // `devCode` is forwarded by the phone screen when the API is in dev mode, so
  // testing the flow does not require reading the server log.
  const params = useLocalSearchParams<{ phone?: string; devCode?: string }>();
  const phone = params.phone ?? '';

  const [code, setCode] = useState(params.devCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(60);
  const inputRef = useRef<TextInput>(null);

  // A wrong phone param means the user deep-linked or the back stack was
  // rebuilt; there is nothing to verify against, so send them back.
  useEffect(() => {
    if (!phone) router.replace('/(auth)/phone');
  }, [phone, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  useEffect(() => {
    const focus = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(focus);
  }, []);

  async function verify(value: string): Promise<void> {
    setLoading(true);
    setError(null);
    try {
      const tokens = await api<VerifyResponse>('/auth/otp/verify', {
        method: 'POST',
        body: { phone, code: value },
      });

      setTokens(tokens.accessToken, tokens.refreshToken);

      const claims = readToken(tokens.accessToken);
      setUser({
        userId: claims?.userId ?? '',
        role: claims?.role ?? UserRole.CUSTOMER,
        phone,
      });

      // replace, not push: the OTP screen must not be reachable with Back once
      // the code has been spent.
      router.replace('/(tabs)/profile');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.messageKey : 'errors.somethingWrong');
      setCode('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function resend(): Promise<void> {
    setError(null);
    try {
      const next = await api<RequestResponse>('/auth/otp/request', {
        method: 'POST',
        body: { phone },
      });
      setResendIn(next.resendInSeconds || 60);
      if (next.devCode) setCode(next.devCode);
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.messageKey : 'errors.somethingWrong');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, padding: spacing.md, gap: spacing.md, justifyContent: 'center' }}
    >
      <Text variant="headlineLg">{t('auth.enterCode')}</Text>
      <Text variant="bodyLg" color={colors.onSurfaceVariant}>
        {t('auth.codeSentTo', { phone })}
      </Text>

      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={(value) => {
          const digits = value.replace(/\D/g, '').slice(0, 6);
          setCode(digits);
          setError(null);
          // Six digits is the whole code — submitting on its own saves a tap
          // for a user who is holding the phone in one hand.
          if (digits.length === 6 && !loading) void verify(digits);
        }}
        keyboardType="number-pad"
        autoComplete="sms-otp"
        textContentType="oneTimeCode"
        maxLength={6}
        editable={!loading}
        style={{
          minHeight: spacing.touchTarget,
          borderWidth: error ? 2 : 1,
          borderColor: error ? colors.error : colors.outlineVariant,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          // Digits: Latin face, forced LTR, generously spaced — this is the one
          // field where a misread character costs the whole login.
          fontFamily: typography.numberLg.fontFamily,
          fontSize: typography.numberLg.fontSize,
          letterSpacing: 8,
          color: colors.onSurface,
          textAlign: 'center',
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
        onPress={() => void verify(code)}
        loading={loading}
        disabled={code.length !== 6}
      />

      <View style={{ gap: spacing.sm, alignItems: 'center' }}>
        {resendIn > 0 ? (
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('auth.resendIn', { seconds: resendIn })}
          </Text>
        ) : (
          <Pressable onPress={() => void resend()} style={{ minHeight: spacing.touchTarget, justifyContent: 'center' }}>
            <Text variant="bodyMd" color={colors.primary}>
              {t('auth.resendCode')}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => router.replace('/(auth)/phone')}
          style={{ minHeight: spacing.touchTarget, justifyContent: 'center' }}
        >
          <Text variant="bodyMd" color={colors.primary}>
            {t('auth.changeNumber')}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
