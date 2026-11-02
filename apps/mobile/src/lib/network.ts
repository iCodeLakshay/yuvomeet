import NetInfo from '@react-native-community/netinfo';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { AppState } from 'react-native';

let wired = false;

/**
 * React Native has no browser online/focus events, so React Query would assume it is always
 * online and focused. Wire both to the OS: queries pause offline and refetch on reconnect,
 * and stale data refreshes when the app comes back to the foreground.
 */
export function wireNetworkAndFocus() {
  if (wired) return;
  wired = true;
  onlineManager.setEventListener((setOnline) =>
    // isInternetReachable is null until probed; only a definite false counts as offline.
    NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false)),
  );
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(onlineManager.subscribe.bind(onlineManager), () => onlineManager.isOnline());
}
