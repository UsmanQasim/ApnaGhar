import { useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { colors, radius, spacing } from '@ghar/ui';

import { ApiError, api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';

interface ShareLink {
  id: string;
  url: string;
  token: string;
  expiresAt: string | null;
  maxViews: number | null;
  revokedAt: string | null;
  _count: { views: number };
}

interface CreatedLink {
  id: string;
  url: string;
  expiresAt: string | null;
  maxViews: number | null;
}

/**
 * Durations the agent actually uses. "Never" is last and deliberately not the
 * default — a link with no expiry outlives the deal it was made for.
 */
const DURATIONS: Array<{ key: string; minutes: number | null }> = [
  { key: 'share.duration30m', minutes: 30 },
  { key: 'share.duration2h', minutes: 120 },
  { key: 'share.duration24h', minutes: 1440 },
  { key: 'share.duration7d', minutes: 10_080 },
  { key: 'share.durationNever', minutes: null },
];

export default function ShareScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [minutes, setMinutes] = useState<number | null>(30);
  const [onceOnly, setOnceOnly] = useState(false);
  const [created, setCreated] = useState<CreatedLink | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: links } = useQuery<ShareLink[]>({
    queryKey: ['share-links', id],
    enabled: Boolean(id),
    queryFn: () => api<ShareLink[]>(`/share/property/${id}`),
  });

  const create = useMutation({
    mutationFn: () =>
      api<CreatedLink>('/share', {
        method: 'POST',
        body: {
          propertyId: id,
          expiresInMinutes: minutes,
          maxViews: onceOnly ? 1 : null,
          requireOtp: false,
        },
      }),
    onSuccess: async (link) => {
      setCreated(link);
      setError(null);
      await queryClient.invalidateQueries({ queryKey: ['share-links', id] });
    },
    onError: (caught) =>
      setError(caught instanceof ApiError ? caught.messageKey : 'errors.somethingWrong'),
  });

  const revoke = useMutation({
    mutationFn: (linkId: string) => api(`/share/${linkId}`, { method: 'DELETE' }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['share-links', id] });
    },
  });

  async function copy(url: string): Promise<void> {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function sendWhatsapp(url: string): Promise<void> {
    // `whatsapp://` fails silently when WhatsApp is not installed; wa.me opens
    // the browser and then hands off, which works either way.
    const target = `https://wa.me/?text=${encodeURIComponent(url)}`;
    if (await Linking.canOpenURL(target)) await Linking.openURL(target);
  }

  const active = (links ?? []).filter((link) => link.revokedAt === null);

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      <Text variant="headlineLg">{t('share.title')}</Text>

      <Text variant="bodyLg">{t('share.chooseDuration')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
        {DURATIONS.map((option) => {
          const selected = option.minutes === minutes;
          return (
            <Pressable
              key={option.key}
              onPress={() => setMinutes(option.minutes)}
              style={{
                minHeight: spacing.touchTarget,
                justifyContent: 'center',
                paddingHorizontal: spacing.md,
                borderRadius: radius.md,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primary : colors.outlineVariant,
                backgroundColor: selected ? colors.primaryContainer : colors.surfaceContainerLowest,
              }}
            >
              <Text variant="bodyMd" color={selected ? colors.onPrimaryContainer : colors.onSurface}>
                {t(option.key)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        onPress={() => setOnceOnly((v) => !v)}
        style={{
          minHeight: spacing.touchTarget,
          justifyContent: 'center',
          paddingHorizontal: spacing.md,
          borderRadius: radius.md,
          borderWidth: onceOnly ? 2 : 1,
          borderColor: onceOnly ? colors.primary : colors.outlineVariant,
          backgroundColor: onceOnly ? colors.primaryContainer : colors.surfaceContainerLowest,
        }}
      >
        <Text variant="bodyMd" color={onceOnly ? colors.onPrimaryContainer : colors.onSurface}>
          {t('share.onceOnly')}
        </Text>
      </Pressable>

      {error ? (
        <Text variant="bodyMd" color={colors.error}>
          {t(error)}
        </Text>
      ) : null}

      <Button
        label={t('share.copyLink')}
        onPress={() => (created ? void copy(created.url) : create.mutate())}
        loading={create.isPending}
      />

      {created ? (
        <View
          style={{
            gap: spacing.sm,
            padding: spacing.md,
            borderRadius: radius.lg,
            backgroundColor: colors.surfaceContainerLow,
          }}
        >
          <Text variant="labelSm" color={colors.onSurfaceVariant}>
            {created.url}
          </Text>
          {copied ? (
            <Text variant="labelSm" color={colors.primary}>
              {t('common.copied')}
            </Text>
          ) : null}
          <Button
            label={t('share.sendWhatsapp')}
            variant="secondary"
            onPress={() => void sendWhatsapp(created.url)}
          />
        </View>
      ) : null}

      {active.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          {active.map((link) => (
            <View
              key={link.id}
              style={{
                gap: spacing.xs,
                padding: spacing.sm,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.outlineVariant,
              }}
            >
              <Text variant="labelSm" color={colors.onSurfaceVariant}>
                {link.url}
              </Text>
              <Text variant="labelSm">
                {t('share.viewedTimes', { count: link._count.views })}
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <Button
                  label={t('share.copyLink')}
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => void copy(link.url)}
                />
                <Button
                  label={t('share.revoke')}
                  variant="ghost"
                  fullWidth={false}
                  onPress={() => revoke.mutate(link.id)}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </ScrollView>
  );
}
