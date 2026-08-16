import { Switch, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AreaUnit, PriceVisibility, PropertyVisibility } from '@ghar/shared';
import { colors, radius, roles, spacing, typography } from '@ghar/ui';

import { Text } from '../components/Text';
import { useFormat } from '../theme/useFormat';
import type { Draft } from './useDraft';

interface StepProps {
  draft: Draft;
  update: (patch: Partial<Draft>) => void;
}

/** Right-aligned label, 48px field, focus ring in primary green. */
function Field({
  label,
  value,
  onChange,
  placeholder,
  numeric,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  numeric?: boolean;
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: spacing.base }}>
      <Text variant="bodyMd" color={colors.onSurfaceVariant}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.outline}
        // Numeric fields open the number pad: an agent typing a price should
        // never have to find the digits on an Urdu keyboard.
        keyboardType={numeric ? 'numeric' : 'default'}
        multiline={multiline}
        style={{
          minHeight: multiline ? 120 : spacing.touchTarget,
          borderWidth: 1,
          borderColor: colors.outlineVariant,
          borderRadius: radius.md,
          paddingHorizontal: spacing.md,
          paddingTop: multiline ? spacing.sm : 0,
          backgroundColor: roles.cardBackground,
          color: colors.onSurface,
          fontFamily: numeric ? typography.numberMd.fontFamily : typography.bodyMd.fontFamily,
          fontSize: numeric ? typography.numberMd.fontSize : typography.bodyMd.fontSize,
          lineHeight: multiline ? typography.bodyMd.lineHeight : undefined,
          textAlign: numeric ? 'left' : 'auto',
          writingDirection: numeric ? 'ltr' : 'auto',
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export function DetailsStep({ draft, update }: StepProps) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.md }}>
      <Field
        label={t('property.description')}
        value={draft.titleUr}
        onChange={(titleUr) => update({ titleUr })}
        placeholder="5 مرلہ خوبصورت گھر"
      />

      <Field
        label={t('create.recordDescription')}
        value={draft.descriptionUr}
        onChange={(descriptionUr) => update({ descriptionUr })}
        multiline
      />

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Field
            label={t('property.area')}
            value={draft.areaValue}
            onChange={(areaValue) => update({ areaValue })}
            numeric
          />
        </View>
        <View style={{ flex: 1 }}>
          <Chips
            label=""
            options={[
              { value: AreaUnit.MARLA, label: 'مرلہ' },
              { value: AreaUnit.KANAL, label: 'کنال' },
            ]}
            selected={draft.areaUnit}
            onSelect={(areaUnit) => update({ areaUnit })}
          />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Field
            label={t('property.bedrooms')}
            value={draft.bedrooms}
            onChange={(bedrooms) => update({ bedrooms })}
            numeric
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label={t('property.bathrooms')}
            value={draft.bathrooms}
            onChange={(bathrooms) => update({ bathrooms })}
            numeric
          />
        </View>
      </View>

      <Toggle
        label={t('property.furnished')}
        value={draft.furnished}
        onChange={(furnished) => update({ furnished })}
      />
    </View>
  );
}

export function LocationStep({ draft, update }: StepProps) {
  const { t } = useTranslation();

  return (
    <View style={{ gap: spacing.md }}>
      <Field
        label={t('property.location')}
        value={draft.city}
        onChange={(city) => update({ city })}
        placeholder="لاہور"
      />
      <Field
        label={t('search.placeholder')}
        value={draft.locality}
        onChange={(locality) => update({ locality })}
        placeholder="جوہر ٹاؤن"
      />
      <Field
        label={t('property.postedBy')}
        value={draft.addressText}
        onChange={(addressText) => update({ addressText })}
      />
    </View>
  );
}

export function PriceStep({ draft, update }: StepProps) {
  const { t } = useTranslation();
  const format = useFormat();

  const rupees = Number(draft.priceRupees.replace(/[^\d.]/g, ''));
  const onRequest = draft.priceVisibility === PriceVisibility.ON_REQUEST;

  return (
    <View style={{ gap: spacing.md }}>
      {onRequest ? null : (
        <>
          <Field
            label={t('create.stepPrice')}
            value={draft.priceRupees}
            onChange={(priceRupees) => update({ priceRupees })}
            numeric
            placeholder="8500000"
          />

          {/* Live echo in لاکھ/کروڑ. An agent typing 8500000 needs to see
              "85 لاکھ" to catch a missing or extra zero — the single most
              common and most expensive listing typo. */}
          {rupees > 0 ? (
            <View
              style={{
                backgroundColor: colors.primaryContainer,
                borderRadius: radius.md,
                padding: spacing.sm,
              }}
            >
              <Text variant="bodyLg" color={colors.onPrimaryContainer}>
                {format.price(Math.round(rupees * 100))}
              </Text>
            </View>
          ) : null}
        </>
      )}

      <Toggle
        label={t('create.hidePrice')}
        value={onRequest}
        onChange={(hide) =>
          update({
            priceVisibility: hide ? PriceVisibility.ON_REQUEST : PriceVisibility.PUBLIC,
          })
        }
      />
    </View>
  );
}

export function PrivacyStep({ draft, update }: StepProps) {
  const { t } = useTranslation();

  const options = [
    { value: PropertyVisibility.PUBLIC, label: 'visibility.public', hint: 'visibility.publicHint' },
    {
      value: PropertyVisibility.HIDDEN_FROM_AGENTS,
      label: 'visibility.hiddenFromAgents',
      hint: 'visibility.hiddenFromAgentsHint',
    },
    { value: PropertyVisibility.PRIVATE, label: 'visibility.private', hint: 'visibility.privateHint' },
  ] as const;

  return (
    <View style={{ gap: spacing.sm }}>
      {options.map((option) => {
        const active = draft.visibility === option.value;
        return (
          <View
            key={option.value}
            onTouchEnd={() => update({ visibility: option.value })}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            style={{
              minHeight: spacing.touchTarget,
              padding: spacing.md,
              borderRadius: radius.lg,
              borderWidth: active ? 2 : 1,
              borderColor: active ? colors.primary : roles.cardBorder,
              backgroundColor: roles.cardBackground,
              gap: spacing.base,
            }}
          >
            <Text variant="bodyLg">{t(option.label)}</Text>
            <Text variant="bodyMd" color={colors.onSurfaceVariant}>
              {t(option.hint)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: spacing.touchTarget,
      }}
    >
      <Text variant="bodyMd">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.outlineVariant }}
        accessibilityLabel={label}
      />
    </View>
  );
}

function Chips<T extends string>({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={{ gap: spacing.base }}>
      {label ? (
        <Text variant="bodyMd" color={colors.onSurfaceVariant}>
          {label}
        </Text>
      ) : null}
      <View style={{ flexDirection: 'row', gap: spacing.base }}>
        {options.map((option) => {
          const active = selected === option.value;
          return (
            <View
              key={option.value}
              onTouchEnd={() => onSelect(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={{
                flex: 1,
                minHeight: spacing.touchTarget,
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: radius.full,
                backgroundColor: active ? colors.primary : roles.cardBackground,
                borderWidth: 1,
                borderColor: active ? colors.primary : roles.cardBorder,
              }}
            >
              <Text variant="bodyMd" color={active ? colors.onPrimary : colors.onSurface}>
                {option.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
