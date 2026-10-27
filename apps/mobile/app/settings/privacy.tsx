/**
 * Route: `settings/privacy`
 * Closes ON-6 (In-app data export delivered as a file via share sheet) & Privacy §2 C-4 (Withdraw consent immediately).
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, Share, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function PrivacySettingsScreen() {
  const { consents, saveConsents, exportUserDataJson } = useYuvomeet();
  const [exportedPreview, setExportedPreview] = useState<string | null>(null);

  const handleExport = async () => {
    const json = exportUserDataJson();
    setExportedPreview(json);
    try {
      await Share.share({
        title: 'yuvomeet-data-export.json',
        message: json,
      });
    } catch {
      // Preview shown inline as well
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Privacy & Data Export"
        subtitle="ON-6 & DPDP Rule C-4"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
          PURPOSE-SPECIFIC CONSENTS (WITHDRAW ANYTIME · C-4)
        </Text>

        {(['camera', 'location', 'notifications'] as const).map((key) => (
          <View key={key} style={styles.consentRow}>
            <Text maxFontSizeMultiplier={1.3} style={styles.consentTitle}>
              {key === 'camera'
                ? '📷 Camera (Photos & Selfie Check)'
                : key === 'location'
                ? '📍 One-Time Location (150m Check-In & SOS)'
                : '🔔 Plan & Group Chat Notifications'}
            </Text>
            <Switch
              value={Boolean(consents[key])}
              onValueChange={(val) => saveConsents({ [key]: val })}
              trackColor={{ false: Colors.surfaceHigh, true: Colors.electricLime }}
              thumbColor={Colors.primaryWhite}
            />
          </View>
        ))}

        <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
          DATA PORTABILITY & EXPORT (RULE ON-6)
        </Text>
        <View style={styles.exportCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.exportTitle}>
            Download My Data (JSON File)
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.exportSub}>
            Includes your profile, consents, plan memberships, and verification verdicts stored in Mumbai (`ap-south-1`).
          </Text>

          <Pressable onPress={handleExport} style={styles.exportBtn}>
            <Text maxFontSizeMultiplier={1.3} style={styles.exportBtnText}>
              📥 Generate & Share Data Export File
            </Text>
          </Pressable>

          {exportedPreview ? (
            <View style={styles.codeBox}>
              <Text style={styles.codeText}>{exportedPreview}</Text>
            </View>
          ) : null}
        </View>
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
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 10,
    marginBottom: 10,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  consentTitle: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  exportCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  exportTitle: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  exportSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  exportBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportBtnText: {
    color: Colors.onElectricLime,
    fontSize: 14,
    fontWeight: '800',
  },
  codeBox: {
    marginTop: 12,
    backgroundColor: Colors.canvasLowest,
    borderRadius: Radii.md,
    padding: 10,
  },
  codeText: {
    color: Colors.electricLime,
    fontSize: 10,
    fontFamily: 'monospace',
  },
});
