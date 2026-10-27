/**
 * Routes: `(verify)/intro`, `(verify)/id-check`, `(verify)/selfie`, `(verify)/result`, `(verify)/appeal`
 * Closes VR-1, VR-2, VR-3, VR-6, VR-7, S-38 to S-41, C-6.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function VerifyIntroScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="18+ & Selfie Verification" subtitle="VR-1 to VR-3 · HyperVerge India" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.badgePill}>
          <Text maxFontSizeMultiplier={1.3} style={styles.badgeText}>
            🔒 ZERO AADHAAR STORAGE · DPDP COMPLIANT
          </Text>
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          {t('verify.gateTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          {t('verify.gateSub')}
        </Text>

        <View style={styles.infoCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardHeaderEmerald}>
            ✓ What we store (Rule S-39)
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardText}>
            • "18+ verified" status flag & birth year (for age band){'\n'}• Gender confirmation (for women-only plans){'\n'}• One-way HMAC document fingerprint (prevents duplicate accounts)
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardHeaderCoral}>
            ✕ What we NEVER store (Rule S-39)
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardText}>
            • Never your Aadhaar number{'\n'}• Never your ID card image or selfie after the check{'\n'}• Never your full date of birth or home address
          </Text>
        </View>

        <Pressable
          onPress={() => router.push('/(verify)/id-check')}
          accessibilityRole="button"
          style={styles.ctaButton}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
            {t('verify.startVerify')} →
          </Text>
        </Pressable>
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
    padding: 20,
    paddingBottom: 40,
  },
  badgePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
    marginBottom: 14,
  },
  badgeText: {
    color: Colors.trustEmerald,
    fontSize: 10,
    fontWeight: '800',
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  infoCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  cardHeaderEmerald: {
    color: Colors.trustEmerald,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardHeaderCoral: {
    color: Colors.errorCoral,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  cardText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
  },
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
  },
  ctaText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
});
