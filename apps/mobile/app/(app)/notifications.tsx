import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMarkRead, useNotifications, type Notification } from '../../src/features/notifications/api';
import { notificationMeta } from '../../src/features/notifications/destinations';
import { formatAgo } from '../../src/lib/format';
import { colors, EmptyState, gutter, Header, Icon, IconButton, Pressable, Segmented, space, Text } from '../../src/ui';

type Filter = 'all' | 'plan' | 'approval' | 'safety';
type Row = { type: 'section'; title: string; meta?: string } | { type: 'item'; n: Notification };

const DAY = 86_400_000;

const Item = memo(function Item({ n }: { n: Notification }) {
  const meta = notificationMeta(n);
  const unread = !n.read_at;
  const body = (
    <View style={styles.item}>
      <View style={[styles.icon, unread ? styles.iconUnread : null]}>
        <Icon name={meta.icon} size={20} color={unread ? 'text' : 'textMuted'} />
      </View>
      <View style={styles.flex}>
        <View style={styles.titleRow}>
          <Text variant="bodyStrong" color={unread ? 'text' : 'textMuted'} style={styles.flex} numberOfLines={1}>
            {n.title}
          </Text>
          <Text variant="caption" color="textSubtle">
            {formatAgo(n.created_at)}
          </Text>
        </View>
        <Text variant="small" color="textMuted">
          {n.body}
        </Text>
        {meta.action && meta.href ? (
          <Text variant="smallStrong" style={styles.action}>
            {meta.action}
          </Text>
        ) : null}
      </View>
      {meta.href ? <Icon name="chevron-right" size={20} color="textSubtle" /> : null}
    </View>
  );
  return meta.href ? (
    <Pressable onPress={() => router.push(meta.href!)} accessibilityLabel={`${n.title}. ${n.body}`} pressScale={0.99}>
      {body}
    </Pressable>
  ) : (
    body
  );
});

/** Stitch "Notifications Center" with category filters; opening the screen marks all read. */
export default function Notifications() {
  const insets = useSafeAreaInsets();
  const query = useNotifications();
  const markRead = useMarkRead();
  const [filter, setFilter] = useState<Filter>('all');
  const all = query.data ?? [];
  const unreadCount = all.filter((n) => !n.read_at).length;

  // Mark read when leaving, so unread styling is visible while the screen is open.
  useEffect(() => () => void markRead.mutate(undefined), []); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo<Row[]>(() => {
    const list = all.filter((n) => filter === 'all' || n.category === filter || (filter === 'safety' && n.category === 'account'));
    const cutoff = Date.now() - DAY;
    const today = list.filter((n) => Date.parse(n.created_at) >= cutoff);
    const earlier = list.filter((n) => Date.parse(n.created_at) < cutoff);
    const fresh = today.filter((n) => !n.read_at).length;
    return [
      ...(today.length ? [{ type: 'section', title: 'Today', meta: fresh ? `${fresh} new` : undefined } as Row] : []),
      ...today.map((n): Row => ({ type: 'item', n })),
      ...(earlier.length ? [{ type: 'section', title: 'Earlier' } as Row] : []),
      ...earlier.map((n): Row => ({ type: 'item', n })),
    ];
  }, [all, filter]);

  const renderItem = useCallback(
    ({ item }: { item: Row }) =>
      item.type === 'section' ? (
        <View style={styles.section}>
          <Text variant="label" color="textSubtle" style={styles.flex}>
            {item.title}
          </Text>
          {item.meta ? (
            <Text variant="label" color="textSubtle">
              {item.meta}
            </Text>
          ) : null}
        </View>
      ) : (
        <Item n={item.n} />
      ),
    [],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Header
        large
        subtitle="Activity feed"
        title="Notifications"
        right={
          <View style={styles.headerRight}>
            {unreadCount ? <IconButton icon="done-all" label="Mark all as read" onPress={() => markRead.mutate(undefined)} /> : null}
            <IconButton icon="close" label="Close" onPress={() => router.back()} />
          </View>
        }
      />
      <Segmented<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { value: 'all', label: 'All' },
          { value: 'plan', label: 'Plan Updates' },
          { value: 'approval', label: 'Approvals' },
          { value: 'safety', label: 'Safety' },
        ]}
      />
      <FlashList
        data={rows}
        renderItem={renderItem}
        getItemType={(r) => r.type}
        keyExtractor={(r) => (r.type === 'section' ? `s-${r.title}` : r.n.id)}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: insets.bottom + space.xxl }}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={query.refetch} tintColor={colors.text} colors={[colors.onPrimary]} />}
        ListEmptyComponent={
          query.isLoading ? null : (
            <EmptyState
              icon="notifications-none"
              title="All caught up"
              body="Join requests, approvals and plan changes show up here."
              actionLabel="Explore plans"
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
  headerRight: { flexDirection: 'row', gap: space.sm },
  section: { flexDirection: 'row', paddingTop: space.xl, paddingBottom: space.sm },
  item: { flexDirection: 'row', gap: space.md, paddingVertical: space.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surface1, alignItems: 'center', justifyContent: 'center' },
  iconUnread: { backgroundColor: colors.surface3 },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  action: { marginTop: space.sm },
});
