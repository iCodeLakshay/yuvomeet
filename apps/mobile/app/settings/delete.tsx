/**
 * Route: `settings/delete`
 * Closes ON-6: Delete account in 3 taps from Settings; data purged within 30 days;
 * immediate effect revokes sessions, hides profile, withdraws pending joins, and cancels future hosted plans.
 */

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const { deleteUserAccount } = useYuvomeet();
  const [deleted, setDeleted] = useState(false);

  const handleConfirmDelete = () => {
    deleteUserAccount();
    setDeleted(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Delete Account" subtitle="ON-6 · 3-Tap Deletion" />

      <View style={styles.body}>
        <View style={styles.card}>
          {deleted ? (
            <>
              <Text maxFontSizeMultiplier={1.3} style={styles.title}>
                Account Scheduled for Purge
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.sub}>
                Your profile is now hidden, pending joins withdrawn, and all personal data will be permanently purged within 30 days (Rule ON-6).
              </Text>
              <Pressable
                onPress={() => router.replace('/(entry)/splash')}
                style={styles.cancelBtn}
              >
                <Text style={styles.cancelBtnText}>Return to Welcome Screen</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text maxFontSizeMultiplier={1.3} style={styles.title}>
                Permanently Delete Your Account?
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.sub}>
                • Immediate effect: Sessions revoked, profile hidden, pending join requests withdrawn, future hosted plans cancelled.{'\n'}
                • Full data purge completed within 30 days by `retention_tick` in Mumbai (`ap-south-1`).
              </Text>

              {/* Tap 3 of 3-tap Deletion (Rule ON-6) */}
              <Pressable
                onPress={handleConfirmDelete}
                accessibilityRole="button"
                style={styles.deleteBtn}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.deleteBtnText}>
                  🗑️ Confirm Permanent Deletion (Tap 3 of 3)
                </Text>
              </Pressable>

              <Pressable onPress={() => router.back()} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Keep My Account</Text>
              </Pressable>
            </>
          )}
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
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.errorCoral,
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 10,
  },
  sub: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 22,
  },
  deleteBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.errorCoral,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  deleteBtnText: {
    color: Colors.errorCoral,
    fontSize: 14,
    fontWeight: '800',
  },
  cancelBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});
