import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { QueryClient } from '@tanstack/react-query';
import { kv } from './storage';
import { toAppError } from './errors';

/** Plans already loaded stay viewable offline (NFR reliability): the cache persists to MMKV. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 24 * 3_600_000,
      retry: (count, error) => count < 2 && toAppError(error).code === 'NETWORK',
    },
    mutations: { retry: false },
  },
});

export const queryPersister = createSyncStoragePersister({ storage: kv, key: 'yuvomeet.query-cache.v1', throttleTime: 2_000 });

/** Query keys in one place so invalidation stays consistent. */
export const qk = {
  me: ['me'] as const,
  myPhotos: ['me', 'photos'] as const,
  caps: ['me', 'caps'] as const,
  verification: ['me', 'verification'] as const,
  appeals: ['me', 'appeals'] as const,
  blocks: ['me', 'blocks'] as const,
  consents: ['me', 'consents'] as const,
  lookups: ['lookups'] as const,
  cities: ['cities'] as const,
  feed: (filters: object) => ['feed', filters] as const,
  plan: (id: string) => ['plan', id] as const,
  myPlans: ['plans', 'mine'] as const,
  roster: (planId: string) => ['plan', planId, 'roster'] as const,
  requests: (planId: string) => ['plan', planId, 'requests'] as const,
  messages: (conversationId: string) => ['messages', conversationId] as const,
  profile: (id: string) => ['profile', id] as const,
  venues: ['venues'] as const,
  venue: (id: string) => ['venue', id] as const,
  notifications: ['notifications'] as const,
  signedUrl: (bucket: string, path: string) => ['signed', bucket, path] as const,
};
