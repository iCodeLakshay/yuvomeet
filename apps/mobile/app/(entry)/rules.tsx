/**
 * Route: `(entry)/rules`
 * Closes ON-4: One-screen Community Rules summary & required tick box before joining plans.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function CommunityRulesScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { acceptCommunityRules } = useYuvomeet();
  const [accepted, setAccepted] = useState(false);

  const handleContinue = () => {
    if (!accepted) return;
    acceptCommunityRules();
    router.push('/(profile)/create');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('onboarding.rulesTitle')} subtitle="ON-4 · Safety Pledge" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          {t('onboarding.rulesTitle')}
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          {t('onboarding.rulesSub')}
        </Text>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleIcon}>🔞</Text>
          <View style={styles.ruleTextWrap}>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleTitle}>
              Strictly 18+ Verified Adults
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleDesc}>
              {t('onboarding.rule1')}
            </Text>
          </View>
        </View>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleIcon}>☕</Text>
          <View style={styles.ruleTextWrap}>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleTitle}>
              Approved Public Venues Only
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleDesc}>
              {t('onboarding.rule2')}
            </Text>
          </View>
        </View>

        <View style={styles.ruleCard}>
          <Text style={styles.ruleIcon}>🛡️</Text>
          <View style={styles.ruleTextWrap}>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleTitle}>
              Group First & Zero Creep Policy
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleDesc}>
              {t('onboarding.rule3')}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={() => setAccepted((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={styles.checkboxRow}
        >
          <View style={[styles.checkbox, accepted ? styles.checkboxChecked : null]}>
            {accepted ? <Text style={styles.checkGlyph}>✓</Text> : null}
          </View>
          <Text maxFontSizeMultiplier={1.3} style={styles.checkboxLabel}>
            {t('onboarding.acceptRules')}
          </Text>
        </Pressable>

        <Pressable
          onPress={handleContinue}
          disabled={!accepted}
          accessibilityRole="button"
          style={[styles.ctaButton, !accepted ? styles.ctaDisabled : null]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
            Continue to Profile Setup →
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
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  ruleCard: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  ruleIcon: {
    fontSize: 24,
  },
  ruleTextWrap: {
    flex: 1,
  },
  ruleTitle: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  ruleDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: Spacing.touchMin,
    paddingVertical: 12,
    marginTop: 8,
    marginBottom: 18,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.electricLime,
    borderColor: Colors.electricLime,
  },
  checkGlyph: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '900',
  },
  checkboxLabel: {
    flex: 1,
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  ctaText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
});
