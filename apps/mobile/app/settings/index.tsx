/**
 * Route: `settings` (`app/settings/index.tsx`)
 * Closes Language switch (Hindi / English NFR) and 3-tap path to Delete Account (ON-6).
 * Tap 1: Settings -> Tap 2: Delete Account (`settings/delete`) -> Tap 3: Confirm Delete.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { switchAppLocale } from '../../src/lib/i18n';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function SettingsScreen() {
  const router = useRouter();
  const { i18n } = useTranslation();
  const currentLang = i18n.language === 'hi' ? 'hi' : 'en';

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" subtitle="Language, Privacy & Account" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
          APP LANGUAGE (ACCESSIBILITY NFR · HINDI & ENGLISH)
        </Text>
        <View style={styles.langRow}>
          <Pressable
            onPress={() => switchAppLocale('en')}
            style={[styles.langBtn, currentLang === 'en' ? styles.langBtnActive : null]}
          >
            <Text
              style={[
                styles.langBtnText,
                currentLang === 'en' ? styles.langBtnTextActive : null,
              ]}
            >
              English (EN)
            </Text>
          </Pressable>
          <Pressable
            onPress={() => switchAppLocale('hi')}
            style={[styles.langBtn, currentLang === 'hi' ? styles.langBtnActive : null]}
          >
            <Text
              style={[
                styles.langBtnText,
                currentLang === 'hi' ? styles.langBtnTextActive : null,
              ]}
            >
              हिंदी (Hindi)
            </Text>
          </Pressable>
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
          PRIVACY & SAFETY CONTROLS
        </Text>

        <Pressable
          onPress={() => router.push('/settings/privacy')}
          style={styles.rowCard}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.rowText}>
            🔒 Consents & Download My Data (ON-6)
          </Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/settings/blocked')}
          style={styles.rowCard}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.rowText}>
            🚫 Blocked Users (CH-4)
          </Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/settings/appeals')}
          style={styles.rowCard}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.rowText}>
            ⚖️ My Appeals (VR-6)
          </Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/help')}
          style={styles.rowCard}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.rowText}>
            📜 Help, Rules & Grievance Officer
          </Text>
          <Text style={styles.arrow}>→</Text>
        </Pressable>

        {/* Tap 2 of 3-tap Delete Account flow (Rule ON-6) */}
        <Pressable
          onPress={() => router.push('/settings/delete')}
          style={[styles.rowCard, styles.deleteCard]}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.deleteText}>
            🗑️ Delete Account (Rule ON-6 · 3-Tap Deletion)
          </Text>
          <Text style={styles.deleteText}>→</Text>
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
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 10,
    marginBottom: 10,
  },
  langRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  langBtn: {
    flex: 1,
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnActive: {
    backgroundColor: Colors.electricLime,
    borderColor: Colors.electricLime,
  },
  langBtnText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  langBtnTextActive: {
    color: Colors.onElectricLime,
    fontWeight: '800',
  },
  rowCard: {
    minHeight: Spacing.touchMin,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '600',
  },
  arrow: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  deleteCard: {
    backgroundColor: 'rgba(147, 0, 10, 0.3)',
    borderColor: Colors.errorCoral,
    marginTop: 14,
  },
  deleteText: {
    color: Colors.errorCoral,
    fontSize: 14,
    fontWeight: '700',
  },
});
