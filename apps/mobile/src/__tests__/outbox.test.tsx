import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { resetOutboxes, sendMessage, useHideMessages, type Message } from '../features/chat/api';
import { queryClient } from '../lib/query';
import { readJson, storage } from '../lib/storage';

// The outbox is exercised against a fake PostgREST insert: first offline, then online.
const mockInsertResult = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: () => ({ select: () => ({ single: () => mockInsertResult() }) }) }),
    rpc: jest.fn(async () => ({ data: null, error: null })),
  },
}));

const CONVO = 'c0000000-0000-4000-8000-000000000001';
const ME = 'u0000000-0000-4000-8000-000000000001';
const queued = () => readJson<{ id: string }[]>(`outbox.${CONVO}`, []);
const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)));

describe('chat outbox (offline send, CH-1)', () => {
  beforeEach(() => {
    mockInsertResult.mockReset();
    storage.remove(`outbox.${CONVO}`);
    resetOutboxes();
  });

  it('keeps a message queued while the network is down', async () => {
    mockInsertResult.mockResolvedValue({ data: null, error: new TypeError('Network request failed') });
    sendMessage(CONVO, ME, '  see you at 7  ');
    await flush();
    expect(queued()).toHaveLength(1);
  });

  it('removes the message from the outbox once the server accepts it', async () => {
    mockInsertResult.mockImplementation(async () => ({ data: { id: queued()[0]?.id }, error: null }));
    sendMessage(CONVO, ME, 'hello');
    await flush();
    expect(queued()).toHaveLength(0);
  });

  it('"Delete for me" on an unsent message drops it from the outbox so it is never sent', async () => {
    mockInsertResult.mockResolvedValue({ data: null, error: new TypeError('Network request failed') });
    sendMessage(CONVO, ME, 'oops');
    await flush();
    const [item] = queued();
    expect(item).toBeDefined();

    const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useHideMessages(CONVO), { wrapper });
    await act(async () => {
      await result.current.mutateAsync([{ id: item!.id, pending: true } as Message]);
    });
    await waitFor(() => expect(queued()).toHaveLength(0));
  });
});
