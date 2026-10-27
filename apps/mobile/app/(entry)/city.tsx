/**
 * Route: `(entry)/city`
 * Replicates Stitch "Yuvomeet - Location & City Waitlist" (`f9896226b9c34d27aeed8cc2f2ec2e57`).
 * Closes ON-2: Kota is live; selecting Jaipur/Pune/Indore saves to `waitlist_signups` and routes to `(entry)/city-waitlist`.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function CityPickerScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { cities, selectCity } = useYuvomeet();

  const handleChooseCity = (slug: string) => {
    const result = selectCity(slug);
    if (result.status === 'live') {
      router.push('/(entry)/phone');
    } else {
      router.push({
        pathname: '/(entry)/city-waitlist',
        params: { cityName: result.city.name, citySlug: result.city.slug },
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('onboarding.selectCity')} subtitle="ON-2 · Kota First Launch" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBox}>
          <View style={styles.pinCircle}>
            <Text style={styles.pinIcon}>📍</Text>
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.heroTitle}>
            Campus & City Hub
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.heroSub}>
            Discover verified group plans at public cafes, riverfront promenades, and study lounges.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
            CAMPUS CITIES
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.sectionMeta}>
            Live & Upcoming
          </Text>
        </View>

        {cities.map((city) => {
          const isLive = city.status === 'live';
          return (
            <Pressable
              key={city.id}
              onPress={() => handleChooseCity(city.slug)}
              accessibilityRole="button"
              accessibilityLabel={`${city.name}, ${isLive ? 'Live' : 'Waitlist'}`}
              style={styles.cityCard}
            >
              <View style={styles.cityLeft}>
                <Text maxFontSizeMultiplier={1.3} style={styles.cityName}>
                  {city.name}
                </Text>
                <View style={[styles.statusBadge, isLive ? styles.liveBadge : styles.soonBadge]}>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[styles.statusText, isLive ? styles.liveText : styles.soonText]}
                  >
                    {isLive ? '● Active Now' : 'Coming Soon'}
                  </Text>
                </View>
              </View>

              <View style={[styles.actionBtn, isLive ? styles.actionBtnLive : null]}>
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.actionBtnText, isLive ? styles.actionBtnTextLive : null]}
                >
                  {isLive ? 'Enter Kota →' : 'Join Waitlist'}
                </Text>
              </View>
            </Pressable>
          );
        })}
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
  heroBox: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  pinCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  pinIcon: {
    fontSize: 22,
  },
  heroTitle: {
    color: Colors.primaryWhite,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  heroSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sectionMeta: {
    color: Colors.textSecondary,
    fontSize: 11,
  },
  cityCard: {
    minHeight: Spacing.touchMin + 12,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cityLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cityName: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radii.pill,
  },
  liveBadge: {
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  soonBadge: {
    backgroundColor: Colors.surfaceHigh,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  liveText: {
    color: Colors.trustEmerald,
  },
  soonText: {
    color: Colors.textSecondary,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
  },
  actionBtnLive: {
    backgroundColor: Colors.electricLime,
  },
  actionBtnText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnTextLive: {
    color: Colors.onElectricLime,
  },
});
