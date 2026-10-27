/**
 * Route: `suspended`
 * Closes VR-5 & VR-6:
 * Shown when an account is auto-suspended (2 reports from distinct verified users in 30 days)
 * or manually suspended. Shows the reason and links directly to the in-app appeal screen.
 */

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useYuvomeet } from '../src/lib/store';
import { Colors, Radii, Spacing } from '../src/theme/tokens';

export default function SuspendedScreen() {
  const router = useRouter();
  const { profile, runKycSimulation } = useYuvomeet();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Account Paused" subtitle="VR-5 & VR-6 · Safety Review" showBack={false} />

      <View style={styles.body}>
        <View style={styles.card}>
          <Text style={styles.icon}>⏸️</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            Your account is paused while we review reports
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.reason}>
            {profile.status_reason ??
              'Your account is paused while we review reports. We will reply within 24 hours.'}
          </Text>

          <Pressable
            onPress={() => router.push('/(verify)/appeal')}
            style={styles.appealBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.appealBtnText}>
              Submit an Appeal (48h Human Review) →
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/settings/delete')}
            style={styles.deleteLink}
          >
            <Text style={styles.deleteLinkText}>Delete My Account (ON-6)</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              runKycSimulation('verified_woman');
              router.replace('/(tabs)/feed');
            }}
            style={styles.restoreDemo}
          >
            <Text style={styles.restoreDemoText}>[Demo] Restore Active Status</Text>
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
    borderColor: Colors.warningAmber,
    alignItems: 'center',
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
  },
  reason: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 22,
  },
  appealBtn: {
    width: '100%',
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  appealBtnText: {
    color: Colors.onElectricLime,
    fontSize: 14,
    fontWeight: '800',
  },
  deleteLink: {
    paddingVertical: 8,
  },
  deleteLinkText: {
    color: Colors.errorCoral,
    fontSize: 13,
    fontWeight: '600',
  },
  restoreDemo: {
    marginTop: 10,
    paddingVertical: 6,
  },
  restoreDemoText: {
    color: Colors.textMuted,
    fontSize: 12,
  },
});
