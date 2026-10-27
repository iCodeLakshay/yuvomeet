/**
 * Route: `report` (Bottom Sheet / Modal Screen)
 * Replicates Stitch "Yuvomeet - Report & Block Bottom Drawer" (`b663f15f830c457aa62094211b56dbdd`).
 * Closes CH-4, SF-7, VR-5, SB-5:
 * - Reachable from every profile, plan, and message
 * - Classifies `severe` (12h human SLA) vs `standard` (24h SLA)
 * - In-plan reports mute the target in the group chat and hold thread open for 24h evidence
 * - Block immediately removes target from feed, plan lists, and chat (Rule S-17)
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getReportSeverity, type ReportReason } from '@yuvomeet/shared';
import { ScreenHeader } from '../src/components/ScreenHeader';
import { useYuvomeet } from '../src/lib/store';
import { Colors, Radii, Spacing } from '../src/theme/tokens';

const REASON_OPTIONS: { value: ReportReason; label: string }[] = [
  { value: 'harassment', label: 'Harassment or inappropriate behavior' },
  { value: 'unsafe_at_plan', label: 'Felt unsafe at meetup (Severe · 12h SLA)' },
  { value: 'sexual_content', label: 'Sexual or explicit content (Severe · 12h SLA)' },
  { value: 'underage', label: 'Fake profile or under 18 (Severe · Auto-pause)' },
  { value: 'threat_or_violence', label: 'Threat or violence (Severe · 12h SLA)' },
  { value: 'no_show', label: 'No-show to confirmed meetup' },
  { value: 'spam_or_scam', label: 'Spam, scam, or commercial promotion' },
  { value: 'other', label: 'Other safety concern' },
];

export default function ReportAndBlockSheetScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    targetUserId?: string;
    targetName?: string;
    planId?: string;
    messageId?: string;
    context?: 'profile' | 'plan' | 'message';
  }>();

  const targetUserId = params.targetUserId ?? 'host-lakshay';
  const targetName = params.targetName ?? 'Member';
  const context = params.context ?? 'profile';

  const { submitSafetyReport } = useYuvomeet();
  const [reason, setReason] = useState<ReportReason>('harassment');
  const [details, setDetails] = useState('');
  const [alsoBlock, setAlsoBlock] = useState(true);

  const severity = getReportSeverity(reason);

  const handleSubmit = () => {
    submitSafetyReport({
      targetUserId,
      planId: params.planId,
      messageId: params.messageId,
      reason,
      details,
      alsoBlock,
      context,
    });
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Report & Block"
        subtitle={`CH-4 & SF-7 · ${severity === 'severe' ? '12h Priority SLA' : '24h Review SLA'}`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.targetCard}>
          <View style={styles.targetAvatar}>
            <Text style={styles.targetInitials}>{targetName.slice(0, 2).toUpperCase()}</Text>
          </View>
          <View style={styles.flexOne}>
            <Text maxFontSizeMultiplier={1.3} style={styles.targetName}>
              {targetName}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.targetSub}>
              Reporting from {context} • Never reveals your identity to {targetName}
            </Text>
          </View>
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
          REASON FOR REPORT (REQUIRED)
        </Text>

        {REASON_OPTIONS.map((opt) => {
          const selected = reason === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setReason(opt.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              style={[styles.reasonRow, selected ? styles.reasonRowSelected : null]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.reasonLabel}>
                {opt.label}
              </Text>
              <View style={[styles.radioOuter, selected ? styles.radioOuterActive : null]}>
                {selected ? <View style={styles.radioInner} /> : null}
              </View>
            </Pressable>
          );
        })}

        <Text maxFontSizeMultiplier={1.3} style={styles.sectionLabel}>
          ADDITIONAL CONTEXT (OPTIONAL)
        </Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          maxLength={1000}
          multiline
          placeholder="Share any details to help our human moderation team..."
          placeholderTextColor={Colors.textMuted}
          style={styles.detailsInput}
        />

        {/* Enforcement Toggle matching Stitch */}
        <View style={styles.enforcementCard}>
          <View style={styles.enforcementRow}>
            <View style={styles.flexOne}>
              <Text maxFontSizeMultiplier={1.3} style={styles.enforcementTitle}>
                Block {targetName} too (Rule S-17)
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.enforcementSub}>
                They won't see your profile, plans, or messages, and you won't see theirs.
              </Text>
            </View>
            <Switch
              value={alsoBlock}
              onValueChange={setAlsoBlock}
              trackColor={{ false: Colors.surfaceHigh, true: Colors.electricLime }}
              thumbColor={Colors.primaryWhite}
            />
          </View>
        </View>

        <Pressable onPress={handleSubmit} style={styles.submitBtn}>
          <Text maxFontSizeMultiplier={1.3} style={styles.submitBtnText}>
            Submit Report{alsoBlock ? ' & Block' : ''} →
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
    padding: 16,
    paddingBottom: 40,
  },
  flexOne: {
    flex: 1,
  },
  targetCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  targetAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetInitials: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '800',
  },
  targetName: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  targetSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  sectionLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 8,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  reasonRowSelected: {
    borderColor: Colors.primaryWhite,
    backgroundColor: Colors.surfaceContainer,
  },
  reasonLabel: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: Colors.electricLime,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.electricLime,
  },
  detailsInput: {
    minHeight: 80,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    padding: 12,
    color: Colors.primaryWhite,
    fontSize: 13,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  enforcementCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  enforcementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  enforcementTitle: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  enforcementSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  submitBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: Colors.onPrimaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
});
