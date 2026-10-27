/**
 * Route: `(verify)/id-check`
 * Closes VR-1: DigiLocker / Aadhaar offline e-KYC handoff via HyperVerge session (`kyc-start`).
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function VerifyIdCheckScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Step 1: 18+ Age Check" subtitle="VR-1 · DigiLocker e-KYC" />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.icon}>🪪</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            Connect DigiLocker (18+ Check)
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.desc}>
            HyperVerge verifies that you are 18 or older and confirms your birth year & gender. Under-18 results permanently block the account (Rule VR-1 / S-40).
          </Text>

          <Pressable
            onPress={() => router.push('/(verify)/selfie')}
            accessibilityRole="button"
            style={styles.primaryBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.primaryBtnText}>
              Verify Age via DigiLocker →
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
  icon: {
    fontSize: 42,
    marginBottom: 14,
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
    textAlign: 'center',
  },
  desc: {
    color: Colors.textSecondary,
    fontSize: 13,
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
});
