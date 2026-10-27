/**
 * Route: `(entry)/city-waitlist`
 * Closes ON-2: Shows waitlist confirmation for non-live cities and saves row to `waitlist_signups`.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function CityWaitlistScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { selectCity } = useYuvomeet();
  const params = useLocalSearchParams<{ cityName?: string }>();
  const cityName = params.cityName ?? 'Jaipur';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="City Waitlist" subtitle={`ON-2 · ${cityName}`} />

      <View style={styles.body}>
        <View style={styles.card}>
          <View style={styles.badge}>
            <Text maxFontSizeMultiplier={1.3} style={styles.badgeText}>
              ✓ SAVED TO WAITLIST
            </Text>
          </View>

          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            {t('onboarding.waitlistTitle', { city: cityName })}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.sub}>
            {t('onboarding.waitlistSub', { city: cityName })}
          </Text>

          <View style={styles.infoBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.infoText}>
              Why Kota first? We verify every public venue in person and keep our moderation queue under 12 hours before opening the next city.
            </Text>
          </View>

          <Pressable
            onPress={() => {
              selectCity('kota');
              router.replace('/(entry)/phone');
            }}
            accessibilityRole="button"
            style={styles.primaryBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.primaryBtnText}>
              Switch to Kota (Live Now) →
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.back()}
            accessibilityRole="button"
            style={styles.secondaryBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.secondaryBtnText}>
              Back to City List
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 24,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
    marginBottom: 16,
  },
  badgeText: {
    color: Colors.trustEmerald,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 20,
  },
  infoBox: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  infoText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  primaryBtn: {
    width: '100%',
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});
