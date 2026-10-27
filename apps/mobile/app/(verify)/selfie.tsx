/**
 * Route: `(verify)/selfie`
 * Closes VR-2 & VR-3: Selfie liveness and face match against first approved profile photo.
 * Includes sandbox simulation triggers for:
 * 1. Verified Woman (18+) -> unlocks women-only plans (PL-4 / S-15)
 * 2. Verified Man (18+) -> hides women-only plans (S-15)
 * 3. Borderline / 2nd Retry -> Manual Review with 24h expected reply time (PRD §4 edge case)
 * 4. Under-18 Minor -> Permanent restriction screen (`abb13c5d9d84435ba6bf08fc7961dd4c`)
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function VerifySelfieScreen() {
  const router = useRouter();
  const { runKycSimulation } = useYuvomeet();

  const handleOutcome = (
    outcome: 'verified_woman' | 'verified_man' | 'manual_review' | 'blocked_minor',
  ) => {
    runKycSimulation(outcome);
    router.replace('/(verify)/result');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Step 2: Live Selfie Check" subtitle="VR-2 & VR-3 · Face Match" />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.cameraFrame}>
          <View style={styles.ovalGuide}>
            <Text style={styles.cameraEmoji}>🤳</Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.cameraHint}>
              Center your face inside the oval
            </Text>
          </View>
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.sectionTitle}>
          HYPERVERGE KYC SANDBOX OUTCOMES (TEST ALL PRD STATES):
        </Text>

        <Pressable
          onPress={() => handleOutcome('verified_woman')}
          accessibilityRole="button"
          style={styles.primaryBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.primaryBtnText}>
            ✓ Pass as Verified Woman (18+ · Sees Women-Only Plans)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleOutcome('verified_man')}
          accessibilityRole="button"
          style={styles.secondaryBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.secondaryBtnText}>
            ✓ Pass as Verified Man (18+ · Women-Only Plans Hidden)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleOutcome('manual_review')}
          accessibilityRole="button"
          style={styles.secondaryBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.secondaryBtnText}>
            ⏳ Simulate Borderline / 2nd Selfie Fail (Manual Review 24h)
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleOutcome('blocked_minor')}
          accessibilityRole="button"
          style={styles.dangerBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.dangerBtnText}>
            🔞 Simulate Under-18 ID Verdict (Permanent Block · VR-1)
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
  cameraFrame: {
    height: 240,
    borderRadius: Radii.card,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  ovalGuide: {
    width: 150,
    height: 190,
    borderRadius: 75,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  cameraEmoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  cameraHint: {
    color: Colors.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 12,
  },
  primaryBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  primaryBtnText: {
    color: Colors.onElectricLime,
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  secondaryBtnText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  dangerBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(147, 0, 10, 0.4)',
    borderWidth: 1,
    borderColor: Colors.errorCoral,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  dangerBtnText: {
    color: Colors.errorCoral,
    fontSize: 13,
    fontWeight: '700',
  },
});
