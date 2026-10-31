import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useChats } from '../../../src/features/chat/api';
import { formatAgo, formatPlanTime } from '../../../src/lib/format';
import { Badge, colors, DOCK_HEIGHT, EmptyState, gutter, Header, Icon, Pressable, RemoteImage, space, Text } from '../../../src/ui';

type Chat = NonNullable<ReturnType<typeof useChats>['data']>[number];

function preview(c: Chat) {
  if (!c.last_at) return c.kind === 'pair' ? 'Say hi.' : 'Say hi to the group before you meet.';
  const who = c.last_is_mine ? 'You' : (c.last_sender_name ?? 'Member');
  return `${who}: ${c.last_is_photo ? 'Photo' : (c.last_body ?? '')}`;
}

const ChatRow = memo(function ChatRow({ chat, onOpen }: { chat: Chat; onOpen: (id: string) => void }) {
  const closed = chat.status === 'closed';
  const pair = chat.kind === 'pair';
  const meta = pair ? 'Direct chat' : chat.starts_at ? `${formatPlanTime(chat.starts_at)} • ${chat.venue_name ?? ''}` : '';
  return (
    <Pressable onPress={() => onOpen(chat.conversation_id!)} accessibilityLabel={`${chat.title}. ${preview(chat)}`} pressScale={0.99} style={styles.row}>
      <RemoteImage
        path={chat.cover_path}
        style={styles.cover}
        fallback={
          <View style={styles.coverFallback}>
            <Icon name={pair ? 'person-outline' : 'groups'} size={24} color="textSubtle" />
          </View>
        }
      />
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" numberOfLines={1} style={styles.flex}>
            {chat.title}
          </Text>
          {chat.last_at ? (
            <Text variant="caption" color="textSubtle">
              {formatAgo(chat.last_at)}
            </Text>
          ) : null}
        </View>
        <Text variant="small" color="textMuted" numberOfLines={1}>
          {preview(chat)}
        </Text>
        <View style={styles.metaRow}>
          {meta ? (
            <Text variant="caption" color="textSubtle" numberOfLines={1} style={styles.flex}>
              {meta}
            </Text>
          ) : (
            <View style={styles.flex} />
          )}
          {closed ? <Badge label="Closed" /> : pair ? null : <Badge label={`${chat.approved_count ?? 0} going`} tone="success" dot />}
        </View>
      </View>
    </Pressable>
  );
});

const Separator = () => <View style={styles.separator} />;

/** Group chats of approved plan members (CH-1). Not in Stitch; built from the same tokens. */
export default function Chats() {
  const insets = useSafeAreaInsets();
  const chats = useChats();
  const onOpen = useCallback((id: string) => router.push({ pathname: '/chat/[id]', params: { id } }), []);
  const renderItem = useCallback(({ item }: { item: Chat }) => <ChatRow chat={item} onOpen={onOpen} />, [onOpen]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Header large title="Chats" subtitle="Plan groups" />
      <FlashList
        data={chats.data ?? []}
        renderItem={renderItem}
        keyExtractor={(c) => c.conversation_id!}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: DOCK_HEIGHT + insets.bottom }}
        refreshControl={<RefreshControl refreshing={chats.isRefetching} onRefresh={chats.refetch} tintColor={colors.text} colors={[colors.onPrimary]} />}
        ListEmptyComponent={
          chats.isLoading ? null : (
            <EmptyState
              icon="forum"
              title="No group chats yet"
              body="When a host approves you for a plan, its group chat opens here. Chats close 24 hours after the plan ends."
              actionLabel="Find a plan"
              onAction={() => router.navigate('/')}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md },
  cover: { width: 56, height: 56, borderRadius: 18 },
  coverFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
  separator: { height: 1, backgroundColor: colors.border },
});
