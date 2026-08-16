import { Modal, Pressable, ScrollView, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PropertyPurpose, PropertyType } from '@ghar/shared';
import { colors, radius, roles, spacing, typography } from '@ghar/ui';

import { useSearchStore, type SortKey } from '../store/search';
import { Button } from './Button';
import { Icon } from './Icon';
import { Text } from './Text';

const SORTS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: 'relevance', label: 'search.sort.relevance' },
  { key: 'newest', label: 'search.sort.newest' },
  { key: 'price_asc', label: 'search.sort.priceAsc' },
  { key: 'price_desc', label: 'search.sort.priceDesc' },
  { key: 'nearest', label: 'search.sort.nearest' },
];

const TYPE_LABELS: Record<PropertyType, string> = {
  [PropertyType.HOUSE]: 'property.types.house',
  [PropertyType.FLAT]: 'property.types.flat',
  [PropertyType.PLOT]: 'property.types.plot',
  [PropertyType.SHOP]: 'property.types.shop',
  [PropertyType.OFFICE]: 'property.types.office',
  [PropertyType.WAREHOUSE]: 'property.types.warehouse',
};

interface Props {
  visible: boolean;
  onClose: () => void;
  resultCount: number | null;
}

/**
 * Filters, as a sheet rather than a separate screen.
 *
 * Prices are entered in RUPEES and stored in PAISA. The user never sees a
 * paisa figure — "50 لاکھ" is what they think in, and asking them to type
 * 5000000 would be both wrong and unusable.
 */
export function FilterSheet({ visible, onClose, resultCount }: Props) {
  const { t } = useTranslation();
  const filters = useSearchStore((s) => s.filters);
  const set = useSearchStore((s) => s.set);
  const toggleType = useSearchStore((s) => s.toggleType);
  const clear = useSearchStore((s) => s.clear);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0b1c3088', justifyContent: 'flex-end' }}>
        <View
          style={{
            maxHeight: '88%',
            backgroundColor: colors.surface,
            borderTopStartRadius: radius.xl,
            borderTopEndRadius: radius.xl,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: roles.cardBorder,
            }}
          >
            <Text variant="headlineSm" style={{ flex: 1 }}>
              {t('search.filters')}
            </Text>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t('common.close')}
              hitSlop={spacing.md}
              style={{ minWidth: spacing.touchTarget, minHeight: spacing.touchTarget, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name="close" size={20} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: spacing.md, gap: spacing.lg }}>
            <Group label={t('search.purpose')}>
              <Row>
                <Toggle
                  label={t('property.forSale')}
                  active={filters.purpose === PropertyPurpose.SALE}
                  onPress={() =>
                    set({ purpose: filters.purpose === PropertyPurpose.SALE ? null : PropertyPurpose.SALE })
                  }
                />
                <Toggle
                  label={t('property.forRent')}
                  active={filters.purpose === PropertyPurpose.RENT}
                  onPress={() =>
                    set({ purpose: filters.purpose === PropertyPurpose.RENT ? null : PropertyPurpose.RENT })
                  }
                />
              </Row>
            </Group>

            <Group label={t('search.anyType')}>
              <Row wrap>
                {Object.values(PropertyType).map((type) => (
                  <Toggle
                    key={type}
                    label={t(TYPE_LABELS[type])}
                    active={filters.type.includes(type)}
                    onPress={() => toggleType(type)}
                  />
                ))}
              </Row>
            </Group>

            <Group label={t('search.priceRange')}>
              <Row>
                <RupeeInput
                  label={t('search.minPrice')}
                  paisa={filters.minPricePaisa}
                  onChange={(value) => set({ minPricePaisa: value })}
                />
                <RupeeInput
                  label={t('search.maxPrice')}
                  paisa={filters.maxPricePaisa}
                  onChange={(value) => set({ maxPricePaisa: value })}
                />
              </Row>
            </Group>

            <Group label={t('search.bedroomsAtLeast')}>
              <Row wrap>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Toggle
                    key={n}
                    label={String(n)}
                    active={filters.bedrooms === n}
                    onPress={() => set({ bedrooms: filters.bedrooms === n ? null : n })}
                  />
                ))}
              </Row>
            </Group>

            <Group label={t('search.sortBy')}>
              <Row wrap>
                {SORTS.map((option) => (
                  <Toggle
                    key={option.key}
                    label={t(option.label)}
                    active={filters.sort === option.key}
                    onPress={() => set({ sort: option.key })}
                  />
                ))}
              </Row>
            </Group>

            <Row wrap>
              <Toggle
                label={t('search.onlyWithVideo')}
                active={filters.hasVideo}
                onPress={() => set({ hasVideo: !filters.hasVideo })}
              />
              <Toggle
                label={t('search.onlyVerified')}
                active={filters.verifiedAgentsOnly}
                onPress={() => set({ verifiedAgentsOnly: !filters.verifiedAgentsOnly })}
              />
            </Row>
          </ScrollView>

          <View
            style={{
              flexDirection: 'row',
              gap: spacing.sm,
              padding: spacing.md,
              borderTopWidth: 1,
              borderTopColor: roles.cardBorder,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button label={t('search.clearFilters')} variant="secondary" onPress={clear} />
            </View>
            <View style={{ flex: 2 }}>
              <Button
                label={
                  resultCount === null
                    ? t('common.apply')
                    : t('search.showResults', { count: resultCount })
                }
                onPress={onClose}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text variant="bodyLg">{label}</Text>
      {children}
    </View>
  );
}

function Row({ children, wrap }: { children: React.ReactNode; wrap?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: wrap ? 'wrap' : 'nowrap' }}>
      {children}
    </View>
  );
}

function Toggle({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={{
        minHeight: spacing.touchTarget,
        justifyContent: 'center',
        paddingHorizontal: spacing.md,
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.primary : roles.cardBorder,
        backgroundColor: active ? colors.primaryFixed : roles.cardBackground,
      }}
    >
      <Text variant="bodyMd">{label}</Text>
    </Pressable>
  );
}

/** Rupees in, paisa out. Empty means "no bound", not zero. */
function RupeeInput({
  label,
  paisa,
  onChange,
}: {
  label: string;
  paisa: number | null;
  onChange: (paisa: number | null) => void;
}) {
  return (
    <View style={{ flex: 1, gap: spacing.base }}>
      <Text variant="labelSm" color={colors.onSurfaceVariant}>
        {label}
      </Text>
      <TextInput
        value={paisa === null ? '' : String(Math.round(paisa / 100))}
        onChangeText={(text) => {
          const digits = text.replace(/[^0-9]/g, '');
          onChange(digits === '' ? null : Number(digits) * 100);
        }}
        keyboardType="number-pad"
        accessibilityLabel={label}
        style={{
          minHeight: spacing.touchTarget,
          borderWidth: 1,
          borderColor: roles.cardBorder,
          borderRadius: radius.md,
          paddingHorizontal: spacing.sm,
          backgroundColor: roles.cardBackground,
          fontFamily: typography.numberMd.fontFamily,
          fontSize: typography.numberMd.fontSize,
          color: colors.onSurface,
          textAlign: 'left',
          writingDirection: 'ltr',
        }}
      />
    </View>
  );
}
