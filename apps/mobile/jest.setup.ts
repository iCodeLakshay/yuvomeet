// Test environment: public config and in-memory stand-ins for native modules.
process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

jest.mock('react-native-mmkv', () => {
  const make = () => {
    const data = new Map<string, string>();
    return {
      getString: (k: string) => data.get(k),
      set: (k: string, v: string) => void data.set(k, String(v)),
      remove: (k: string) => data.delete(k),
      contains: (k: string) => data.has(k),
      getAllKeys: () => [...data.keys()],
      clearAll: () => data.clear(),
    };
  };
  return { createMMKV: make };
});

jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));

jest.mock('@sentry/react-native', () => ({
  init: jest.fn(),
  captureException: jest.fn(),
  setUser: jest.fn(),
  setMeasurement: jest.fn(),
  wrap: (c: unknown) => c,
}));

jest.mock('posthog-react-native', () => jest.fn().mockImplementation(() => ({ capture: jest.fn(), identify: jest.fn(), reset: jest.fn() })));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
}));

// Expo's dev-server socket needs a Metro bundle URL, which tests do not have.
jest.mock('expo/src/async-require/messageSocket', () => ({}));

jest.mock('expo-crypto', () => ({
  randomUUID: () => require('crypto').randomUUID(),
  getRandomBytes: (n: number) => new Uint8Array(n),
  digestStringAsync: jest.fn(async () => 'digest'),
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
}));

// Uploads and signed URLs need native file APIs; component tests only render images.
jest.mock('./src/lib/media', () => ({
  useSignedUrl: () => undefined,
  pickImage: jest.fn(),
  uploadForModeration: jest.fn(),
}));

// Reanimated 4 runs on the worklets runtime, which has its own Jest stand-in.
jest.mock('react-native-worklets', () => require('react-native-worklets/src/mock'));

// Navigation is not under test here; components only call the imperative router.
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), navigate: jest.fn(), canGoBack: () => true, dismissTo: jest.fn() },
  useLocalSearchParams: () => ({}),
  Redirect: () => null,
}));
