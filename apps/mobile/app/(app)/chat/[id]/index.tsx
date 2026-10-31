import { FlashList } from '@shopify/flash-list';
import { MAX_MESSAGE_CHARS, screenText, SCREEN_MESSAGES } from '@yuvomeet/shared';
import * as Clipboard from 'expo-clipboard';
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
  usePairMembers,
  useReactions,
  useSendPhoto,
  useSetReaction,
  type Message,
} from '../../../../src/features/chat/api';
import { ImageViewer } from '../../../../src/features/chat/ImageViewer';
import { MessageBubble, type Anchor, type Quote, type ReactionChip, type Sender } from '../../../../src/features/chat/MessageBubble';
import { MessageMenu, type MenuItem } from '../../../../src/features/chat/MessageMenu';
import { bodyMentions, EXTRA_REACTIONS, mentionQuery } from '../../../../src/features/chat/mentions';
import { useRoster } from '../../../../src/features/plans/api';
import { useMe } from '../../../../src/features/session/SessionProvider';
import { errorMessage } from '../../../../src/lib/errors';
import { formatDateLong, formatPlanTime } from '../../../../src/lib/format';
import { pickImage } from '../../../../src/lib/media';
import { Avatar, colors, fonts, gutter, Header, IconButton, Notice, Pressable, radii, Sheet, showDialog, space, Text, toast } from '../../../../src/ui';

type Row = { type: 'day'; key: string; label: string } | { type: 'msg'; key: string; m: Message; first: boolean };
interface Person {
  user_id: string | null;
  first_name: string | null;
  photo_path: string | null;
  is_host: boolean | null;
}

const dayKey = (iso: string) => new Date(Date.parse(iso) + 5.5 * 3_600_000).toISOString().slice(0, 10);
const EMPTY_CHIPS: ReactionChip[] = [];

/** Stitch "Group Chat" (CH-1 to CH-4): plan members only, screened text, moderated photos. */
export default function GroupChat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const insets = useSafeAreaInsets();
  const convo = useConversation(id).data;
  const isPair = convo?.kind === 'pair';
  const roster = useRoster(isPair ? '' : (convo?.plan_id ?? ''));
  const pairMembers = usePairMembers(id, Boolean(isPair));
  const muted = useMuted(id, me.id).data;
  const { messages, fetchNextPage, hasNextPage, isFetchingNextPage } = useMessages(id);
  const reactions = useReactions(id);
  const setReaction = useSetReaction(id);
  const sendPhoto = useSendPhoto(id);
  const remove = useDeleteMessage(id);
  const hide = useHideMessages(id);
  const [draft, setDraft] = useState('');
  const [reply, setReply] = useState<{ id: string; name: string; text: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ m: Message; anchor: Anchor } | null>(null);
  const [moreFor, setMoreFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string> | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  const people = ((isPair ? pairMembers.data : roster.data) ?? []) as Person[];
  const senders = useMemo(
    () =>
      new Map<string, Sender>(
        people.flatMap((m) => (m.user_id ? [[m.user_id, { first_name: m.first_name, photo_path: m.photo_path, is_host: m.is_host }] as const] : [])),
      ),
    [people],
  );
  const names = useMemo(() => people.flatMap((m) => (m.first_name ? [m.first_name] : [])), [people]);
  const byId = useMemo(() => new Map(messages.map((m) => [m.id, m])), [messages]);
  const selecting = selected != null;
  const query = mentionQuery(draft);

  const mentionPeople = useMemo(() => {
    if (query === null) return [];
    const needle = query.toLocaleLowerCase();
    return people
      .filter((p) => p.user_id && p.user_id !== me.id && (p.first_name ?? '').toLocaleLowerCase().startsWith(needle))
      .slice(0, 8);
  }, [me.id, people, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, ReactionChip[]>();
    for (const row of reactions.data ?? []) {
      const chips = map.get(row.message_id) ?? [];
      const chip = chips.find((c) => c.emoji === row.emoji);
      if (chip) {
        chip.count += 1;
        if (row.user_id === me.id) chip.mine = true;
      } else chips.push({ emoji: row.emoji, count: 1, mine: row.user_id === me.id });
      map.set(row.message_id, chips);
    }
    return map;
  }, [me.id, reactions.data]);

  const quotes = useMemo(() => {
    const map = new Map<string, Quote>();
    for (const m of messages) {
      if (!m.reply_to) continue;
      const parent = byId.get(m.reply_to);
      const name = !parent
        ? 'Message'
        : parent.sender_id === me.id
          ? 'You'
          : (parent.sender_id ? senders.get(parent.sender_id)?.first_name : null) ?? 'Member';
      const text = !parent ? 'No longer available' : parent.body?.trim() || (parent.image_path || parent.image_status ? 'Photo' : 'Message');
      map.set(m.id, { name, text });
    }
    return map;
  }, [byId, me.id, messages, senders]);

  const listExtra = useMemo(() => ({ selected, reactions: reactions.data }), [reactions.data, selected]);

  useEffect(() => {
    if (!selecting) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelected(null);
      return true;
    });
    return () => sub.remove();
  }, [selecting]);

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

  const onReply = useCallback(
    (m: Message) => {
      if (m.pending || m.failed) return;
      const person = m.sender_id ? senders.get(m.sender_id) : undefined;
      const name = m.sender_id === me.id ? 'You' : (person?.first_name ?? 'Member');
      setReply({ id: m.id, name, text: m.body?.trim() || (m.image_path || m.image_status ? 'Photo' : 'Message') });
    },
    [me.id, senders],
  );

  const reactTo = useCallback(
    (messageId: string, emoji: string) => {
      setMenu(null);
      setReaction.mutate({ messageId, emoji });
    },
    [setReaction],
  );

  const menuItems = useMemo<MenuItem[]>(() => {
    if (!menu) return [];
    const m = menu.m;
    const mine = m.sender_id === me.id;
    const items: MenuItem[] = [];
    if (!m.pending && !m.failed) items.push({ key: 'reply', label: 'Reply', icon: 'chat-bubble-outline' });
    if (m.body) items.push({ key: 'copy', label: 'Copy', icon: 'description' });
    items.push({ key: 'delete_me', label: 'Delete for me', icon: 'delete-outline' });
    if (canDeleteForEveryone(m, me.id)) items.push({ key: 'delete_all', label: 'Delete for everyone', icon: 'delete-forever', danger: true });
    items.push({ key: 'select', label: 'Select', icon: 'check-circle-outline' });
    if (!mine && m.sender_id) items.push({ key: 'report', label: 'Report', icon: 'outlined-flag', danger: true });
    return items;
  }, [menu, me.id]);

  const onMenu = (key: string) => {
    const m = menu?.m;
    setMenu(null);
    if (!m) return;
    if (key === 'reply') onReply(m);
    else if (key === 'copy' && m.body) {
      void Clipboard.setStringAsync(m.body);
      toast.success('Message copied');
    } else if (key === 'delete_me') deleteForMe([m]);
    else if (key === 'delete_all') deleteForEveryone([m]);
    else if (key === 'select') setSelected(new Set([m.id]));
    else if (key === 'report' && m.sender_id) {
      const name = senders.get(m.sender_id)?.first_name ?? '';
      router.push({ pathname: '/report', params: { userId: m.sender_id, messageId: m.id, planId: convo?.plan_id ?? '', context: 'message', name } });
    }
  };

  const onLongPress = useCallback((m: Message, anchor: Anchor) => setMenu({ m, anchor }), []);
  const onRetry = useCallback((m: Message) => retryMessage(id, m.id), [id]);
  const onOpenProfile = useCallback(
    (userId: string) => {
      if (userId === me.id) return;
      router.push({ pathname: '/user/[id]', params: { id: userId } });
    },
    [me.id],
  );
  const onBubbleReact = useCallback((m: Message, emoji: string) => reactTo(m.id, emoji), [reactTo]);
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
          names={names}
          quote={quotes.get(item.m.id)}
          reactions={grouped.get(item.m.id) ?? EMPTY_CHIPS}
          onLongPress={onLongPress}
          onRetry={onRetry}
          onOpenImage={setViewing}
          onOpenProfile={onOpenProfile}
          onReply={onReply}
          onReact={onBubbleReact}
          selecting={selecting}
          selected={selected?.has(item.m.id) ?? false}
          onToggleSelect={onToggleSelect}
        />
      ),
    [grouped, me.id, names, onBubbleReact, onLongPress, onOpenProfile, onReply, onRetry, onToggleSelect, quotes, selected, selecting, senders],
  );

  const pickMention = (name: string) => {
    setDraft((prev) => prev.replace(/(^|\s)@[^\s@]*$/, (_, lead: string) => `${lead}@${name} `));
  };

  const send = () => {
    const body = draft.trim();
    if (!body) return;
    const reason = screenText(body);
    if (reason) {
      setError(SCREEN_MESSAGES[reason]);
      return;
    }
    const mentionIds = people.flatMap((p) => (p.user_id && p.user_id !== me.id && p.first_name && bodyMentions(body, p.first_name) ? [p.user_id] : []));
    setError(null);
    sendMessage(id, me.id, body, { replyTo: reply?.id ?? null, mentionIds });
    setDraft('');
    setReply(null);
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
  const activeEmoji = menu ? grouped.get(menu.m.id)?.find((chip) => chip.mine)?.emoji : undefined;
  const subtitle = !convo ? undefined : isPair ? 'Direct chat' : convo.starts_at ? `${formatPlanTime(convo.starts_at)} • ${convo.approved_count ?? 0} members` : undefined;

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
          title={convo?.title ?? (isPair ? 'Chat' : 'Group chat')}
          subtitle={subtitle}
          right={<IconButton icon="info-outline" label={isPair ? 'Chat info' : 'Group info'} variant="plain" onPress={openInfo} />}
        />
      )}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlashList
          data={rows}
          renderItem={renderItem}
          extraData={listExtra}
          keyExtractor={(r) => r.key}
          getItemType={(r) => r.type}
          maintainVisibleContentPosition={{ startRenderingFromBottom: true, autoscrollToBottomThreshold: 0.2 }}
          onStartReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
          onStartReachedThreshold={0.5}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <Text variant="small" color="textSubtle" align="center" style={styles.day}>
              {isPair ? 'No messages yet. Say hi.' : "No messages yet. Say hi and confirm you're coming."}
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
            <Notice text={isPair ? 'This chat is closed.' : 'This chat closed 24 hours after the plan ended.'} icon="lock-outline" />
          ) : muted ? (
            <Notice tone="warning" text="A moderator muted you in this chat. You can still read messages." icon="volume-off" />
          ) : (
            <View style={styles.composerStack}>
              {query !== null ? (
                <View style={styles.mentions}>
                  {mentionPeople.length > 0 ? (
                    mentionPeople.map((person) => (
                      <Pressable
                        key={person.user_id}
                        onPress={() => pickMention(person.first_name ?? 'Member')}
                        pressScale={0.98}
                        accessibilityLabel={`Mention ${person.first_name ?? 'member'}`}
                        style={styles.mention}
                      >
                        <Avatar path={person.photo_path} name={person.first_name} size={28} />
                        <Text variant="bodyStrong">{person.first_name ?? 'Member'}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text variant="caption" color="textSubtle">
                      No one matches
                    </Text>
                  )}
                </View>
              ) : null}
              {reply ? (
                <View style={styles.replyBar}>
                  <View style={styles.replyText}>
                    <Text variant="caption" color="accent" numberOfLines={1}>
                      {reply.name}
                    </Text>
                    <Text variant="small" color="textMuted" numberOfLines={1}>
                      {reply.text}
                    </Text>
                  </View>
                  <IconButton icon="close" label="Cancel reply" variant="plain" onPress={() => setReply(null)} />
                </View>
              ) : null}
              <View style={styles.composer}>
                <IconButton icon="add-photo-alternate" label="Send a photo" variant="plain" color="textMuted" onPress={attach} />
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={isPair ? 'Message…' : 'Message group...'}
                  placeholderTextColor={colors.textSubtle}
                  selectionColor={colors.accent}
                  maxLength={MAX_MESSAGE_CHARS}
                  multiline
                  style={styles.input}
                  accessibilityLabel="Message"
                />
                <IconButton icon={sendPhoto.isPending ? 'hourglass-empty' : 'arrow-upward'} label="Send" variant="primary" onPress={send} />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
      <MessageMenu
        anchor={menu?.anchor ?? null}
        alignRight={menu?.m.sender_id === me.id}
        items={menuItems}
        activeEmoji={activeEmoji}
        onReact={(emoji) => {
          const m = menu?.m;
          if (!m || m.pending || m.failed) {
            setMenu(null);
            return;
          }
          reactTo(m.id, emoji);
        }}
        onMoreReactions={() => {
          if (menu && !menu.m.pending && !menu.m.failed) setMoreFor(menu.m.id);
          setMenu(null);
        }}
        onSelect={onMenu}
        onClose={() => setMenu(null)}
      />
      <Sheet visible={moreFor != null} onClose={() => setMoreFor(null)} title="More reactions">
        <View style={styles.emojiGrid}>
          {EXTRA_REACTIONS.map((emoji) => (
            <Pressable
              key={emoji}
              onPress={() => {
                if (moreFor) reactTo(moreFor, emoji);
                setMoreFor(null);
              }}
              pressScale={0.94}
              accessibilityLabel={`React ${emoji}`}
              style={styles.emojiCell}
            >
              <Text style={styles.emoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      </Sheet>
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
  composerStack: { gap: space.sm },
  mentions: { gap: space.xs },
  mention: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: space.xs },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.md,
    borderLeftWidth: 2,
    borderLeftColor: colors.accent,
  },
  replyText: { flex: 1, gap: 2 },
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
  emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  emojiCell: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.lg, backgroundColor: colors.surface2 },
  emoji: { fontSize: 26, lineHeight: 32 },
});
