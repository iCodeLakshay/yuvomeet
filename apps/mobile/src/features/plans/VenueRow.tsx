import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge, colors, Icon, Pressable, radii, RemoteImage, space, Text } from '../../ui';
import { venueCover, type Venue } from './api';

export interface VenueRowProps {
  venue: Venue;
  onPress: (id: string) => void;
  selected?: boolean;
}

/** Approved venue row: photo, name, area, partner and late-evening badges. */
export const VenueRow = memo(function VenueRow({ venue, onPress, selected }: VenueRowProps) {
  return (
    <Pressable
      onPress={() => onPress(venue.id)}
      accessibilityLabel={`${venue.name}, ${venue.area_name}`}
      accessibilityState={{ selected: Boolean(selected) }}
      pressScale={0.985}
      style={[styles.row, selected ? styles.selected : null]}
    >
      <RemoteImage
        path={venueCover(venue)}
        style={styles.photo}
        fallback={
          <View style={styles.fallback}>
            <Icon name="storefront" size={24} color="textSubtle" />
          </View>
        }
      />
      <View style={styles.flex}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {venue.name}
        </Text>
        <Text variant="small" color="textMuted" numberOfLines={1}>
          {venue.area_name} · up to {venue.capacity}
        </Text>
        <View style={styles.badges}>
          {venue.partner ? <Badge label="Partner" tone="accent" icon="handshake" /> : null}
          {venue.late_events_allowed ? <Badge label="Open late" icon="nightlight-round" /> : null}
        </View>
      </View>
      {selected ? <Icon name="check-circle" size={24} color="accent" /> : <Icon name="chevron-right" size={22} color="textSubtle" />}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    padding: space.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  photo: { width: 64, height: 64, borderRadius: radii.lg },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  flex: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', gap: space.xs, marginTop: space.xs },
});
