/**
 * Route: `plan/[id]/requests` + `plan/[id]/cancel` sheet
 * Replicates Stitch "Yuvomeet - Join Plan & States" (`69d5d05ba89f4531ae566c191ea6e8fd`).
 * Closes PL-3 & PL-5:
 * - Host sees requester's verified badge, age band, interests, plans attended, show-up rate, and note.
 * - Decline never shows a reason to the requester ("Say no quietly" principle 5) and returns their weekly slot.
 * - Host cancel sheet warns that cancelling within 3 hours of start time is recorded as a late cancellation and reduces feed ranking.
 */

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useYuvomeet } from '../../../src/lib/store';
import { Colors, Radii, Spacing } from '../../../src/theme/tokens';

export default function PlanRequestsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { hostRequests, decideJoinRequest, cancelHostedPlan } = useYuvomeet();
  const [cancelSheetOpen, setCancelSheetOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const requests = hostRequests.filter((r) => r.planId === (id ?? 'plan-chai-games'));

  const handleConfirmCancel = () => {
    cancelHostedPlan(id ?? 'plan-chai-games', cancelReason || 'Schedule change');
    setCancelSheetOpen(false);
    router.replace('/(tabs)/my-plans');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Review Join Requests"
        subtitle="PL-3 · Host Approval Queue"
        rightActionLabel="Cancel Plan"
        onRightAction={() => setCancelSheetOpen(true)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.infoBanner}>
          <Text maxFontSizeMultiplier={1.3} style={styles.infoBannerText}>
            Principle 5 ("Say no quietly"): Declining a request sends a neutral "This plan couldn't take you this time" notice with no reason, and returns their weekly join slot (Rule S-25).
          </Text>
        </View>

        {requests.map((req) => (
          <View key={req.userId} style={styles.card}>
            <View style={styles.topRow}>
              <Image
                source={{ uri: req.avatarUrl }}
                cachePolicy="memory-disk"
                style={styles.avatar}
              />
              <View style={styles.infoCol}>
                <View style={styles.nameRow}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.nameText}>
                    {req.firstName} · {req.ageBand}
                  </Text>
                  {req.isVerified ? (
                    <View style={styles.verifiedBadge}>
                      <Text style={styles.verifiedBadgeText}>✓ 18+ Verified</Text>
                    </View>
                  ) : null}
                </View>
                <Text maxFontSizeMultiplier={1.3} style={styles.statsText}>
                  {req.plansAttended} plans attended •{' '}
                  {req.showUpRate !== null ? `${req.showUpRate}% show-up rate` : 'New member'}
                </Text>
              </View>
            </View>

            {req.note ? (
              <View style={styles.noteBox}>
                <Text maxFontSizeMultiplier={1.3} style={styles.noteText}>
                  "{req.note}"
                </Text>
              </View>
            ) : null}

            <View style={styles.interestsRow}>
              {req.interests.map((slug) => (
                <View key={slug} style={styles.interestPill}>
                  <Text style={styles.interestText}>{slug}</Text>
                </View>
              ))}
            </View>

            {req.status === 'requested' ? (
              <View style={styles.decisionRow}>
                <Pressable
                  onPress={() => decideJoinRequest(req.planId, req.userId, 'decline')}
                  style={styles.declineBtn}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.declineBtnText}>
                    Decline Quietly
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => decideJoinRequest(req.planId, req.userId, 'approve')}
                  style={styles.approveBtn}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.approveBtnText}>
                    ✓ Approve to Group
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.decidedBanner}>
                <Text style={styles.decidedText}>
                  Status: {req.status.toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* `plan/[id]/cancel` Host Cancel Sheet with Late-Cancel Warning (PL-5) */}
      <Modal
        visible={cancelSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCancelSheetOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sheetTitle}>
              Cancel Plan? (Rule PL-5)
            </Text>
            <View style={styles.warningCard}>
              <Text maxFontSizeMultiplier={1.3} style={styles.warningText}>
                ⚠️ Late cancellations (within 3 hours of start time) notify all approved members immediately and reduce how often your future plans are shown in the Kota feed.
              </Text>
            </View>
            <TextInput
              value={cancelReason}
              onChangeText={setCancelReason}
              placeholder="Reason for members (e.g., Sudden coaching extra class)"
              placeholderTextColor={Colors.textMuted}
              style={styles.reasonInput}
            />
            <Pressable onPress={handleConfirmCancel} style={styles.confirmCancelBtn}>
              <Text maxFontSizeMultiplier={1.3} style={styles.confirmCancelText}>
                Confirm Cancellation & Notify Members
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCancelSheetOpen(false)}
              style={styles.keepPlanBtn}
            >
              <Text style={styles.keepPlanText}>Keep Plan Active</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  infoBanner: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.DEFAULT,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  infoBannerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  topRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  infoCol: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  nameText: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
  },
  verifiedBadgeText: {
    color: Colors.trustEmerald,
    fontSize: 10,
    fontWeight: '800',
  },
  statsText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  noteBox: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.md,
    padding: 10,
    marginBottom: 10,
  },
  noteText: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontStyle: 'italic',
  },
  interestsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  interestPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
  },
  interestText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  decisionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  approveBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: {
    color: Colors.onElectricLime,
    fontSize: 13,
    fontWeight: '800',
  },
  decidedBanner: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.md,
  },
  decidedText: {
    color: Colors.trustEmerald,
    fontSize: 12,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetBox: {
    backgroundColor: Colors.surfaceLow,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    padding: 20,
  },
  sheetTitle: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 10,
  },
  warningCard: {
    backgroundColor: Colors.warningAmberBg,
    borderRadius: Radii.md,
    padding: 12,
    marginBottom: 12,
  },
  warningText: {
    color: Colors.warningAmber,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
  },
  reasonInput: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.DEFAULT,
    padding: 12,
    color: Colors.primaryWhite,
    fontSize: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  confirmCancelBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.errorContainer,
    borderWidth: 1,
    borderColor: Colors.errorCoral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmCancelText: {
    color: Colors.errorCoral,
    fontSize: 14,
    fontWeight: '800',
  },
  keepPlanBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  keepPlanText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '600',
  },
});
