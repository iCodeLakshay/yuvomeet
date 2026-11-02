import { focusManager, onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

type NetworkModule = typeof import('expo-network');

/**
 * expo-network is a native module. Load it defensively so a dev client built before it was
 * added keeps running (queries then assume "online", which is React Query's RN default).
 */
const Network: NetworkModule | null = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- optional native module
    return require('expo-network') as NetworkModule;
  } catch {
    return null;
  }
})();

let wired = false;

/**
 * React Query does not know about app focus or connectivity on React Native. Wire both:
 * - returning to the foreground refetches stale queries (no stale feed after a long background);
 * - going offline pauses queries and mutations, and coming back resumes and refetches them.
 */
export function wireQueryLifecycle() {
  if (wired) return;
  wired = true;

  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));

  if (!Network) return;
  onlineManager.setEventListener((setOnline) => {
    const sub = Network.addNetworkStateListener((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false));
    void Network.getNetworkStateAsync()
      .then((s) => setOnline(s.isConnected !== false && s.isInternetReachable !== false))
      .catch(() => undefined);
    return () => sub.remove();
  });
}

/** Live connectivity for UI (offline banner). True when unknown. */
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
  );
}
