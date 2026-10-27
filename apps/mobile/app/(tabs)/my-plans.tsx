/**
 * Route: `(tabs)/my-plans`
 * Replicates Stitch "Yuvomeet - My Plans" (`e349792e698b4eefbb668330d2062fc6`).
 * Closes PL-5, SB-1, SF-4:
 * - Segmented tabs: Upcoming, Hosted, Pending, Past
 * - Host review requests shortcut (`plan/[id]/requests`)
 * - Check-in & Open Chat shortcuts
 * - Post-plan private rating shortcut (`plan/[id]/rate`)
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FREE_JOINS_PER_WEEK } from '@yuvomeet/shared';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, formatPlanDateTime, Radii } from '../../src/theme/tokens';

export default function MyPlansScreen() {
  const router = useRouter();
  const {
    plans,
    memberships,
    hostRequests,
    withdrawJoinRequest,
    weeklyJoinsUsed,
  } = useYuvomeet();

  const [tab, setTab] = useState<'upcoming' | 'hosted' | 'pending' | 'past'>('upcoming');

  const pendingReqCount = hostRequests.filter((r) => r.status === 'requested').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Header matching Stitch My Plans */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <Text maxFontSizeMultiplier={1.3} style={styles.title}>
            My Plans
          </Text>
          <View style={styles.headerRight}>
            <View style={styles.capBadge}>
              <Text maxFontSizeMultiplier={1.3} style={styles.capBadgeText}>
                Free Tier: {weeklyJoinsUsed}/{FREE_JOINS_PER_WEEK} weekly joins
              </Text>
            </View>
            <Pressable
              onPress={() => router.push('/plan/create')}
              style={styles.hostBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.hostBtnText}>
                ＋ Host
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Segmented Control Tray */}
        <View style={styles.segmentTray}>
          {(['upcoming', 'hosted', 'pending', 'past'] as const).map((item) => {
            const active = tab === item;
            return (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                style={[styles.segmentBtn, active ? styles.segmentBtnActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.segmentText, active ? styles.segmentTextActive : null]}
                >
                  {item === 'upcoming'
                    ? 'Upcoming'
                    : item === 'hosted'
                    ? `Hosted (${pendingReqCount})`
                    : item === 'pending'
                    ? 'Pending'
                    : 'Past'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hosted By You Card */}
        {(tab === 'upcoming' || tab === 'hosted') && (
          <View style={styles.sectionBlock}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sectionHeader}>
              ★ HOSTED BY YOU
            </Text>
            <View style={styles.glassCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.flexOne}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.timeTag}>
                    TONIGHT • 8:30 PM
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.planTitle}>
                    Chai & Late Night Board Games
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.venueSub}>
                    📍 Chai Sutta Bar, Vigyan Nagar
                  </Text>
                </View>
                <View style={styles.spotsBadge}>
                  <Text style={styles.spotsBadgeText}>5 / 8 spots</Text>
                </View>
              </View>

              {/* Attendee Requests Banner */}
              <View style={styles.requestsBanner}>
                <Text maxFontSizeMultiplier={1.3} style={styles.requestsText}>
                  👥 {pendingReqCount} join request(s) pending review
                </Text>
                <Pressable
                  onPress={() => router.push('/plan/plan-chai-games/requests')}
                  style={styles.reviewPill}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.reviewPillText}>
                    Review →
                  </Text>
                </Pressable>
              </View>

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => router.push('/plan/plan-chai-games/requests')}
                  style={styles.secondaryActionBtn}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.secondaryActionText}>
                    Manage & Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => router.push('/chat/plan-chai-games')}
                  style={styles.primaryActionBtn}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.primaryActionText}>
                    Group Chat
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* Upcoming Confirmed Plans */}
        {tab === 'upcoming' && (
          <View style={styles.sectionBlock}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sectionHeader}>
              ✓ UPCOMING JOINED PLANS
            </Text>
            {plans
              .filter(
                (p) =>
                  memberships[p.id]?.status === 'approved' ||
                  memberships[p.id]?.status === 'attended',
              )
              .map((pl) => (
                <View key={pl.id} style={styles.glassCard}>
                  <View style={styles.confirmedHeaderRow}>
                    <Text maxFontSizeMultiplier={1.3} style={styles.timeTag}>
                      {formatPlanDateTime(pl.starts_at)}
                    </Text>
                    <View style={styles.confirmedPill}>
                      <Text style={styles.confirmedPillText}>
                        {memberships[pl.id]?.checkedInAt ? '✓ Checked In' : '● Confirmed'}
                      </Text>
                    </View>
                  </View>

                  <Text maxFontSizeMultiplier={1.3} style={styles.planTitle}>
                    {pl.title}
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.venueSub}>
                    📍 {pl.venue_name}
                  </Text>

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() => router.push(`/chat/${pl.id}`)}
                      style={styles.secondaryActionBtn}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={styles.secondaryActionText}>
                        💬 Open Chat
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => router.push(`/plan/${pl.id}/check-in`)}
                      style={styles.primaryActionBtn}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={styles.primaryActionText}>
                        📍 Check In (150m)
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Pending Requests */}
        {(tab === 'upcoming' || tab === 'pending') && (
          <View style={styles.sectionBlock}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sectionHeader}>
              ⏳ PENDING REQUESTS
            </Text>
            {plans
              .filter((p) => memberships[p.id]?.status === 'requested')
              .map((pl) => (
                <View key={pl.id} style={styles.glassCard}>
                  <View style={styles.confirmedHeaderRow}>
                    <Text maxFontSizeMultiplier={1.3} style={styles.timeTag}>
                      {formatPlanDateTime(pl.starts_at)}
                    </Text>
                    <View style={styles.amberPill}>
                      <Text style={styles.amberPillText}>Host Reviewing</Text>
                    </View>
                  </View>
                  <Text maxFontSizeMultiplier={1.3} style={styles.planTitle}>
                    {pl.title}
                  </Text>
                  <Text maxFontSizeMultiplier={1.3} style={styles.venueSub}>
                    📍 {pl.venue_name}
                  </Text>

                  <View style={styles.pendingFooter}>
                    <Text maxFontSizeMultiplier={1.3} style={styles.pendingMeta}>
                      Decline or withdrawal returns your weekly slot (Rule S-25)
                    </Text>
                    <Pressable
                      onPress={() => withdrawJoinRequest(pl.id)}
                      style={styles.withdrawLink}
                    >
                      <Text maxFontSizeMultiplier={1.3} style={styles.withdrawLinkText}>
                        Withdraw
                      </Text>
                    </Pressable>
                  </View>
                </View>
              ))}
          </View>
        )}

        {/* Past Meetups & Post-Plan Private Rating (SF-4) */}
        {(tab === 'upcoming' || tab === 'past') && (
          <View style={styles.sectionBlock}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sectionHeader}>
              🕒 RECENT HISTORY & PRIVATE RATINGS (SF-4)
            </Text>
            <View style={styles.historyPlate}>
              <View style={styles.flexOne}>
                <Text maxFontSizeMultiplier={1.3} style={styles.planTitle}>
                  Weekend Code & Filter Coffee
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={styles.venueSub}>
                  Completed • Roastery Coffee House • 5 Attended
                </Text>
              </View>
              <Pressable
                onPress={() => router.push('/plan/plan-chai-games/rate')}
                style={styles.rateBtn}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.rateBtnText}>
                  ★ Rate Safety
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  capBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
  },
  capBadgeText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  hostBtn: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostBtnText: {
    color: Colors.onPrimaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  segmentTray: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  segmentBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnActive: {
    backgroundColor: Colors.surfaceBright,
  },
  segmentText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: Colors.primaryWhite,
    fontWeight: '700',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeader: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 10,
  },
  glassCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  flexOne: {
    flex: 1,
  },
  timeTag: {
    color: Colors.electricLime,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  planTitle: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
  },
  venueSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 3,
  },
  spotsBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
  },
  spotsBadgeText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '700',
  },
  requestsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  requestsText: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  reviewPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
  },
  reviewPillText: {
    color: Colors.onElectricLime,
    fontSize: 11,
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  secondaryActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  primaryActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.md,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: Colors.onPrimaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  confirmedHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  confirmedPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  confirmedPillText: {
    color: Colors.trustEmerald,
    fontSize: 10,
    fontWeight: '800',
  },
  amberPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.warningAmberBg,
  },
  amberPillText: {
    color: Colors.warningAmber,
    fontSize: 10,
    fontWeight: '800',
  },
  pendingFooter: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pendingMeta: {
    color: Colors.textMuted,
    fontSize: 11,
    flex: 1,
  },
  withdrawLink: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  withdrawLinkText: {
    color: Colors.errorCoral,
    fontSize: 12,
    fontWeight: '700',
  },
  historyPlate: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  rateBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateBtnText: {
    color: Colors.onElectricLime,
    fontSize: 12,
    fontWeight: '800',
  },
});
