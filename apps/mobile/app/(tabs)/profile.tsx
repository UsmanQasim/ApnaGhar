import { Image, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { Locale, LOCALES, PlanCode, UserRole } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { api } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Icon, type IconName } from '../../src/components/Icon';
import { NumberText, Text } from '../../src/components/Text';
import { i18n, saveLocale } from '../../src/i18n';
import { applyLayoutDirection } from '../../src/i18n/rtl';
import { useAuthStore } from '../../src/store/auth';

interface Me {
  agencyName: string | null;
  isVerified: boolean;
  city: string | null;
  activeListings: number;
  user: { name: string | null; phone: string; avatarUrl: string | null; createdAt: string };
  subscription: { planCode: PlanCode; status: string; currentPeriodEnd: string } | null;
}

/**
 * The account tab.
 *
 * Declared in `(tabs)/_layout.tsx` since the first release but never
 * implemented — the tab rendered blank. It is the agent's way into everything
 * that is not a listing: billing, insights, reports, language.
 */
export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const { accessToken, role, phone, signOut } = useAuthStore();
  const isAgent = role === UserRole.AGENT;

  const me = useQuery({
    queryKey: ['agent-me'],
    queryFn: () => api<Me>('/agents/me'),
    enabled: isAgent,
  });

  if (!accessToken) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.lg }}>
        <Icon name="person" size={48} color={colors.onSurfaceVariant} />
        <Text variant="headlineSm" center>
          {t('profile.signInPrompt')}
        </Text>
        <Button label={t('profile.signIn')} fullWidth={false} onPress={() => router.push('/(auth)/phone')} />
        <LanguageRow />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}>
      {/* ── Identity ────────────────────────────────────────────────────── */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          backgroundColor: roles.cardBackground,
          borderWidth: 1,
          borderColor: roles.cardBorder,
          borderRadius: radius.lg,
          padding: spacing.md,
        }}
      >
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: radius.full,
            backgroundColor: colors.surfaceContainerHigh,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {me.data?.user.avatarUrl ? (
            <Image source={{ uri: me.data.user.avatarUrl }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Icon name="person" size={30} />
          )}
        </View>

        <View style={{ flex: 1, gap: spacing.base }}>
          <Text variant="headlineSm">{me.data?.user.name ?? t('profile.title')}</Text>
          {/* The phone renders LTR even inside the RTL card — a mobile number
              that mirrors is not a translated number, it is a wrong number. */}
          <NumberText variant="numberMd" color={colors.onSurfaceVariant}>
            {phone ?? me.data?.user.phone ?? ''}
          </NumberText>
          {me.data?.agencyName ? (
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {me.data.agencyName}
            </Text>
          ) : null}
        </View>

        {isAgent ? (
          <View style={{ alignItems: 'center', gap: spacing.base }}>
            <Icon name={me.data?.isVerified ? 'verified' : 'info'} size={20} />
            <Text variant="labelSm" color={me.data?.isVerified ? colors.primary : colors.onSurfaceVariant} center>
              {t(me.data?.isVerified ? 'property.verified' : 'profile.notVerified')}
            </Text>
          </View>
        ) : null}
      </View>

      {isAgent && me.data ? (
        <Text variant="bodyMd" color={colors.onSurfaceVariant}>
          {t('profile.listingsCount', { count: me.data.activeListings })}
        </Text>
      ) : null}

      {/* ── Agent tools ─────────────────────────────────────────────────── */}
      {isAgent ? (
        <View style={{ gap: spacing.xs }}>
          <LinkRow icon="format_list_bulleted" label={t('profile.myListings')} onPress={() => router.push('/listings')} />
          <LinkRow icon="payments" label={t('profile.billing')} onPress={() => router.push('/billing/history')} />
          <LinkRow icon="insights" label={t('profile.insights')} onPress={() => router.push('/insights')} />
          <LinkRow icon="receipt" label={t('profile.reports')} onPress={() => router.push('/reports')} />
        </View>
      ) : (
        <LinkRow icon="business" label={t('profile.becomeAgent')} onPress={() => router.push('/(auth)/phone')} />
      )}

      {/* ── Settings ────────────────────────────────────────────────────── */}
      <Text variant="headlineSm">{t('settings.title')}</Text>
      <LanguageRow />

      <Button label={t('settings.logout')} variant="secondary" onPress={signOut} />
    </ScrollView>
  );
}

function LinkRow({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: spacing.touchTarget,
        paddingHorizontal: spacing.md,
        borderRadius: radius.md,
        backgroundColor: roles.cardBackground,
        borderWidth: 1,
        borderColor: roles.cardBorder,
        opacity: pressed ? 0.85 : 1,
      })}
    >
      <Icon name={icon} size={20} color={colors.primary} />
      <Text variant="bodyMd" style={{ flex: 1 }}>
        {label}
      </Text>
      {/* Points along the reading direction, so under RTL it aims left. */}
      <Icon name="arrow_back" size={16} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

/**
 * Language switch — Urdu, Roman Urdu, English.
 *
 * Three things have to happen together, and skipping any one of them produces
 * a distinct bug:
 *
 *  1. change the strings — otherwise nothing visibly happens;
 *  2. PERSIST the choice — otherwise the next cold start reads the device
 *     locale again and reverts it;
 *  3. apply the layout direction — React Native can only do this on reload
 *     (see src/i18n/rtl.ts), and doing only half of it is how you get the
 *     half-flipped UI that feels broken.
 *
 * Urdu ⇄ Roman Urdu is the interesting pair: same language, different script
 * AND different direction, so it triggers the reload just as Urdu ⇄ English
 * does. Roman Urdu ⇄ English does not — both are LTR — so that switch is
 * instant.
 *
 * The server is told too, when there is an account to tell: it renders SMS in
 * the recipient's stored locale, and a user who reads Roman Urdu because their
 * handset mangles Nastaliq should not keep receiving Nastaliq texts. Failure
 * is swallowed — the UI language is a local preference first, and a dropped
 * request must not block it.
 */
const LANGUAGE_LABEL_KEY: Record<Locale, string> = {
  [Locale.UR]: 'settings.urdu',
  [Locale.UR_LATN]: 'settings.romanUrdu',
  [Locale.EN]: 'settings.english',
};

function LanguageRow() {
  const { t, i18n: active } = useTranslation();
  const signedIn = useAuthStore((s) => s.accessToken !== null);

  const choose = async (locale: Locale) => {
    if (active.language === locale) return;

    await i18n.changeLanguage(locale);
    await saveLocale(locale);

    if (signedIn) {
      void api('/auth/locale', { method: 'PATCH', body: { locale } }).catch(() => undefined);
    }

    await applyLayoutDirection(locale);
  };

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="bodyMd" color={colors.onSurfaceVariant}>
        {t('settings.language')}
      </Text>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        {LOCALES.map((locale) => {
          const selected = active.language === locale;
          return (
            <Pressable
              key={locale}
              onPress={() => void choose(locale)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={{
                flex: 1,
                minHeight: spacing.touchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: spacing.base,
                borderRadius: radius.md,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? colors.primary : roles.cardBorder,
                backgroundColor: selected ? colors.primaryFixed : roles.cardBackground,
              }}
            >
              {/* Each language names itself in its own script, so a reader can
                  find their language without already being able to read the
                  one currently active. */}
              <Text variant="bodyMd" center>
                {t(LANGUAGE_LABEL_KEY[locale])}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
