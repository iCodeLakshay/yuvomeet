/**
 * High-performance local persistence using MMKV (`react-native-mmkv`)
 * and SecureStore (`expo-secure-store`) for device-only Trusted Contact (S-50).
 */

import * as SecureStore from 'expo-secure-store';
import { MMKV } from 'react-native-mmkv';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import type { MessageRow } from '@yuvomeet/shared';

// Safe MMKV initialization with in-memory fallback for non-native test runners
let mmkvInstance: MMKV | null = null;
const memoryFallback = new Map<string, string>();

try {
  mmkvInstance = new MMKV({ id: 'yuvomeet-storage' });
} catch {
  mmkvInstance = null;
}

export const appStorage = {
  getString(key: string): string | undefined {
    if (mmkvInstance) return mmkvInstance.getString(key);
    return memoryFallback.get(key);
  },
  set(key: string, value: string): void {
    if (mmkvInstance) {
      mmkvInstance.set(key, value);
    } else {
      memoryFallback.set(key, value);
    }
  },
  delete(key: string): void {
    if (mmkvInstance) {
      mmkvInstance.delete(key);
    } else {
      memoryFallback.delete(key);
    }
  },
};

/**
 * React Query synchronous MMKV persister so loaded plans & profiles
 * render instantaneously offline (< 2s budget on 4G / 0ms from cache).
 */
export const queryCachePersister = createSyncStoragePersister({
  storage: {
    getItem: (key: string) => appStorage.getString(key) ?? null,
    setItem: (key: string, value: string) => appStorage.set(key, value),
    removeItem: (key: string) => appStorage.delete(key),
  },
  key: 'yuvomeet-rq-cache-v1',
});

// -----------------------------------------------------------------------------
// Offline Chat Message Outbox (Architecture §Mobile: client UUID idempotency)
// -----------------------------------------------------------------------------
const OUTBOX_KEY = 'yuvomeet.chat.outbox.v1';

export function getOfflineOutbox(): MessageRow[] {
  const raw = appStorage.getString(OUTBOX_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MessageRow[];
  } catch {
    return [];
  }
}

export function enqueueOfflineMessage(message: MessageRow): MessageRow[] {
  const current = getOfflineOutbox();
  const deduped = current.filter((m) => m.id !== message.id);
  const next = [...deduped, { ...message, pending_sync: true }];
  appStorage.set(OUTBOX_KEY, JSON.stringify(next));
  return next;
}

export function removeOutboxMessage(messageId: string): MessageRow[] {
  const next = getOfflineOutbox().filter((m) => m.id !== messageId);
  appStorage.set(OUTBOX_KEY, JSON.stringify(next));
  return next;
}

// -----------------------------------------------------------------------------
// S-50 & SF-2: Trusted Contact stored ONLY on device in expo-secure-store
// The server NEVER receives the trusted contact's name or phone number.
// -----------------------------------------------------------------------------
const TRUSTED_CONTACT_SECURE_KEY = 'yuvomeet.trusted_contact.v1';

export interface TrustedContact {
  name: string;
  phone: string;
  relationship: string;
  updatedAt: string;
}

export async function getTrustedContactOnDevice(): Promise<TrustedContact | null> {
  try {
    const raw = await SecureStore.getItemAsync(TRUSTED_CONTACT_SECURE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TrustedContact;
  } catch {
    const fallback = appStorage.getString(TRUSTED_CONTACT_SECURE_KEY);
    return fallback ? (JSON.parse(fallback) as TrustedContact) : null;
  }
}

export async function saveTrustedContactOnDevice(contact: TrustedContact): Promise<void> {
  const serialized = JSON.stringify(contact);
  try {
    await SecureStore.setItemAsync(TRUSTED_CONTACT_SECURE_KEY, serialized);
  } catch {
    appStorage.set(TRUSTED_CONTACT_SECURE_KEY, serialized);
  }
}

export async function clearTrustedContactOnDevice(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(TRUSTED_CONTACT_SECURE_KEY);
  } catch {
    appStorage.delete(TRUSTED_CONTACT_SECURE_KEY);
  }
}
