import { FlashList } from '@shopify/flash-list';
import { MAX_MESSAGE_CHARS, screenText, SCREEN_MESSAGES } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  canDeleteForEveryone,
  retryMessage,
  sendMessage,
  useConversation,
  useDeleteMessage,
  useHideMessages,
  useMessages,
  useMuted,
  useSendPhoto,
  type Message,
} from '../../../../src/features/chat/api';
import { ImageViewer } from '../../../../src/features/chat/ImageViewer';
import { MessageBubble, type Anchor, type Sender } from '../../../../src/features/chat/MessageBubble';
import { MessageMenu, type MenuItem } from '../../../../src/features/chat/MessageMenu';
import { useRoster } from '../../../../src/features/plans/api';
import { useMe } from '../../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../../src/lib/errors';
import { formatDateLong, formatPlanTime } from '../../../../src/lib/format';
import { pickImage } from '../../../../src/lib/media';
import { colors, fonts, gutter, Header, IconButton, Notice, radii, showDialog, space, Text } from '../../../../src/ui';

type Row = { type: 'day'; key: string; label: string } | { type: 'msg'; key: string; m: Message; first: boolean };

const dayKey = (iso: string) => new Date(Date.parse(iso) + 5.5 * 3_600_000).toISOString().slice(0, 10);

/** Stitch "Group Chat" (CH-1 to CH-4): plan members only, screened text, moderated photos. */
export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const convo = useConversation(id).data;
  const roster = useRoster(convo?.plan_id ?? '');
  const muted = useMuted(id, me.id).data;
  const { messages, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(id);
  const sendPhoto = useSendPhoto(id);
  const remove = useDeleteMessage(id);
  const hide = useHideMessages(id);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ m: Message; anchor: Anchor } | null>(null);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const senders = useMemo(() => new Map<string, Sender>((roster.data ?? []).map((m) => [m.user_id!, m])), [roster.data]);
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const selecting = selected != null;

  // Back leaves select mode before it leaves the chat.
  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selecting]);

  // useMessages is newest-first; FlashList v2 renders chats oldest-first from the bottom.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let lastDay = '';
    let lastSender: string | null | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i]!;
      const d = dayKey(m.created_at);
      if (d !== lastDay) {
        out.push({ type: 'day', key: `d-${d}`, label: formatDateLong(m.created_at) });
        lastDay = d;
        lastSender = undefined;
      }
      out.push({ type: 'msg', key: m.id, m, first: m.sender_id !== lastSender });
      lastSender = m.sender_id;
    }
    return out;
  }, [messages]);

  const failed = (e: unknown) => setError(errorMessage(e));

  const deleteForMe = useCallback((list: Message[]) => hide.mutate(list, { onError: failed, onSuccess: () => setSelected(null) }), [hide]);
  const deleteForEveryone = useCallback(
    (list: Message[]) => remove.mutate(list.map((m) => m.id), { onError: failed, onSuccess: () => setSelected(null) }),
    [remove],
  );

  const menuItems = useMemo<MenuItem[]>(() => {
    if (!menu) return [];
    const m = menu.m;
    const mine = m.sender_id === me.id;
    return [
      { key: 'delete_me', label: 'Delete for me', icon: 'delete-outline' },
      ...(canDeleteForEveryone(m, me.id) ? [{ key: 'delete_all', label: 'Delete for everyone', icon: 'delete-forever', danger: true } as MenuItem] : []),
      { key: 'select', label: 'Select', icon: 'check-circle-outline' },
      ...(!mine && m.sender_id ? [{ key: 'report', label: 'Report', icon: 'outlined-flag', danger: true } as MenuItem] : []),
    ];
  }, [menu, me.id]);

  const onMenu = (key: string) => {
    const m = menu?.m;
    setMenu(null);
    if (!m) return;
    if (key === 'delete_me') deleteForMe([m]);
    else if (key === 'delete_all') deleteForEveryone([m]);
    else if (key === 'select') setSelected(new Set([m.id]));
    else if (key === 'report' && m.sender_id) {
      const name = senders.get(m.sender_id)?.first_name ?? '';
      router.push({ pathname: '/report', params: { userId: m.sender_id, messageId: m.id, planId: convo?.plan_id ?? '', context: 'message', name } });
    }
  };

  const onLongPress = useCallback((m: Message, anchor: Anchor) => setMenu({ m, anchor }), []);
  const onRetry = useCallback((m: Message) => retryMessage(id, m.id), [id]);
  const onToggleSelect = useCallback(
    (m: Message) =>
      setSelected((prev) => {
        const next = new Set(prev ?? []);
        if (next.has(m.id)) next.delete(m.id);
        else next.add(m.id);
        return next.size ? next : null;
      }),
    [],
  );

  const deleteSelected = async () => {
    const list = [...(selected ?? [])].map((key) => byId.get(key)).filter((m): m is Message => Boolean(m));
    if (!list.length) return;
    const everyone = list.every((m) => canDeleteForEveryone(m, me.id));
    const choice = await showDialog({
      title: `Delete ${list.length} message${list.length > 1 ? 's' : ''}?`,
      icon: 'delete-outline',
      danger: true,
      cancelLabel: 'Cancel',
      actions: [
        ...(everyone ? [{ label: 'Delete for everyone', value: 'all', tone: 'danger' as const }] : []),
        { label: 'Delete for me', value: 'me', tone: everyone ? ('secondary' as const) : ('danger' as const) },
      ],
    });
    if (choice === 'all') deleteForEveryone(list);
    else if (choice === 'me') deleteForMe(list);
  };

  const renderItem = useCallback(
    ({ item }: { item: Row }) =>
      item.type === 'day' ? (
        <Text variant="label" color="textSubtle" align="center" style={styles.day}>
          {item.label}
        </Text>
      ) : (
        <MessageBubble
          message={item.m}
          mine={item.m.sender_id === me.id}
          sender={item.m.sender_id ? senders.get(item.m.sender_id) : undefined}
          first={item.first}
          onLongPress={onLongPress}
          onRetry={onRetry}
          onOpenImage={setViewing}
          selecting={selecting}
          selected={selected?.has(item.m.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ),
    [me.id, onLongPress, onRetry, onToggleSelect, selected, selecting, senders],
  );

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const reason = screenText(body);
    if (reason) {
      setError(SCREEN_MESSAGES[reason]);
      return;
    }
    setError(null);
    sendMessage(id, me.id, body);
    setDraft('');
  };

  const attach = async () => {
    setError(null);
    try {
      const uri = await pickImage('library');
      if (!uri) return;
      const res = await sendPhoto.mutateAsync(uri);
      if (res.status === 'rejected') setError("That photo wasn't approved, so it wasn't sent.");
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const closed = convo?.status === 'closed';
  const openInfo = () => router.push({ pathname: '/chat/[id]/members', params: { id } });

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {selecting ? (
        <Header
          title={`${selected.size} selected`}
          leading="close"
          onLeading={() => setSelected(null)}
          right={<IconButton icon="delete-outline" label="Delete selected" variant="plain" color="danger" onPress={deleteSelected} />}
        />
      ) : (
        <Header
          title={convo?.title ?? 'Group chat'}
          subtitle={convo ? `${formatPlanTime(convo.starts_at!)} • ${convo.approved_count ?? 0} members` : undefined}
          right={<IconButton icon="info-outline" label="Group info" variant="plain" onPress={openInfo} />}
        />
      )}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlashList
          data={rows}
          renderItem={renderItem}
          extraData={selected}
          keyExtractor={(r) => r.key}
          getItemType={(r) => r.type}
          maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
          onStartReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onStartReachedThreshold={0.5}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text variant="small" color="textSubtle" align="center" style={styles.day}>
              No messages yet. Say hi and confirm you're coming.
            </Text>
          }
        />
        {error ? (
          <View style={styles.notice}>
            <Notice tone="danger" text={error} />
          </View>
        ) : null}
        <View style={[styles.composerWrap, { paddingBottom: insets.bottom + space.sm }]}>
          {closed ? (
            <Notice text="This chat closed 24 hours after the plan ended." icon="lock-outline" />
          ) : muted ? (
            <Notice tone="warning" text="A moderator muted you in this chat. You can still read messages." icon="volume-off" />
          ) : (
            <View style={styles.composer}>
              <IconButton icon="add-photo-alternate" label="Send a photo" variant="plain" color="textMuted" onPress={attach} />
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Message group..."
                placeholderTextColor={colors.textSubtle}
                selectionColor={colors.accent}
                maxLength={MAX_MESSAGE_CHARS}
                multiline
                style={styles.input}
                accessibilityLabel="Message"
              />
              <IconButton icon={sendPhoto.isPending ? 'hourglass-empty' : 'arrow-upward'} label="Send" variant="primary" onPress={send} />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <MessageMenu anchor={menu?.anchor ?? null} alignRight={menu?.m.sender_id === me.id} items={menuItems} onSelect={onMenu} onClose={() => setMenu(null)} />
      <ImageViewer path={viewing} onClose={() => setViewing(null)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  notice: { paddingHorizontal: gutter, paddingBottom: space.sm },
  list: { paddingHorizontal: gutter, paddingBottom: space.lg },
  day: { paddingTop: space.xl },
  composerWrap: { paddingHorizontal: gutter, paddingTop: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.xs,
    padding: space.xs,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: { flex: 1, maxHeight: 120, minHeight: 44, paddingVertical: 11, color: colors.text, fontFamily: fonts.regular, fontSize: 16 },
});
