/**
 * Route: `(entry)/splash`
 * Replicates Stitch "Yuvomeet - Minimal Landing (Liquid Glass)" & "Onboarding: Age Verification".
 * Allows browsing Kota plans before verification (Rule ON-5) or starting OTP sign-up (ON-1).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { switchAppLocale } from '../../src/lib/i18n';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function SplashScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language === 'hi' ? 'hi' : 'en';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.heroWrap}>
        <Image
          source={{
            uri: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1000&q=80',
          }}
          cachePolicy="memory-disk"
          contentFit="cover"
          style={styles.heroImg}
        />
        <View style={styles.heroOverlay} />
      </View>

      {/* Top Bar: Brand + Language Toggle (Hindi / English NFR) */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={styles.limeDot} />
          <Text maxFontSizeMultiplier={1.3} style={styles.brandText}>
            yuvomeet
          </Text>
        </View>

        <Pressable
          onPress={() => switchAppLocale(currentLang === 'en' ? 'hi' : 'en')}
          accessibilityRole="button"
          accessibilityLabel="Switch language between English and Hindi"
          style={styles.langPill}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.langPillText}>
            {currentLang === 'en' ? 'हिंदी · HI' : 'English · EN'}
          </Text>
        </Pressable>
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomSection}>
        <View style={styles.stickerRow}>
          <View style={styles.verifiedSticker}>
            <Text maxFontSizeMultiplier={1.3} style={styles.verifiedStickerText}>
              ✓ 18+ Verified Only
            </Text>
          </View>
          <View style={styles.kotaSticker}>
            <Text maxFontSizeMultiplier={1.3} style={styles.kotaStickerText}>
              📍 Kota First
            </Text>
          </View>
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          {t('onboarding.welcomeTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          {t('onboarding.welcomeSub')}
        </Text>

        <Pressable
          onPress={() => router.push('/(entry)/city')}
          accessibilityRole="button"
          style={styles.primaryCta}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.primaryCtaText}>
            {t('onboarding.getStarted')} →
          </Text>
        </Pressable>

        {/* ON-5: Browse plans before verification */}
        <Pressable
          onPress={() => router.replace('/(tabs)/feed')}
          accessibilityRole="button"
          style={styles.secondaryCta}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.secondaryCtaText}>
            {t('onboarding.browseFirst')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'space-between',
  },
  heroWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '62%',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 14, 19, 0.65)',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  limeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.electricLime,
  },
  brandText: {
    color: Colors.primaryWhite,
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  langPill: {
    minHeight: 44,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    justifyContent: 'center',
  },
  langPillText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  bottomSection: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  stickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  verifiedSticker: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  verifiedStickerText: {
    color: Colors.trustEmerald,
    fontSize: 11,
    fontWeight: '700',
  },
  kotaSticker: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  kotaStickerText: {
    color: Colors.electricLime,
    fontSize: 11,
    fontWeight: '700',
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.6,
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 24,
  },
  primaryCta: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 10,
  },
  primaryCtaText: {
    color: Colors.onElectricLime,
    fontSize: 16,
    fontWeight: '800',
  },
  secondaryCta: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  secondaryCtaText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});
