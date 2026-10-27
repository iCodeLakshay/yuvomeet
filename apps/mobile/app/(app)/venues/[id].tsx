import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useVenues, venueCover } from '../../../src/features/plans/api';
import { PlanCover } from '../../../src/features/plans/PlanCover';
import { pickedVenue } from '../../../src/features/plans/stores';
import { openDirections } from '../../../src/lib/links';
import { Badge, Button, EmptyState, gutter, Header, IconButton, InfoTile, radii, Screen, space, Text } from '../../../src/ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Hours = Record<string, { open: string; close: string }>;

function hoursLabel(hours: unknown) {
  const all = (hours as Hours | null)?.all;
  return all ? `Open daily ${all.open} – ${all.close}` : 'Hours vary';
}

/** Venue detail: photo, static map pin (lite mode, no live tracking), hours, host here. */
export default function VenueDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const venue = useVenues().data?.find((v) => v.id === id);

  if (!venue) {
    return (
      <Screen header={<Header title="Venue" />}>
        <EmptyState icon="storefront" title="Venue not found" body="It may no longer be approved." />
      </Screen>
    );
  }

  return (
    <Screen
      fullBleed
      padded={false}
      footer={
        <Button
          label="Host a plan here"
          icon="add"
          onPress={() => {
            pickedVenue.set(venue.id);
            router.push('/plan/new');
          }}
        />
      }
    >
      <PlanCover path={venueCover(venue)} icon="storefront" style={[styles.hero, { paddingTop: insets.top + space.sm }]}>
        <IconButton icon="arrow-back" label="Go back" variant="glass" onPress={() => router.back()} />
      </PlanCover>
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge label="Approved venue" tone="success" icon="verified" />
          {venue.partner ? <Badge label="Partner" tone="accent" icon="handshake" /> : null}
          {venue.late_events_allowed ? <Badge label="Open late" icon="nightlight-round" /> : null}
        </View>
        <Text variant="title1">{venue.name}</Text>
        <InfoTile
          icon="location-on"
          label="Address"
          title={venue.address_line}
          subtitle={`${venue.area_name}, Kota`}
          right={<Button label="Maps" trailingIcon="open-in-new" variant="secondary" size="sm" fill={false} onPress={() => openDirections(venue.lat, venue.lng, venue.name)} />}
        />
        <View style={styles.map}>
          <MapView
            provider={PROVIDER_GOOGLE}
            liteMode
            style={StyleSheet.absoluteFill}
            initialRegion={{ latitude: venue.lat, longitude: venue.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 }}
            scrollEnabled={false}
            zoomEnabled={false}
            toolbarEnabled={false}
            accessibilityLabel={`Map of ${venue.name}`}
          >
            <Marker coordinate={{ latitude: venue.lat, longitude: venue.lng }} title={venue.name} />
          </MapView>
        </View>
        <InfoTile icon="schedule" label="Hours" title={hoursLabel(venue.hours)} subtitle={`Groups of up to ${venue.capacity}`} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, paddingHorizontal: gutter },
  body: { paddingHorizontal: gutter, paddingTop: space.lg, gap: space.md },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  map: { height: 180, borderRadius: radii.xl, overflow: 'hidden' },
});
