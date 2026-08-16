import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  NotoNastaliqUrdu_400Regular,
  NotoNastaliqUrdu_600SemiBold,
  NotoNastaliqUrdu_700Bold,
  useFonts as useUrduFonts,
} from '@expo-google-fonts/noto-nastaliq-urdu';
import {
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  useFonts as useSansFonts,
} from '@expo-google-fonts/plus-jakarta-sans';

import { colors } from '@ghar/ui';

import { detectLocale, initI18n } from '../src/i18n';
import { applyLayoutDirection } from '../src/i18n/rtl';

void SplashScreen.preventAutoHideAsync();

// Aggressive caching: the target user is on patchy 3G, and a feed that shows
// stale-but-instant beats a spinner every time.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 24 * 60 * 60 * 1000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [reloading, setReloading] = useState(false);

  // Fonts are BUNDLED, not fetched. Android's stock Urdu rendering is
  // inconsistent across OEM skins, and a Nastaliq fallback to a naskh face
  // changes the shape of every word on screen.
  const [urduLoaded] = useUrduFonts({
    NotoNastaliqUrdu: NotoNastaliqUrdu_400Regular,
    NotoNastaliqUrdu_600SemiBold,
    NotoNastaliqUrdu_700Bold,
  });
  const [sansLoaded] = useSansFonts({
    PlusJakartaSans: PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  useEffect(() => {
    void (async () => {
      const locale = detectLocale();

      // Must run before first render: forceRTL only applies after a reload,
      // and a half-flipped UI is worse than either direction.
      const didReload = await applyLayoutDirection(locale);
      if (didReload) {
        setReloading(true);
        return;
      }

      await initI18n(locale);
      setReady(true);
    })();
  }, []);

  const fontsLoaded = urduLoaded && sansLoaded;

  useEffect(() => {
    if (ready && fontsLoaded) void SplashScreen.hideAsync();
  }, [ready, fontsLoaded]);

  if (reloading || !ready || !fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: colors.primary }} />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={colors.surface} />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.surface },
            animation: 'slide_from_right',
          }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
