import { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, Pressable, View, type ViewToken } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';

import { PriceVisibility, PropertyPurpose } from '@ghar/shared';
import { colors, radius, spacing } from '@ghar/ui';

import { api, toPaisa } from '../../src/api/client';
import { IconButton } from '../../src/components/Button';
import { PricePill } from '../../src/components/PricePill';
import { Text } from '../../src/components/Text';
import { useFormat } from '../../src/theme/useFormat';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeedItem {
  id: string;
  titleUr: string;
  descriptionUr: string | null;
  pricePaisa: string | null;
  priceVisibility: PriceVisibility;
  city: string;
  locality: string | null;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string | null;
  playbackUrl: string | null;
}

/**
 * The video feed — the product's front door.
 *
 * Deliberately thumbnail-first with tap-to-play rather than autoplay. Autoplay
 * on a 3G connection burns an agent's customers' data allowance and makes the
 * app feel slow; a still frame renders instantly and the user chooses what to
 * spend bandwidth on.
 */
export default function FeedScreen() {
  const router = useRouter();
  const [purpose, setPurpose] = useState<PropertyPurpose>(PropertyPurpose.SALE);
  const [activeId, setActiveId] = useState<string | null>(null);

  const feed = useInfiniteQuery({
    queryKey: ['feed', purpose],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) =>
      api<{ items: FeedItem[]; nextCursor: string | null }>('/search', {
        method: 'POST',
        body: { purpose, sort: 'relevance', hasVideo: true, cursor: pageParam, limit: 10 },
      }),
    getNextPageParam: (last) => last.nextCursor,
  });

  // Only the fully-visible card plays. Two videos decoding at once on a low-end
  // Android device drops frames badly.
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    setActiveId((viewableItems[0]?.item as FeedItem | undefined)?.id ?? null);
  }).current;

  const items = feed.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.onSurface }}>
      <FilterChips purpose={purpose} onChange={setPurpose} />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        onEndReached={() => void feed.fetchNextPage()}
        onEndReachedThreshold={2}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        renderItem={({ item }) => (
          <FeedCard
            item={item}
            active={item.id === activeId}
            onOpen={() => router.push(`/property/${item.id}`)}
          />
        )}
      />
    </View>
  );
}

function FeedCard({
  item,
  active,
  onOpen,
}: {
  item: FeedItem;
  active: boolean;
  onOpen: () => void;
}) {
  const { t } = useTranslation();
  const format = useFormat();

  /**
   * Read-aloud. For a user who cannot read, this IS the listing — so it speaks
   * the price and location too, not just the description, and in the same
   * order a sighted reader would take them in.
   */
  const speak = useCallback(() => {
    const parts = [
      item.titleUr,
      [item.locality, item.city].filter(Boolean).join('، '),
      item.priceVisibility === PriceVisibility.ON_REQUEST
        ? t('property.priceOnRequest')
        : format.price(toPaisa(item.pricePaisa)),
      item.descriptionUr ?? '',
    ];
    Speech.speak(parts.filter(Boolean).join('۔ '), { language: 'ur-PK', rate: 0.9 });
  }, [item, t, format]);

  return (
    <Pressable onPress={onOpen} style={{ height: SCREEN_HEIGHT, justifyContent: 'flex-end' }}>
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: colors.inverseSurface,
        }}
      />

      <View style={{ padding: spacing.md, gap: spacing.xs }}>
        <PricePill pricePaisa={toPaisa(item.pricePaisa)} visibility={item.priceVisibility} />

        <Text variant="headlineSm" color={colors.surfaceContainerLowest}>
          {item.titleUr}
        </Text>
        <Text variant="bodyMd" color={colors.surfaceContainerHighest}>
          {[item.locality, item.city].filter(Boolean).join('، ')}
        </Text>

        {item.descriptionUr ? (
          <Text variant="bodyMd" color={colors.surfaceContainerHighest} numberOfLines={3}>
            {item.descriptionUr}
          </Text>
        ) : null}

        <IconButton
          onPress={speak}
          label={t('common.listen')}
          background={colors.surfaceContainerLowest}
        >
          <Text variant="bodyMd">🔊</Text>
        </IconButton>
      </View>
    </Pressable>
  );
}

function FilterChips({
  purpose,
  onChange,
}: {
  purpose: PropertyPurpose;
  onChange: (value: PropertyPurpose) => void;
}) {
  const { t } = useTranslation();

  return (
    <View
      style={{
        position: 'absolute',
        top: spacing.xl,
        // `start` rather than `left`: under RTL this anchors to the right,
        // which is where an Urdu reader's eye lands first.
        start: spacing.md,
        end: spacing.md,
        zIndex: 1,
        flexDirection: 'row',
        gap: spacing.xs,
      }}
    >
      {[PropertyPurpose.SALE, PropertyPurpose.RENT].map((value) => {
        const active = purpose === value;
        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              minHeight: spacing.touchTarget,
              justifyContent: 'center',
              paddingHorizontal: spacing.md,
              borderRadius: radius.full,
              backgroundColor: active ? colors.primary : colors.surfaceContainerLowest,
            }}
          >
            <Text variant="bodyMd" color={active ? colors.onPrimary : colors.onSurface}>
              {t(value === PropertyPurpose.SALE ? 'property.forSale' : 'property.forRent')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
