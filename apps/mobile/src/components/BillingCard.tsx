import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  EXTRA_LISTING_FEE_PAISA,
  PLANS,
  PlanCode,
  premiumSavingOrNull,
  type Paisa,
} from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { useFormat } from '../theme/useFormat';
import { Text, NumberText } from './Text';

interface Props {
  plan: PlanCode;
  activeListings: number;
  amountDuePaisa: Paisa;
  /** Actual spend over the last N cycles — drives an honest premium upsell. */
  recentSpendPaisa: Paisa;
  recentCycles: number;
  onPayNow: () => void;
  onUpgrade: () => void;
}

/**
 * Dashboard billing card.
 *
 * Every number here comes from `PLANS` and the pricing helpers in
 * `@ghar/shared`. Nothing is hardcoded — the Stitch mock advertised premium as
 * "20 لسٹنگز", which was true of an earlier model and is now wrong (premium is
 * unlimited). Reading from the shared constants means the card cannot drift
 * away from what billing actually charges. See docs/design/README.md §3.
 */
export function BillingCard({
  plan,
  activeListings,
  amountDuePaisa,
  recentSpendPaisa,
  recentCycles,
  onPayNow,
  onUpgrade,
}: Props) {
  const { t } = useTranslation();
  const format = useFormat();

  const definition = PLANS[plan];
  const unlimited = definition.includedListings === null;
  const quotaFull = !unlimited && activeListings >= (definition.includedListings ?? 0);

  // Only ever shown when premium would GENUINELY have saved this agent money,
  // based on what he actually spent — never on a theoretical listing count he
  // has never reached.
  const saving = plan === PlanCode.BASIC ? premiumSavingOrNull(recentSpendPaisa, recentCycles) : null;

  return (
    <View style={{ gap: spacing.sm }}>
      <View
        style={{
          backgroundColor: roles.cardBackground,
          borderWidth: 1,
          borderColor: roles.cardBorder,
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.sm,
        }}
      >
        <Text variant="headlineSm">{t('billing.title')}</Text>

        <Row
          label={t(plan === PlanCode.PREMIUM ? 'billing.planPremium' : 'billing.planBasic')}
          value={`${format.price(definition.pricePaisa)} / ${t('billing.perMonth')}`}
        />

        <Row
          label={t('dashboard.tabActive')}
          value={
            unlimited
              ? t('premium.unlimitedListings')
              : t('billing.quotaUsed', {
                  used: format.count(activeListings),
                  total: format.count(definition.includedListings ?? 0),
                })
          }
        />

        {quotaFull ? (
          <View
            style={{
              backgroundColor: roles.warningBackground,
              borderRadius: radius.md,
              padding: spacing.sm,
            }}
          >
            <Text variant="bodyMd" color={roles.warningText}>
              {t('billing.quotaFull', { price: format.price(EXTRA_LISTING_FEE_PAISA) })}
            </Text>
          </View>
        ) : null}

        {amountDuePaisa > 0 ? (
          <>
            <Row label={t('billing.amountDue')} value={format.priceExact(amountDuePaisa)} emphasis />
            <Button label={t('billing.payNow')} onPress={onPayNow} />
          </>
        ) : null}
      </View>

      {saving !== null ? (
        <View
          style={{
            backgroundColor: colors.tertiaryContainer,
            borderRadius: radius.lg,
            padding: spacing.md,
            gap: spacing.xs,
          }}
        >
          <Text variant="headlineSm" color={colors.onTertiaryContainer}>
            {t('premium.title')}
          </Text>
          <Text variant="bodyMd" color={colors.onTertiaryContainer}>
            {t('premium.savedLastMonths', {
              amount: format.price(saving),
              months: format.count(recentCycles),
            })}
          </Text>
          <Text variant="bodyMd" color={colors.onTertiaryContainer}>
            • {t('premium.unlimitedListings')}
          </Text>
          <Text variant="bodyMd" color={colors.onTertiaryContainer}>
            • {t('premium.topPlacement')}
          </Text>
          <Text variant="bodyMd" color={colors.onTertiaryContainer}>
            • {t('premium.verifiedBadge')}
          </Text>
          <Button
            label={t('premium.cta', { price: format.price(PLANS[PlanCode.PREMIUM].pricePaisa) })}
            onPress={onUpgrade}
            variant="tertiary"
          />
        </View>
      ) : null}
    </View>
  );
}

function Row({ label, value, emphasis }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <View
      style={{
        // `row` follows layout direction, so in RTL the label sits on the right
        // automatically. Never use row-reverse to "fix" RTL — it double-flips.
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: spacing.touchTarget,
      }}
    >
      <Text variant="bodyMd" color={colors.onSurfaceVariant}>
        {label}
      </Text>
      <NumberText variant={emphasis ? 'numberLg' : 'numberMd'} color={colors.onSurface}>
        {value}
      </NumberText>
    </View>
  );
}

function Button({
  label,
  onPress,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'tertiary';
}) {
  const background = variant === 'primary' ? colors.inverseSurface : colors.tertiaryFixed;
  const foreground = variant === 'primary' ? colors.inverseOnSurface : colors.onTertiaryFixed;

  return (
    <View
      onTouchEnd={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        backgroundColor: background,
        borderRadius: radius.md,
        // 48px floor: users with limited fine motor precision must still hit it.
        minHeight: spacing.touchTarget,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
      }}
    >
      <Text variant="bodyMd" color={foreground} center>
        {label}
      </Text>
    </View>
  );
}
