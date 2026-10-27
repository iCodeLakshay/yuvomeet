/**
 * Route: `plan/[id]` + `plan/[id]/verify-gate` sheet
 * Replicates Stitch "Yuvomeet - Plan Details" (`0f9fa07dd7534fd79d8f820aeca42e59`).
 * Closes PL-3, PL-4, PL-6, ON-5, SF-2 (Share plan to Trusted Contact via WhatsApp), SF-3 (SOS button).
 */

import React, { useEffect, useState } from 'react';
import { Linking, Modal, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { ACTIVITIES, MAX_JOIN_NOTE_CHARS } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { trackEvent } from '../../src/lib/telemetry';
import { Colors, formatPlanDateTime, Radii, Spacing } from '../../src/theme/tokens';

export default function PlanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    profile,
    visibleFeedPlans,
    memberships,
    requestJoinPlan,
    withdrawJoinRequest,
    trustedContact,
  } = useYuvomeet();

  const [joinSheetOpen, setJoinSheetOpen] = useState(false);
  const [verifyGateOpen, setVerifyGateOpen] = useState(false);
  const [joinNote, setJoinNote] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);

  // S-15 & S-17: Look up only from `visibleFeedPlans` so women-only or blocked plans return "Plan not found"
  const plan = visibleFeedPlans.find((p) => p.id === id);

  useEffect(() => {
    if (plan) {
      trackEvent('plan_viewed', {
        plan_id: plan.id,
        audience: plan.audience,
        activity: plan.activity,
        source: 'feed',
      });
    }
  }, [plan]);

  if (!plan) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Plan Not Found" subtitle="Rule S-15 / S-17" />
        <View style={styles.notFoundBox}>
          <Text maxFontSizeMultiplier={1.3} style={styles.notFoundTitle}>
            Plan not found
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.notFoundSub}>
            This plan may have ended, been cancelled, or is unavailable.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const membership = memberships[plan.id];
  const spotsLeft = Math.max(0, plan.capacity - plan.approved_count);
  const activityLabel =
    ACTIVITIES.find((a) => a.slug === plan.activity)?.labelEn ?? plan.activity;
  const formattedTime = formatPlanDateTime(plan.starts_at);
  const isApproved =
    membership?.status === 'approved' || membership?.status === 'attended';
  const isRequested = membership?.status === 'requested';

  // SF-2 & S-51: One-tap share plan details to Trusted Contact via WhatsApp (no live tracking)
  const handleShareTrustedContact = async () => {
    const shareText = `Hey${trustedContact ? ` ${trustedContact.name}` : ''}! I'm attending a Yuvomeet group plan:\n• Plan: ${plan.title}\n• Public Venue: ${plan.venue_name} (${plan.venue_address})\n• Time: ${formattedTime}\n• Host: ${plan.host_first_name} (18+ Verified)\n• Map: https://maps.google.com/?q=${plan.venue_lat},${plan.venue_lng}`;
    const phoneParam = trustedContact?.phone ? `phone=91${trustedContact.phone.replace(/\D/g, '').slice(-10)}&` : '';
    const whatsappUrl = `whatsapp://send?${phoneParam}text=${encodeURIComponent(shareText)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        await Share.share({ message: shareText });
      }
    } catch {
      await Share.share({ message: shareText });
    }
  };

  const handleConfirmJoin = () => {
    const res = requestJoinPlan(plan.id, joinNote.trim() || undefined);
    setJoinSheetOpen(false);
    if (!res.ok) {
      if (res.code === 'VERIFY_REQUIRED') {
        setVerifyGateOpen(true);
      } else {
        setFeedback(res.message ?? 'Could not request join');
      }
      return;
    }
    setFeedback('✓ Request sent! Host sees your verified badge, interests, and show-up rate.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={plan.title}
        subtitle={`${plan.venue_area_name} · Kota`}
        showSosButton
        planIdForSos={plan.id}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Visual Banner matching Stitch Plan Details */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: plan.cover_image_url }}
            cachePolicy="memory-disk"
            contentFit="cover"
            style={styles.heroImg}
          />
          <View style={styles.heroScrim} />
          <View style={styles.spotsLivePill}>
            <View style={styles.pulseDot} />
            <Text maxFontSizeMultiplier={1.3} style={styles.spotsLiveText}>
              {spotsLeft} SPOTS OPEN
            </Text>
          </View>
        </View>

        <View style={styles.bodyPadding}>
          {/* Tags & Headline */}
          <View style={styles.tagsRow}>
            <View style={styles.tagPill}>
              <Text maxFontSizeMultiplier={1.3} style={styles.tagPillText}>
                ☕ {activityLabel}
              </Text>
            </View>
            {plan.audience === 'women_only' ? (
              <View style={[styles.tagPill, styles.womenPill]}>
                <Text maxFontSizeMultiplier={1.3} style={styles.womenPillText}>
                  ♀ Verified Women Only (PL-4)
                </Text>
              </View>
            ) : (
              <View style={styles.tagPill}>
                <Text maxFontSizeMultiplier={1.3} style={styles.tagPillText}>
                  👥 Casual Group Meetup
                </Text>
              </View>
            )}
          </View>

          <Text maxFontSizeMultiplier={1.3} style={styles.titleText}>
            {plan.title}
          </Text>

          {feedback ? (
            <View style={styles.feedbackCard}>
              <Text maxFontSizeMultiplier={1.3} style={styles.feedbackText}>
                {feedback}
              </Text>
            </View>
          ) : null}

          {/* Bento Grid: When & Public Venue Cards */}
          <View style={styles.bentoCard}>
            <View style={styles.bentoIconBox}>
              <Text style={styles.bentoEmoji}>📅</Text>
            </View>
            <View style={styles.bentoTextCol}>
              <Text maxFontSizeMultiplier={1.3} style={styles.bentoLabel}>
                WHEN
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.bentoPrimary}>
                {formattedTime}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.bentoSub}>
                Asia/Kolkata (IST) · Ends before 9:00 PM unless Partner Venue
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push(`/venue/${plan.venue_id}`)}
            style={styles.bentoCard}
          >
            <View style={styles.bentoIconBox}>
              <Text style={styles.bentoEmoji}>🏪</Text>
            </View>
            <View style={styles.bentoTextCol}>
              <Text maxFontSizeMultiplier={1.3} style={styles.bentoLabel}>
                PUBLIC VENUE (SF-1 APPROVED)
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.bentoPrimary}>
                {plan.venue_name}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.bentoSub}>
                {plan.venue_address}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.verifiedZoneText}>
                ✓ Public venue verified & safe zone · Tap for venue map
              </Text>
            </View>
          </Pressable>

          {/* Host Profile Card */}
          <Pressable
            onPress={() => router.push(`/user/${plan.host_id}`)}
            style={styles.hostCard}
          >
            <View style={styles.hostCardHeader}>
              <Text maxFontSizeMultiplier={1.3} style={styles.bentoLabel}>
                HOSTED BY
              </Text>
              <View style={styles.hostStatsPill}>
                <Text maxFontSizeMultiplier={1.3} style={styles.hostStatsText}>
                  ★ 96% show-up • {plan.host_plans_hosted} plans
                </Text>
              </View>
            </View>

            <View style={styles.hostRow}>
              <Image
                source={{ uri: plan.host_avatar_url }}
                cachePolicy="memory-disk"
                style={styles.hostAvatarLarge}
              />
              <View style={styles.hostInfoCol}>
                <Text maxFontSizeMultiplier={1.3} style={styles.hostNameLarge}>
                  {plan.host_first_name} · {plan.host_age_band} ✓
                </Text>
                {plan.host_college ? (
                  <Text maxFontSizeMultiplier={1.3} style={styles.hostCollege}>
                    {plan.host_college}
                  </Text>
                ) : null}
                {plan.description ? (
                  <Text maxFontSizeMultiplier={1.3} style={styles.planDescription}>
                    "{plan.description}"
                  </Text>
                ) : null}
              </View>
            </View>
          </Pressable>

          {/* Attendees & Spots Section */}
          <View style={styles.sectionCard}>
            <View style={styles.attendeesHeader}>
              <Text maxFontSizeMultiplier={1.3} style={styles.sectionCardTitle}>
                Attendees ({plan.approved_count}/{plan.capacity})
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.spotsRemainingPill}>
                {spotsLeft} spots remaining
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.attendeesRow}>
                {plan.attendee_Initials.map((initials, idx) => (
                  <View key={idx} style={styles.attendeeBubble}>
                    <Text style={styles.attendeeBubbleText}>{initials}</Text>
                    {idx === 0 ? (
                      <Text style={styles.hostTinyLabel}>HOST</Text>
                    ) : null}
                  </View>
                ))}
                {Array.from({ length: spotsLeft }).map((_, idx) => (
                  <View key={`open-${idx}`} style={styles.openSpotBubble}>
                    <Text style={styles.openSpotPlus}>＋</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Safety & Trusted Contact Quick Actions (SF-2, SF-3, PL-6) */}
          <View style={styles.safetyActionGrid}>
            <Pressable
              onPress={handleShareTrustedContact}
              accessibilityRole="button"
              style={styles.safetyActionBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.safetyActionText}>
                📲 Share Plan on WhatsApp (SF-2)
              </Text>
            </Pressable>

            <Pressable
              onPress={() => router.push(`/plan/${plan.id}/check-in`)}
              accessibilityRole="button"
              style={[styles.safetyActionBtn, styles.checkInActionBtn]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.checkInActionText}>
                📍 Check-In at Venue (150m · PL-6)
              </Text>
            </Pressable>
          </View>

          {/* Meetup Rules & Safety Card matching Stitch */}
          <View style={styles.sectionCard}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sectionCardTitle}>
              🛡️ Meetup Rules & Safety
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleBullet}>
              • <Text style={styles.boldWhite}>18+ Verified adults only:</Text> Verified via DigiLocker & selfie liveness.
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleBullet}>
              • <Text style={styles.boldWhite}>Strictly public venue:</Text> Held at an approved high-footfall Kota venue.
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleBullet}>
              • <Text style={styles.boldWhite}>Zero tolerance:</Text> Phone numbers and external handles are masked in group chat.
            </Text>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: '/report',
                  params: {
                    targetUserId: plan.host_id,
                    targetName: plan.host_first_name,
                    planId: plan.id,
                    context: 'plan',
                  },
                })
              }
              style={styles.reportPlanLink}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.reportPlanLinkText}>
                🚩 Report or Block from this Plan
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Liquid Glass CTA Bar matching Stitch */}
      <View style={styles.stickyBottomBar}>
        <View style={styles.stickyBottomRow}>
          <View>
            <Text maxFontSizeMultiplier={1.3} style={styles.admissionLabel}>
              ADMISSION
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.admissionValue}>
              Free to join · Split bill as you order
            </Text>
          </View>

          {isApproved ? (
            <Pressable
              onPress={() => router.push(`/chat/${plan.id}`)}
              style={styles.primaryCtaBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.primaryCtaBtnText}>
                Open Group Chat →
              </Text>
            </Pressable>
          ) : isRequested ? (
            <Pressable
              onPress={() => withdrawJoinRequest(plan.id)}
              style={styles.withdrawBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.withdrawBtnText}>
                Withdraw Request
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                if (profile.verification_status !== 'verified') {
                  setVerifyGateOpen(true);
                } else {
                  setJoinSheetOpen(true);
                }
              }}
              style={styles.primaryCtaBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.primaryCtaBtnText}>
                Join Plan →
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Request to Join Note Sheet (PL-3) */}
      <Modal
        visible={joinSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setJoinSheetOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sheetTitle}>
              Request to Join Plan (PL-3)
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.sheetSub}>
              {plan.host_first_name} will see your 18+ Verified badge, interests, and show-up rate. Add an optional note (max {MAX_JOIN_NOTE_CHARS} chars):
            </Text>
            <TextInput
              value={joinNote}
              onChangeText={setJoinNote}
              maxLength={MAX_JOIN_NOTE_CHARS}
              placeholder="e.g., Hey! Coming from Talwandi, excited for Catan!"
              placeholderTextColor={Colors.textMuted}
              style={styles.noteInput}
            />
            <Pressable onPress={handleConfirmJoin} style={styles.sheetConfirmBtn}>
              <Text maxFontSizeMultiplier={1.3} style={styles.sheetConfirmText}>
                Send Join Request →
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setJoinSheetOpen(false)}
              style={styles.sheetCancelBtn}
            >
              <Text style={styles.sheetCancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Verify Gate Sheet (ON-5) */}
      <Modal
        visible={verifyGateOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyGateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sheetTitle}>
              18+ Verification Required (ON-5)
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.sheetSub}>
              Anyone can browse Kota plans, but joining a group plan or chatting requires a one-time 18+ DigiLocker & selfie check.
            </Text>
            <Pressable
              onPress={() => {
                setVerifyGateOpen(false);
                router.push('/(verify)/intro');
              }}
              style={styles.sheetConfirmBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.sheetConfirmText}>
                Verify in 60 Seconds →
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVerifyGateOpen(false)}
              style={styles.sheetCancelBtn}
            >
              <Text style={styles.sheetCancelText}>Not Now</Text>
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
  scrollContent: {
    paddingBottom: 120,
  },
  notFoundBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  notFoundTitle: {
    color: Colors.primaryWhite,
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  notFoundSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
  },
  heroWrap: {
    width: '100%',
    height: 240,
    position: 'relative',
  },
  heroImg: {
    width: '100%',
    height: '100%',
  },
  heroScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(13, 14, 19, 0.35)',
  },
  spotsLivePill: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(18, 19, 24, 0.85)',
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.trustEmerald,
  },
  spotsLiveText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bodyPadding: {
    padding: 16,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  tagPillText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  womenPill: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: Colors.electricViolet,
  },
  womenPillText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '700',
  },
  titleText: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 14,
  },
  feedbackCard: {
    backgroundColor: Colors.trustEmeraldBg,
    borderRadius: Radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
    marginBottom: 14,
  },
  feedbackText: {
    color: Colors.trustEmerald,
    fontSize: 12,
    fontWeight: '700',
  },
  bentoCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 10,
  },
  bentoIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bentoEmoji: {
    fontSize: 20,
  },
  bentoTextCol: {
    flex: 1,
  },
  bentoLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  bentoPrimary: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  bentoSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  verifiedZoneText: {
    color: Colors.trustEmerald,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  hostCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 10,
  },
  hostCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hostStatsPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
  },
  hostStatsText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  hostRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hostAvatarLarge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  hostInfoCol: {
    flex: 1,
  },
  hostNameLarge: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  hostCollege: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  planDescription: {
    color: Colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 12,
  },
  attendeesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCardTitle: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  spotsRemainingPill: {
    color: Colors.trustEmerald,
    fontSize: 11,
    fontWeight: '700',
  },
  attendeesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  attendeeBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeeBubbleText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '800',
  },
  hostTinyLabel: {
    color: Colors.electricLime,
    fontSize: 8,
    fontWeight: '900',
  },
  openSpotBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openSpotPlus: {
    color: Colors.textMuted,
    fontSize: 16,
  },
  safetyActionGrid: {
    gap: 8,
    marginBottom: 12,
  },
  safetyActionBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  safetyActionText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  checkInActionBtn: {
    backgroundColor: Colors.trustEmeraldBg,
    borderColor: Colors.trustEmeraldBorder,
  },
  checkInActionText: {
    color: Colors.trustEmerald,
    fontSize: 13,
    fontWeight: '800',
  },
  ruleBullet: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
  },
  boldWhite: {
    color: Colors.primaryWhite,
    fontWeight: '700',
  },
  reportPlanLink: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  reportPlanLinkText: {
    color: Colors.errorCoral,
    fontSize: 12,
    fontWeight: '700',
  },
  stickyBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.canvasLowest,
    borderTopWidth: 1,
    borderTopColor: Colors.borderElevated,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
  },
  stickyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  admissionLabel: {
    color: Colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
  },
  admissionValue: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  primaryCtaBtn: {
    minHeight: Spacing.touchMin,
    paddingHorizontal: 22,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryCtaBtnText: {
    color: Colors.onPrimaryDark,
    fontSize: 14,
    fontWeight: '800',
  },
  withdrawBtn: {
    minHeight: Spacing.touchMin,
    paddingHorizontal: 18,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  withdrawBtnText: {
    color: Colors.errorCoral,
    fontSize: 13,
    fontWeight: '700',
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
    borderTopWidth: 1,
    borderTopColor: Colors.borderElevated,
  },
  sheetTitle: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  sheetSub: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  noteInput: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    padding: 12,
    color: Colors.primaryWhite,
    fontSize: 14,
    marginBottom: 16,
  },
  sheetConfirmBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetConfirmText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
  sheetCancelBtn: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  sheetCancelText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
