import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { createMMKV } from 'react-native-mmkv';

/**
 * Local persistence. MMKV holds the auth session, the query cache and the chat outbox;
 * it is encrypted with a random key kept in the Android keystore (expo-secure-store).
 */
const KEY_NAME = 'yuvomeet.mmkv.key';

function encryptionKey(): string {
  const existing = SecureStore.getItem(KEY_NAME);
  if (existing) return existing;
  // MMKV accepts keys up to 16 bytes: 8 random bytes as 16 hex characters.
  const created = Array.from(Crypto.getRandomBytes(8), (b) => b.toString(16).padStart(2, '0')).join('');
  SecureStore.setItem(KEY_NAME, created);
  return created;
}

export const storage = createMMKV({ id: 'yuvomeet', encryptionKey: encryptionKey() });

export const kv = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => {
    storage.remove(key);
  },
};

export function readJson<T>(key: string, fallback: T): T {
  const raw = storage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const writeJson = (key: string, value: unknown) => storage.set(key, JSON.stringify(value));
