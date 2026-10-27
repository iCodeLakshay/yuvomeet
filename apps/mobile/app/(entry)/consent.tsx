/**
 * Route: `(entry)/consent`
 * Closes Privacy §2 (Rule C-1 & C-2):
 * Purpose-specific consent screen after OTP and before profile creation.
 * Camera, Location, and Notifications are separate toggles; none is pre-ticked on initial render.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function ConsentScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { saveConsents } = useYuvomeet();

  // C-1: None is pre-ticked by default on the consent notice screen
  const [camera, setCamera] = useState(false);
  const [location, setLocation] = useState(false);
  const [notifications, setNotifications] = useState(false);

  const handleContinue = () => {
    saveConsents({
      camera,
      location,
      notifications,
      terms_privacy: true,
    });
    router.push('/(entry)/rules');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="DPDP Consent Notice" subtitle="Privacy §2 · Rule C-1" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          {t('onboarding.consentTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          {t('onboarding.consentSub')}
        </Text>

        <View style={styles.card}>
          <View style={styles.rowHeader}>
            <Text maxFontSizeMultiplier={1.3} style={styles.cardTitle}>
              📷 Camera Access
            </Text>
            <Switch
              value={camera}
              onValueChange={setCamera}
              trackColor={{ false: Colors.surfaceHigh, true: Colors.electricLime }}
              thumbColor={Colors.primaryWhite}
            />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardBody}>
            {t('onboarding.consentCamera')}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowHeader}>
            <Text maxFontSizeMultiplier={1.3} style={styles.cardTitle}>
              📍 One-Time Location
            </Text>
            <Switch
              value={location}
              onValueChange={setLocation}
              trackColor={{ false: Colors.surfaceHigh, true: Colors.electricLime }}
              thumbColor={Colors.primaryWhite}
            />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardBody}>
            {t('onboarding.consentLocation')}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.rowHeader}>
            <Text maxFontSizeMultiplier={1.3} style={styles.cardTitle}>
              🔔 Plan & Chat Updates
            </Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.surfaceHigh, true: Colors.electricLime }}
              thumbColor={Colors.primaryWhite}
            />
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.cardBody}>
            {t('onboarding.consentNotifications')}
          </Text>
        </View>

        <View style={styles.noteBox}>
          <Text maxFontSizeMultiplier={1.3} style={styles.noteText}>
            You can withdraw or update any consent anytime in Settings → Privacy (Rule C-4). Declining location still allows browsing and chatting; only 150m venue check-in requires it.
          </Text>
        </View>

        <Pressable
          onPress={handleContinue}
          accessibilityRole="button"
          style={styles.ctaButton}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
            Save Preferences & Continue →
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
  headline: {
    color: Colors.primaryWhite,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  cardBody: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  noteBox: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.md,
    padding: 14,
    marginVertical: 14,
  },
  noteText: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
});
