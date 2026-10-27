import '../global.css';
import React from 'react';
import { StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HeroUINativeProvider } from 'heroui-native';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { queryCachePersister } from '../src/lib/storage';
import { YuvomeetProvider } from '../src/lib/store';
import '../src/lib/i18n';
import { Colors } from '../src/theme/tokens';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24, // 24h offline cache retention in MMKV
      retry: 1,
    },
  },
});

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <HeroUINativeProvider>
        <SafeAreaProvider>
          <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister: queryCachePersister }}
          >
            <YuvomeetProvider>
              <StatusBar style="light" backgroundColor={Colors.background} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: styles.screenContent,
                  animation: 'fade_from_bottom',
                }}
              />
            </YuvomeetProvider>
          </PersistQueryClientProvider>
        </SafeAreaProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenContent: {
    backgroundColor: Colors.background,
  },
});
