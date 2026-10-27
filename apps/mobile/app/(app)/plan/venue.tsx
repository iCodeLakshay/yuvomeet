import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useVenues, type Venue } from '../../../src/features/plans/api';
import { pickedVenue } from '../../../src/features/plans/stores';
import { VenueRow } from '../../../src/features/plans/VenueRow';
import { EmptyState, gutter, SheetHeader, space } from '../../../src/ui';

const Separator = () => <View style={styles.separator} />;

/** Venue picker sheet for Create a Plan. Only approved venues exist to pick from (S-31). */
export default function VenuePicker() {
  const insets = useSafeAreaInsets();
  const venues = useVenues();
  const selected = pickedVenue.use();
  const onPick = useCallback((id: string) => {
    pickedVenue.set(id);
    router.back();
  }, []);
  const renderItem = useCallback(({ item }: { item: Venue }) => <VenueRow venue={item} onPress={onPick} selected={item.id === selected} />, [onPick, selected]);

  return (
    <View style={styles.root}>
      <FlashList
        data={venues.data ?? []}
        renderItem={renderItem}
        keyExtractor={(v) => v.id}
        extraData={selected}
        ItemSeparatorComponent={Separator}
        ListHeaderComponent={<SheetHeader title="Public meeting point" subtitle="Checked cafés and public spots in Kota" />}
        ListHeaderComponentStyle={styles.header}
        contentContainerStyle={{ paddingHorizontal: gutter, paddingBottom: insets.bottom + space.lg }}
        ListEmptyComponent={venues.isLoading ? null : <EmptyState icon="storefront" title="No venues yet" body="Approved venues for your city will appear here." />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { marginBottom: space.lg },
  separator: { height: space.md },
});
