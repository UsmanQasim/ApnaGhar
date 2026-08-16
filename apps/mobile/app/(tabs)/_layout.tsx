import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors, spacing, typography } from '@ghar/ui';

/**
 * Bottom navigation.
 *
 * Deliberate divergence from the Stitch mock: the mock orders the tabs
 * ہوم → تلاش → … from the LEFT, which is left-to-right ordering inside an RTL
 * layout. Declared in logical order here and left to RTL to flip, `ہوم` lands
 * on the RIGHT — where an Urdu reader's eye and thumb both start.
 * See docs/design/README.md §4.
 *
 * Labels are Urdu but secondary to the icon: DESIGN.md forbids text-only
 * navigation, because a user who cannot read still has to find their way.
 */
export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onPrimary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarActiveBackgroundColor: colors.primary,
        tabBarStyle: {
          backgroundColor: colors.surfaceContainerLow,
          height: spacing.touchTarget + spacing.lg,
          paddingBottom: spacing.xs,
          paddingTop: spacing.xs,
          borderTopWidth: 0,
        },
        tabBarItemStyle: {
          minHeight: spacing.touchTarget,
          borderRadius: spacing.md,
          marginHorizontal: spacing.base,
        },
        tabBarLabelStyle: {
          fontFamily: typography.bodyMd.fontFamily,
          fontSize: 12,
          // Nastaliq needs vertical room even at label size, or the descenders
          // clip against the tab bar edge.
          lineHeight: 20,
          includeFontPadding: false,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('nav.home') }} />
      <Tabs.Screen name="search" options={{ title: t('nav.search') }} />
      <Tabs.Screen name="post" options={{ title: t('nav.post') }} />
      <Tabs.Screen name="dashboard" options={{ title: t('nav.dashboard') }} />
      <Tabs.Screen name="profile" options={{ title: t('nav.profile') }} />
    </Tabs>
  );
}
