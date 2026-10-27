/**
 * Route: `venue/[id]`
 * Closes VN-1: Venue profile with photos, hours, capacity, map pin, and "Open in Google Maps" link.
 * Per `docs/integrations.md`, user location is never sent to map calls.
 */

import React from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function VenueDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { venues } = useYuvomeet();
  const venue = venues.find((v) => v.id === id) ?? venues[0]!;

  const openInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}`;
    Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={venue.name} subtitle={`VN-1 · ${venue.area_name}, Kota`} />

      <ScrollView contentContainerStyle={styles.content}>
        {venue.photo_url ? (
          <Image
            source={{ uri: venue.photo_url }}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={styles.hero}
          />
        ) : null}

        <View style={styles.body}>
          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            {venue.name}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.addr}>
            📍 {venue.address_line}
          </Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>MAX GROUP CAPACITY</Text>
              <Text style={styles.infoVal}>{venue.capacity} people</Text>
            </View>
            <View style={styles.infoBox}>
              <Text style={styles.infoLabel}>EVENING CUT-OFF</Text>
              <Text style={styles.infoVal}>
                {venue.late_events_allowed ? 'Partner Extended (22:30)' : 'Standard 21:00 IST'}
              </Text>
            </View>
          </View>

          <View style={styles.mapPinCard}>
            <Text maxFontSizeMultiplier={1.3} style={styles.mapPinTitle}>
              🗺️ Public Venue Pin ({venue.lat.toFixed(4)}, {venue.lng.toFixed(4)})
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.mapPinSub}>
              User GPS is off on maps (`myLocationEnabled={false}`). Check-in verifies within 150m of this pin.
            </Text>
            <Pressable onPress={openInMaps} style={styles.mapsBtn}>
              <Text maxFontSizeMultiplier={1.3} style={styles.mapsBtnText}>
                Open Venue Pin in Google Maps ↗
              </Text>
            </Pressable>
          </View>

          <Pressable
            onPress={() => router.push('/plan/create')}
            style={styles.hostHereBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.hostHereText}>
              Host a Group Plan at {venue.name} →
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingBottom: 40,
  },
  hero: {
    width: '100%',
    height: 210,
  },
  body: {
    padding: 20,
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
  },
  addr: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: 16,
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  infoBox: {
    flex: 1,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  infoLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  infoVal: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  mapPinCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  mapPinTitle: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  mapPinSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
    marginBottom: 12,
  },
  mapsBtn: {
    minHeight: 42,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapsBtnText: {
    color: Colors.electricLime,
    fontSize: 13,
    fontWeight: '700',
  },
  hostHereBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostHereText: {
    color: Colors.onElectricLime,
    fontSize: 14,
    fontWeight: '800',
  },
});
