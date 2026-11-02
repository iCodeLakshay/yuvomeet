import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorScreen } from '../src/features/errors/ErrorScreen';
import { OfflineBanner } from '../src/features/navigation/OfflineBanner';
import { wireSessionExpiry } from '../src/features/session/expiry';
import { SessionProvider, useSession } from '../src/features/session/SessionProvider';
import { wireNetworkAndFocus } from '../src/lib/network';
import { CACHE_BUSTER, queryClient, queryPersister } from '../src/lib/query';
import { initTelemetry, wrapRoot } from '../src/lib/telemetry';
import { colors, DialogHost, ToastHost } from '../src/ui';

initTelemetry();
wireNetworkAndFocus();
wireSessionExpiry();
void SplashScreen.preventAutoHideAsync();
void SystemUI.setBackgroundColorAsync(colors.bg);

function Routes() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'fade_from_bottom' }}>
      <Stack.Protected guard={status === 'signed_out'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'onboarding'}>
        <Stack.Screen name="(onboarding)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'active'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'restricted'}>
        <Stack.Screen name="suspended" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signed_out'}>
        <Stack.Screen name="(account)" />
      </Stack.Protected>
    </Stack>
  );
}

function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: 24 * 3_600_000, buster: CACHE_BUSTER }}>
          <SessionProvider>
            <StatusBar style="light" />
            <Routes />
            <OfflineBanner />
            <DialogHost />
            <ToastHost />
          </SessionProvider>
        </PersistQueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Crash recovery for anything below the root (expo-router renders this instead of the layout). */
export const ErrorBoundary = ErrorScreen;

export default wrapRoot(RootLayout);
