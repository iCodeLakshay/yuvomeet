/**
 * Routes: `venues` (`app/venues/index.tsx`) & `venue/[id]` (`app/venue/[id].tsx`)
 * Closes VN-1 & SF-1: Approved public Kota venues list and detail with map pin.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii } from '../../src/theme/tokens';

export default function VenuesListScreen() {
  const router = useRouter();
  const { venues } = useYuvomeet();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Approved Kota Venues"
        subtitle="VN-1 & SF-1 · Public Safe Spaces"
      />

      <ScrollView contentContainerStyle={styles.content}>
        {venues.map((v) => (
          <Pressable
            key={v.id}
            onPress={() => router.push(`/venue/${v.id}`)}
            style={styles.card}
          >
            {v.photo_url ? (
              <Image
                source={{ uri: v.photo_url }}
                cachePolicy="memory-disk"
                contentFit="cover"
                style={styles.photo}
              />
            ) : null}
            <View style={styles.cardBody}>
              <View style={styles.titleRow}>
                <Text maxFontSizeMultiplier={1.3} style={styles.name}>
                  {v.name}
                </Text>
                {v.partner ? (
                  <View style={styles.partnerBadge}>
                    <Text style={styles.partnerBadgeText}>★ Partner</Text>
                  </View>
                ) : null}
              </View>
              <Text maxFontSizeMultiplier={1.3} style={styles.addr}>
                📍 {v.address_line} ({v.area_name})
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.meta}>
                Capacity: {v.capacity} · {v.vibe_tag ?? 'Verified Public Venue'}
              </Text>
            </View>
          </Pressable>
        ))}
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
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 14,
  },
  photo: {
    width: '100%',
    height: 140,
  },
  cardBody: {
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  partnerBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  partnerBadgeText: {
    color: Colors.trustEmerald,
    fontSize: 10,
    fontWeight: '800',
  },
  addr: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 4,
  },
  meta: {
    color: Colors.electricLime,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
});
