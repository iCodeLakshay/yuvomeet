import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAskLocation, usePlace } from '../../../src/features/location/api';
import { useUnreadCount } from '../../../src/features/notifications/api';
import { useFeed, type PlanCard as Plan } from '../../../src/features/plans/api';
import { PlanCard } from '../../../src/features/plans/PlanCard';
import { activeFilterCount, feedFilters } from '../../../src/features/plans/stores';
import { useCities, useLookups } from '../../../src/features/profile/api';
import { isVerified, useMe } from '../../../src/features/session/SessionProvider';
import { toAppError } from '../../../src/lib/errors';
import { startSpan } from '../../../src/lib/telemetry';
import {
  Chip,
  colors,
  DOCK_HEIGHT,
  EmptyState,
  fonts,
  gutter,
  Icon,
  IconButton,
  Notice,
  Pressable,
  radii,
  space,
  Text,
  type IconName,
} from '../../../src/ui';

const Separator = () => <View style={styles.separator} />;

/** Stitch "Discover Home": city header, search, category chips, plan cards (PL-2, ON-5). */
export default function Discover() {
  const me = useMe();
  const insets = useSafeAreaInsets();
  const filters = feedFilters.use();
  const feed = useFeed(filters);
  const lookups = useLookups();
  const unread = useUnreadCount();
  const place = usePlace();
  const askLocation = useAskLocation();
  const cities = useCities();
  const homeCity = cities.data?.find((c) => c.id === me?.city_id)?.name ?? null;
  const placeLabel = place.data?.label ?? (homeCity ? `${homeCity}, India` : 'Set your location');
  const span = useRef<(() => void) | null>(startSpan('feed_first_page'));

  const plans = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data]);
  useEffect(() => {
    if (feed.isSuccess && span.current) {
      span.current();
      span.current = null;
    }
  }, [feed.isSuccess]);

  const onOpen = useCallback((id: string) => router.push({ pathname: '/plan/[id]', params: { id, source: 'feed' } }), []);
  const onHost = useCallback((id: string) => router.push({ pathname: '/user/[id]', params: { id } }), []);
  const verified = isVerified(me);
  const onJoin = useCallback(
    (id: string) => router.push(verified ? { pathname: '/plan/[id]/join', params: { id } } : { pathname: '/verify-gate', params: { planId: id } }),
    [verified],
  );
  const renderItem = useCallback(
    ({ item }: { item: Plan }) => <PlanCard plan={item} onOpen={onOpen} onJoin={onJoin} onHost={onHost} />,
    [onHost, onJoin, onOpen],
  );

  const offline = feed.isError && toAppError(feed.error).code === 'NETWORK';
  const filterCount = activeFilterCount(filters);

  const header = (
    <View style={styles.listHeader}>
      <View style={styles.chips}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Chip label="All" selected={!filters.activity} onPress={() => feedFilters.set((f) => ({ ...f, activity: null }))} />
          {(lookups.data?.activities ?? []).map((a) => (
            <Chip
              key={a.slug}
              label={a.label}
              icon={a.icon as IconName}
              selected={filters.activity === a.slug}
              onPress={() => feedFilters.set((f) => ({ ...f, activity: f.activity === a.slug ? null : a.slug }))}
            />
          ))}
        </ScrollView>
      </View>
      {offline ? <Notice tone="warning" text="You're offline. Showing plans you've already loaded." icon="wifi-off" /> : null}
      <View style={styles.sectionRow}>
        <Text variant="title2">Active gatherings</Text>
        <Text variant="label" color="textSubtle">
          {`${homeCity ?? 'City'} hub`}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.top}>
        <View style={styles.cityRow}>
          <Pressable
            onPress={() => (place.data ? void place.refetch() : askLocation.mutate())}
            accessibilityLabel={place.data ? `Location: ${place.data.label}. Tap to refresh` : 'Use my current location'}
            style={styles.place}
          >
            <View style={styles.navIcon}>
              <Icon name={place.data ? 'near-me' : 'location-searching'} size={24} color="brand" />
            </View>
            <View style={styles.flex}>
              <Text variant="title3" numberOfLines={1}>
                {placeLabel}
              </Text>
              <Text variant="caption" color="textSubtle" numberOfLines={1}>
                {!place.data && !place.isLoading ? 'Tap to use your current location' : verified ? 'Verified 18+ member' : 'Browsing · verify to join plans'}
              </Text>
            </View>
          </Pressable>
          <IconButton icon="notifications-none" label="Notifications" color="brand" badge={unread > 0} onPress={() => router.push('/notifications')} />
        </View>
        <View style={styles.searchRow}>
          <View style={styles.search}>
            <Icon name="search" size={22} color="textSubtle" />
            <TextInput
              defaultValue={filters.search}
              onChangeText={(search) => feedFilters.set((f) => ({ ...f, search }))}
              placeholder="Search plans, cafés, or jams..."
              placeholderTextColor={colors.textSubtle}
              selectionColor={colors.accent}
              style={styles.searchInput}
              returnKeyType="search"
              accessibilityLabel="Search plans"
            />
          </View>
          <Pressable onPress={() => router.push('/filters')} accessibilityLabel="Filters" style={styles.filterBtn}>
            <Icon name="tune" size={22} color="brand" />
            <Text variant="smallStrong">{filterCount ? `Filters · ${filterCount}` : 'Filters'}</Text>
          </Pressable>
        </View>
      </View>

      <FlashList
        data={plans}
        renderItem={renderItem}
        keyExtractor={(p) => p.id!}
        ListHeaderComponent={header}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: DOCK_HEIGHT + insets.bottom }}
        onEndReached={() => feed.hasNextPage && !feed.isFetchingNextPage && feed.fetchNextPage()}
        onEndReachedThreshold={0.5}
        refreshControl={<RefreshControl refreshing={feed.isRefetching} onRefresh={feed.refetch} tintColor={colors.text} colors={[colors.onPrimary]} />}
        ListEmptyComponent={
          feed.isLoading ? null : (
            <EmptyState
              icon="explore-off"
              title="No plans nearby"
              body="Nothing scheduled with these filters right now. Be the first to start something."
              actionLabel="Create a plan"
              onAction={() => router.push('/plan/new')}
            />
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  place: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.md },
  root: { flex: 1, backgroundColor: colors.bg },
  top: { paddingHorizontal: gutter, paddingBottom: space.md, gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  cityRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingTop: space.sm },
  navIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  flex: { flex: 1 },
  searchRow: { flexDirection: 'row', gap: space.sm },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { flex: 1, color: colors.text, fontFamily: fonts.medium, fontSize: 15, padding: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listHeader: { gap: space.lg, paddingTop: space.lg, paddingBottom: space.md },
  chips: { marginHorizontal: -gutter },
  chipRow: { paddingHorizontal: gutter, gap: space.sm },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  separator: { height: space.lg },
});
