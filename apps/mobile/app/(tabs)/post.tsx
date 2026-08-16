import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { EXTRA_LISTING_FEE_PAISA, PropertyPurpose, PropertyType } from '@ghar/shared';
import { colors, radius, roles, spacing } from '@ghar/ui';

import { api, toPaisa } from '../../src/api/client';
import { Button } from '../../src/components/Button';
import { Text } from '../../src/components/Text';
import { useFormat } from '../../src/theme/useFormat';
import { DetailsStep, LocationStep, PriceStep, PrivacyStep } from '../../src/wizard/steps';
import { useDraft } from '../../src/wizard/useDraft';

type Step = 'purpose' | 'type' | 'details' | 'location' | 'media' | 'price' | 'privacy' | 'review';

const STEPS: Step[] = ['purpose', 'type', 'details', 'location', 'media', 'price', 'privacy', 'review'];

const STEP_LABEL: Record<Step, string> = {
  purpose: 'create.stepPurpose',
  type: 'create.stepType',
  details: 'create.stepDetails',
  location: 'create.stepLocation',
  media: 'create.stepPhotos',
  price: 'create.stepPrice',
  privacy: 'create.stepPrivacy',
  review: 'create.stepReview',
};

interface Quote {
  withinIncludedQuota: boolean;
  feePaisa: string | number;
  includedListings: number | null;
  activeListings: number;
}

export default function PostScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { draft, update, clear, toPayload, ensureRemoteDraft } = useDraft();

  const [stepIndex, setStepIndex] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const step = STEPS[stepIndex] as Step;

  const { data: quote } = useQuery<Quote>({
    queryKey: ['publish-quote', draft.id],
    queryFn: () =>
      api<Quote>(draft.id ? `/listings/${draft.id}/publish-quote` : '/listings/publish-quote'),
  });

  const parsed = toPayload();
  const canAdvance = advanceable(step, draft, parsed.success);

  async function next() {
    setError(null);

    // The property row must exist before media can attach to it.
    if (step === 'location') {
      const id = await ensureRemoteDraft();
      if (!id) {
        setError('errors.somethingWrong');
        return;
      }
    }

    if (step !== 'review') {
      setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
      return;
    }

    await publish();
  }

  async function publish() {
    if (!draft.id) return;
    setPublishing(true);
    try {
      await api(`/listings/${draft.id}/publish`, {
        method: 'POST',
        // Deferred to the month-end invoice by default. Blocking publication
        // on an immediate payment would mean a listing sits dead while the
        // agent finds his wallet PIN.
        body: { payListingFeeNow: false },
      });
      await clear();
      await queryClient.invalidateQueries({ queryKey: ['billing-summary'] });
      router.replace('/(tabs)/dashboard');
    } catch {
      setError('errors.somethingWrong');
    } finally {
      setPublishing(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.surface }}>
      <ProgressBar current={stepIndex + 1} total={STEPS.length} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.md, gap: spacing.md }}
        keyboardShouldPersistTaps="handled"
      >
        <Text variant="headlineMd">{t(STEP_LABEL[step])}</Text>

        {quote ? <FeeNotice quote={quote} /> : null}

        {step === 'purpose' ? (
          <ChoiceGrid
            options={[
              { value: PropertyPurpose.SALE, label: t('property.forSale') },
              { value: PropertyPurpose.RENT, label: t('property.forRent') },
            ]}
            selected={draft.purpose}
            onSelect={(purpose) => update({ purpose })}
          />
        ) : null}

        {step === 'type' ? (
          <ChoiceGrid
            options={Object.values(PropertyType).map((value) => ({
              value,
              label: t(`property.types.${value}`),
            }))}
            selected={draft.type}
            onSelect={(type) => update({ type })}
          />
        ) : null}

        {step === 'details' ? <DetailsStep draft={draft} update={update} /> : null}
        {step === 'location' ? <LocationStep draft={draft} update={update} /> : null}
        {step === 'price' ? <PriceStep draft={draft} update={update} /> : null}
        {step === 'privacy' ? <PrivacyStep draft={draft} update={update} /> : null}

        {step === 'media' ? (
          <Text variant="bodyMd" color={colors.onSurfaceVariant}>
            {t('create.addPhotos')}
          </Text>
        ) : null}

        {step === 'review' ? <Review draft={draft} valid={parsed.success} /> : null}

        {error ? (
          <Text variant="bodyMd" color={colors.error}>
            {t(error)}
          </Text>
        ) : null}
      </ScrollView>

      <View style={{ padding: spacing.md, gap: spacing.xs }}>
        <Button
          label={step === 'review' ? t('create.publish') : t('common.next')}
          onPress={() => void next()}
          disabled={!canAdvance}
          loading={publishing}
        />
        {stepIndex > 0 ? (
          <Button
            label={t('common.back')}
            variant="ghost"
            onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
          />
        ) : null}
      </View>
    </View>
  );
}

/** Per-step gating. Media is optional — a listing with no photo is weak, not invalid. */
function advanceable(step: Step, draft: ReturnType<typeof useDraft>['draft'], valid: boolean): boolean {
  switch (step) {
    case 'purpose':
      return draft.purpose !== null;
    case 'type':
      return draft.type !== null;
    case 'details':
      return draft.titleUr.trim().length >= 3 && Number(draft.areaValue) > 0;
    case 'location':
      return draft.city.trim().length >= 2;
    case 'review':
      return valid && draft.id !== null;
    default:
      return true;
  }
}

function Review({ draft, valid }: { draft: ReturnType<typeof useDraft>['draft']; valid: boolean }) {
  const { t } = useTranslation();
  const format = useFormat();

  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="headlineSm">{draft.titleUr}</Text>
      <Text variant="bodyMd" color={colors.onSurfaceVariant}>
        {[draft.locality, draft.city].filter(Boolean).join('، ')}
      </Text>
      <Text variant="bodyMd">
        {format.area(Number(draft.areaValue), draft.areaUnit)}
      </Text>
      {draft.priceRupees ? (
        <Text variant="bodyLg">
          {format.price(Math.round(Number(draft.priceRupees.replace(/[^\d.]/g, '')) * 100))}
        </Text>
      ) : (
        <Text variant="bodyMd">{t('property.priceOnRequest')}</Text>
      )}

      {!valid ? (
        <Text variant="bodyMd" color={colors.error}>
          {t('errors.somethingWrong')}
        </Text>
      ) : null}
    </View>
  );
}

/**
 * The Rs 50 disclosure, shown from step one rather than at checkout.
 *
 * When the listing is free it says so plainly: an agent who assumes every
 * listing costs money posts fewer of them, which hurts him and starves the
 * marketplace.
 */
function FeeNotice({ quote }: { quote: Quote }) {
  const { t } = useTranslation();
  const format = useFormat();

  const free = quote.withinIncludedQuota;
  const fee = toPaisa(quote.feePaisa) || EXTRA_LISTING_FEE_PAISA;

  return (
    <View
      style={{
        backgroundColor: free ? colors.primaryContainer : roles.warningBackground,
        borderRadius: radius.md,
        padding: spacing.sm,
      }}
    >
      <Text variant="bodyMd" color={free ? colors.onPrimaryContainer : roles.warningText}>
        {free
          ? quote.includedListings === null
            ? t('premium.unlimitedListings')
            : t('billing.quotaUsed', {
                used: format.count(quote.activeListings),
                total: format.count(quote.includedListings ?? 0),
              })
          : t('billing.quotaFull', { price: format.price(fee) })}
      </Text>
    </View>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <View style={{ height: 6, backgroundColor: colors.surfaceContainerHigh }}>
      <View
        style={{
          // Percentage width flips automatically under RTL, so the bar fills
          // from the right for an Urdu reader.
          width: `${(current / total) * 100}%`,
          height: '100%',
          backgroundColor: colors.primary,
        }}
      />
    </View>
  );
}

function ChoiceGrid<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T | null;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
      {options.map((option) => {
        const active = selected === option.value;
        return (
          <View
            key={option.value}
            onTouchEnd={() => onSelect(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flexGrow: 1,
              flexBasis: '45%',
              minHeight: 96,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: radius.lg,
              backgroundColor: active ? colors.primary : roles.cardBackground,
              borderWidth: 1,
              borderColor: active ? colors.primary : roles.cardBorder,
            }}
          >
            <Text variant="bodyLg" color={active ? colors.onPrimary : colors.onSurface} center>
              {option.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}
