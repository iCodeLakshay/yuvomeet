import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVenues, type Venue } from '../../../src/features/plans/api';
import { VenueRow } from '../../../src/features/plans/VenueRow';
import { colors, EmptyState, gutter, Header, Notice, space } from '../../../src/ui';

const Separator = () => <View style={styles.separator} />;

/** Approved public venues (S-31). Every plan happens at one of these. */
export default function Venues() {
  const insets = useSafeAreaInsets();
  const venues = useVenues();
  const onOpen = useCallback((id: string) => router.push({ pathname: '/venues/[id]', params: { id } }), []);
  const renderItem = useCallback(({ item }: { item: Venue }) => <VenueRow venue={item} onPress={onOpen} />, [onOpen]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Header title="Approved venues" subtitle="Kota" />
      <FlashList
        data={venues.data ?? []}
        renderItem={renderItem}
        keyExtractor={(v) => v.id}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={<Notice text="Each venue is public, busy and checked by our team. Partner venues know Yuvomeet groups are coming." />}
        ListHeaderComponentStyle={styles.header}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: insets.bottom + space.xxl }}
        ListEmptyComponent={venues.isLoading ? null : <EmptyState icon="storefront" title="No venues yet" />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { marginBottom: space.lg, marginTop: space.sm },
  separator: { height: space.md },
});
