import { useInfiniteQuery, useMutation, useQuery, type InfiniteData } from '@tanstack/react-query';
import * as Crypto from 'expo-crypto';
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { toAppError, unwrap, unwrapMaybe } from '../../lib/errors';
import { uploadForModeration } from '../../lib/media';
import { qk, queryClient } from '../../lib/query';
import { readJson, storage, writeJson } from '../../lib/storage';
import { supabase, type Tables } from '../../lib/supabase';
import { startSpan } from '../../lib/telemetry';

export type Message = Pick<
  Tables<'messages'>,
  'id' | 'conversation_id' | 'sender_id' | 'body' | 'image_path' | 'image_status' | 'status' | 'created_at'
> & { pending?: boolean; failed?: string };

const PAGE = 40;
const COLUMNS = 'id, conversation_id, sender_id, body, image_path, image_status, status, created_at';

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async () => unwrap(await supabase.from('my_chats').select('*').order('last_at', { ascending: false, nullsFirst: false })),
  });
}

// -----------------------------------------------------------------------------
// Offline outbox (architecture §Mobile): client UUIDs make inserts idempotent.
// -----------------------------------------------------------------------------
const outboxKey = (conversationId: string) => `outbox.${conversationId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, Message[]>();

function readOutbox(conversationId: string): Message[] {
  if (!cache.has(conversationId)) cache.set(conversationId, readJson<Message[]>(outboxKey(conversationId), []));
  return cache.get(conversationId)!;
}

function writeOutbox(conversationId: string, items: Message[]) {
  cache.set(conversationId, items);
  if (items.length) writeJson(outboxKey(conversationId), items);
  else storage.remove(outboxKey(conversationId));
  listeners.forEach((l) => l());
}

function useOutbox(conversationId: string) {
  return useSyncExternalStore(
    useCallback((cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    }, []),
    () => readOutbox(conversationId),
  );
}

function upsertMessage(conversationId: string, message: Message) {
  queryClient.setQueryData<InfiniteData<Message[]>>(qk.messages(conversationId), (data) => {
    if (!data) return data;
    const exists = data.pages.some((page) => page.some((m) => m.id === message.id));
    const pages = exists
      ? data.pages.map((page) => page.map((m) => (m.id === message.id ? message : m)))
      : [[message, ...(data.pages[0] ?? [])], ...data.pages.slice(1)];
    return { ...data, pages };
  });
}

async function flushOutbox(conversationId: string) {
  for (const item of readOutbox(conversationId)) {
    if (item.failed) continue;
    const done = startSpan('chat_delivery');
    const { data, error } = await supabase
      .from('messages')
      .insert({ id: item.id, conversation_id: conversationId, sender_id: item.sender_id, body: item.body })
      .select(COLUMNS)
      .single();
    if (error && error.code !== '23505') {
      const appError = toAppError(error);
      if (appError.code === 'NETWORK') return; // stay queued; retried on reconnect
      writeOutbox(conversationId, readOutbox(conversationId).map((m) => (m.id === item.id ? { ...m, failed: appError.message } : m)));
      continue;
    }
    done();
    writeOutbox(conversationId, readOutbox(conversationId).filter((m) => m.id !== item.id));
    if (data) upsertMessage(conversationId, data);
  }
}

/** CH-1: history + Realtime + local outbox, newest first (for an inverted list). */
export function useMessages(conversationId: string) {
  const query = useInfiniteQuery({
    queryKey: qk.messages(conversationId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      // Senders can read their own deleted rows (RLS); the chat never shows them.
      let q = supabase
        .from('messages')
        .select(COLUMNS)
        .eq('conversation_id', conversationId)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(PAGE);
      if (pageParam) q = q.lt('created_at', pageParam);
      return unwrap(await q) as Message[];
    },
    getNextPageParam: (last) => (last.length === PAGE ? last[last.length - 1]?.created_at : undefined),
  });

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          if (payload.eventType === 'DELETE') return;
          const row = payload.new as Message;
          if (row.status === 'rejected') {
            queryClient.setQueryData<InfiniteData<Message[]>>(qk.messages(conversationId), (data) =>
              data ? { ...data, pages: data.pages.map((p) => p.filter((m) => m.id !== row.id)) } : data,
            );
          } else {
            upsertMessage(conversationId, row);
          }
        },
      )
      .subscribe();

    void flushOutbox(conversationId);
    const appState = AppState.addEventListener('change', (s) => s === 'active' && void flushOutbox(conversationId));
    const timer = setInterval(() => readOutbox(conversationId).length && void flushOutbox(conversationId), 15_000);
    return () => {
      void supabase.removeChannel(channel);
      appState.remove();
      clearInterval(timer);
    };
  }, [conversationId]);

  const outbox = useOutbox(conversationId);
  const messages = useMemo(() => {
    const server = query.data?.pages.flat() ?? [];
    const seen = new Set(server.map((m) => m.id));
    const queued = outbox.filter((m) => !seen.has(m.id)).map((m) => ({ ...m, pending: true }));
    return [...queued.reverse(), ...server];
  }, [query.data, outbox]);

  return { ...query, messages };
}

export function sendMessage(conversationId: string, senderId: string, body: string) {
  const message: Message = {
    id: Crypto.randomUUID(),
    conversation_id: conversationId,
    sender_id: senderId,
    body: body.trim(),
    image_path: null,
    image_status: null,
    status: 'visible',
    created_at: new Date().toISOString(),
  };
  writeOutbox(conversationId, [...readOutbox(conversationId), message]);
  void flushOutbox(conversationId);
}

export function retryMessage(conversationId: string, messageId: string) {
  writeOutbox(conversationId, readOutbox(conversationId).map((m) => (m.id === messageId ? { ...m, failed: undefined } : m)));
  void flushOutbox(conversationId);
}

export function discardMessage(conversationId: string, messageId: string) {
  writeOutbox(conversationId, readOutbox(conversationId).filter((m) => m.id !== messageId));
}

/** CH-2: chat photos are moderated before anyone else can see them. */
export function useSendPhoto(conversationId: string) {
  return useMutation({
    mutationFn: (uri: string) => uploadForModeration(uri, { kind: 'chat', conversationId, messageId: Crypto.randomUUID() }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.messages(conversationId) }),
  });
}

/** "Delete for everyone" is open for this long after sending (delete_message re-checks). */
export const DELETE_FOR_EVERYONE_MS = 10 * 60_000;

export const canDeleteForEveryone = (m: Message, userId: string, now = Date.now()) =>
  m.sender_id === userId && !m.pending && !m.failed && now - Date.parse(m.created_at) < DELETE_FOR_EVERYONE_MS;

function dropFromCache(conversationId: string, ids: string[]) {
  const gone = new Set(ids);
  queryClient.setQueryData<InfiniteData<Message[]>>(qk.messages(conversationId), (data) =>
    data ? { ...data, pages: data.pages.map((p) => p.filter((m) => !gone.has(m.id))) } : data,
  );
  writeOutbox(conversationId, readOutbox(conversationId).filter((m) => !gone.has(m.id)));
}

/** Delete for everyone: one or more of your own messages sent in the last 10 minutes. */
export function useDeleteMessage(conversationId: string) {
  return useMutation({
    mutationFn: async (messageIds: string[]) => {
      for (const id of messageIds) unwrap(await supabase.rpc('delete_message', { p_message_id: id }));
      return messageIds;
    },
    onSuccess: (ids) => dropFromCache(conversationId, ids),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.messages(conversationId) }),
  });
}

/** Delete for me: hidden for this account only; others still see the messages. */
export function useHideMessages(conversationId: string) {
  return useMutation({
    mutationFn: async (messages: Message[]) => {
      const local = messages.filter((m) => m.pending || m.failed).map((m) => m.id);
      const server = messages.filter((m) => !m.pending && !m.failed).map((m) => m.id);
      if (server.length) unwrap(await supabase.rpc('hide_messages', { p_message_ids: server }));
      return [...local, ...server];
    },
    onSuccess: (ids) => dropFromCache(conversationId, ids),
  });
}

export function useConversation(conversationId: string) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () =>
      unwrapMaybe(await supabase.from('my_chats').select('*').eq('conversation_id', conversationId).maybeSingle()),
  });
}

export function useMuted(conversationId: string, userId: string) {
  return useQuery({
    queryKey: ['mute', conversationId],
    queryFn: async () =>
      Boolean(
        unwrapMaybe(await supabase.from('conversation_mutes').select('user_id').eq('conversation_id', conversationId).eq('user_id', userId).maybeSingle()),
      ),
  });
}
