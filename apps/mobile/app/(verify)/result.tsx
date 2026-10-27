/**
 * Route: `(verify)/result`
 * Replicates Stitch "Yuvomeet - Under-18 Restriction & Failure" (`abb13c5d9d84435ba6bf08fc7961dd4c`)
 * and PRD §4 edge case:
 * - Failed selfie twice -> shows "We're checking your photos by hand. Expect a reply within 24 hours," never a bare "rejected".
 * - Under-18 -> permanent block with appeal option only if ID was misread.
 * - Verified -> shows Verified Badge and unlocks Join, Host, and Chat.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function VerifyResultScreen() {
  const router = useRouter();
  const { profile, runKycSimulation } = useYuvomeet();
  const status = profile.verification_status;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Verification Status" subtitle={`VR-7 · ${status.toUpperCase()}`} />

      <View style={styles.body}>
        {status === 'verified' ? (
          <View style={styles.card}>
            <View style={styles.emeraldCircle}>
              <Text style={styles.bigGlyph}>✓</Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={styles.title}>
              You are 18+ Verified!
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
              Your Verified Badge is now active. You can request to join plans, host meetups at approved Kota venues, and chat with your group.
            </Text>
            <Pressable
              onPress={() => router.replace('/(tabs)/feed')}
              style={styles.primaryBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.primaryBtnText}>
                Explore Kota Plans →
              </Text>
            </Pressable>
          </View>
        ) : status === 'manual_review' ? (
          <View style={styles.card}>
            <View style={styles.amberCircle}>
              <Text style={styles.bigGlyphDark}>⏳</Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={styles.title}>
              Manual Review in Progress
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
              We're checking your photos by hand. Expect a reply within 24 hours. Meanwhile, you can continue browsing plans in Kota!
            </Text>
            <Pressable
              onPress={() => router.replace('/(tabs)/feed')}
              style={styles.primaryBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.primaryBtnText}>
                Browse Plans Meanwhile
              </Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.coralCircle}>
              <Text style={styles.bigGlyph}>18+</Text>
            </View>
            <Text maxFontSizeMultiplier={1.3} style={styles.title}>
              You must be 18 or older
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
              Yuvomeet is strictly for verified adults (18+). Under-18 accounts are permanently blocked under our safety & DPDP compliance rules (VR-1 / S-40).
            </Text>
            <Pressable
              onPress={() => router.push('/(verify)/appeal')}
              style={styles.secondaryBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.secondaryBtnText}>
                My ID was misread · Submit Appeal (48h SLA)
              </Text>
            </Pressable>
            <Pressable
              onPress={() => runKycSimulation('verified_woman')}
              style={styles.resetDemoBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.resetDemoText}>
                [Demo] Reset to 18+ Verified Adult
              </Text>
            </Pressable>
          </View>
        )}
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
  emeraldCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.trustEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  amberCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.warningAmber,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  coralCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.errorContainer,
    borderWidth: 2,
    borderColor: Colors.errorCoral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  bigGlyph: {
    color: Colors.primaryWhite,
    fontSize: 22,
    fontWeight: '900',
  },
  bigGlyphDark: {
    color: Colors.canvasLowest,
    fontSize: 24,
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  primaryBtn: {
    width: '100%',
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  resetDemoBtn: {
    paddingVertical: 10,
  },
  resetDemoText: {
    color: Colors.electricLime,
    fontSize: 12,
    fontWeight: '600',
  },
});
