import { FlashList } from '@shopify/flash-list';
import { MAX_MESSAGE_CHARS, screenText, SCREEN_MESSAGES } from '@yuvomeet/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  discardMessage,
  retryMessage,
  sendMessage,
  useConversation,
  useDeleteMessage,
  useMessages,
  useMuted,
  useSendPhoto,
  type Message,
} from '../../../../src/features/chat/api';
import { MessageBubble, type Sender } from '../../../../src/features/chat/MessageBubble';
import { useRoster } from '../../../../src/features/plans/api';
import { useMe } from '../../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../../src/lib/errors';
import { formatDateLong, formatPlanTime } from '../../../../src/lib/format';
import { pickImage } from '../../../../src/lib/media';
import { colors, fonts, gutter, Header, IconButton, Notice, radii, space, Text } from '../../../../src/ui';

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
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const senders = useMemo(() => new Map<string, Sender>((roster.data ?? []).map((m) => [m.user_id!, m])), [roster.data]);

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

  const onLongPress = useCallback(
    (m: Message) => {
      if (m.failed) {
        discardMessage(id, m.id);
        return;
      }
      if (m.sender_id === me.id) {
        Alert.alert('Message', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete for everyone', style: 'destructive', onPress: () => remove.mutate(m.id, { onError: (e) => Alert.alert('Could not delete', errorMessage(e)) }) },
        ]);
      } else if (m.sender_id) {
        const name = senders.get(m.sender_id)?.first_name ?? '';
        Alert.alert(name || 'Message', undefined, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View profile', onPress: () => router.push({ pathname: '/user/[id]', params: { id: m.sender_id! } }) },
          {
            text: 'Report message',
            style: 'destructive',
            onPress: () => router.push({ pathname: '/report', params: { userId: m.sender_id!, messageId: m.id, planId: convo?.plan_id ?? '', context: 'message', name } }),
          },
        ]);
      }
    },
    [convo?.plan_id, id, me.id, remove, senders],
  );
  const onRetry = useCallback((m: Message) => retryMessage(id, m.id), [id]);

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
        />
      ),
    [me.id, onLongPress, onRetry, senders],
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

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Header
        title={convo?.title ?? 'Group chat'}
        subtitle={convo ? `${formatPlanTime(convo.starts_at!)} • ${convo.approved_count ?? 0} members` : undefined}
        right={<IconButton icon="more-vert" label="Chat details" variant="plain" onPress={() => router.push({ pathname: '/chat/[id]/members', params: { id } })} />}
      />
      <View style={styles.notice}>
        <Notice text="Meet only at the plan's public venue. Never share private details, OTPs or payment PINs." title="Safety notice" />
      </View>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlashList
          data={rows}
          renderItem={renderItem}
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
            <Notice text="This chat closed 24 hours after the plan ended. Messages are kept for safety reviews." icon="lock-outline" />
          ) : muted ? (
            <Notice tone="warning" text="A moderator muted you in this chat. You can still read messages and report." icon="volume-off" />
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
