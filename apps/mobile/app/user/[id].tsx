/**
 * Route: `user/[id]`
 * Replicates Stitch "Yuvomeet - Public Member Profile" (`771fa411bb3540c5a534639e2bba9d91`).
 * Enforces S-18: Shows first name, age band (18–20, 21–24, 25–30, 30+), verified badge,
 * interests, area name, and aggregate stats (plans attended, show-up rate when >= 3 plans).
 * Never exposes birth year, phone number, or exact coordinates.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { INTERESTS } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function PublicMemberProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { getPublicProfile, blockMember } = useYuvomeet();

  const member = getPublicProfile(id ?? 'host-lakshay');

  if (!member) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Profile Not Found" />
        <View style={styles.emptyBox}>
          <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
            This profile is unavailable or blocked (Rule S-17).
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Yuvomeet"
        subtitle="Verified Member Profile (Rule S-18)"
        rightActionLabel="Report / Block"
        onRightAction={() =>
          router.push({
            pathname: '/report',
            params: { targetUserId: member.id, targetName: member.first_name, context: 'profile' },
          })
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* Avatar Hero with Verified Checkmark */}
        <View style={styles.heroCenter}>
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: member.approved_photos[0] }}
              cachePolicy="memory-disk"
              contentFit="cover"
              style={styles.avatarImg}
            />
            {member.is_verified ? (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedCheck}>✓</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.nameRow}>
            <Text maxFontSizeMultiplier={1.3} style={styles.nameText}>
              {member.first_name}
            </Text>
            {member.is_verified ? (
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedPillText}>18+ Verified</Text>
              </View>
            ) : null}
          </View>

          <Text maxFontSizeMultiplier={1.3} style={styles.metaText}>
            Age {member.age_band} · {member.area_name}
            {member.college_name ? ` · ${member.college_name}` : ''}
          </Text>

          {member.bio ? (
            <Text maxFontSizeMultiplier={1.3} style={styles.bioText}>
              {member.bio}
            </Text>
          ) : null}
        </View>

        {/* Bento Quick Stats Plate matching Stitch */}
        <View style={styles.statsPlate}>
          <View style={styles.statCol}>
            <Text maxFontSizeMultiplier={1.3} style={styles.statValue}>
              {member.plans_hosted}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.statLabel}>
              Meets Hosted
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text maxFontSizeMultiplier={1.3} style={styles.statValue}>
              {member.plans_attended}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.statLabel}>
              Plans Attended
            </Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCol}>
            <Text maxFontSizeMultiplier={1.3} style={[styles.statValue, styles.emeraldValue]}>
              {member.show_up_rate !== null ? `${member.show_up_rate}%` : 'New'}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.statLabel}>
              Show-Up Rate
            </Text>
          </View>
        </View>

        {/* Mutual Interests */}
        <View style={styles.section}>
          <Text maxFontSizeMultiplier={1.3} style={styles.sectionTitle}>
            INTERESTS & VIBES
          </Text>
          <View style={styles.chipsWrap}>
            {member.interests.map((slug) => {
              const label = INTERESTS.find((i) => i.slug === slug)?.labelEn ?? slug;
              return (
                <View key={slug} style={styles.interestChip}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.interestText}>
                    {label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Group-First Privacy Notice */}
        <View style={styles.trustCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.trustTitle}>
            🛡️ Group-First Safety Principle
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.trustBody}>
            No 1:1 messaging is allowed in P0 before sharing a completed group plan. Phone numbers and exact birth years are never exposed (Rule S-18).
          </Text>
        </View>

        {/* Safety & Block Controls (CH-4) */}
        <View style={styles.actionsRow}>
          <Pressable
            onPress={() =>
              router.push({
                pathname: '/report',
                params: {
                  targetUserId: member.id,
                  targetName: member.first_name,
                  context: 'profile',
                },
              })
            }
            accessibilityRole="button"
            style={styles.reportBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.reportBtnText}>
              🚩 Report or Block {member.first_name}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              blockMember(member.id, 'profile');
              router.back();
            }}
            accessibilityRole="button"
            style={styles.blockBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.blockBtnText}>
              Block Immediately
            </Text>
          </Pressable>
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
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  heroCenter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    padding: 3,
    backgroundColor: Colors.surfaceHigh,
    position: 'relative',
    marginBottom: 14,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 53,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.trustEmerald,
    borderWidth: 2,
    borderColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifiedCheck: {
    color: Colors.canvasLowest,
    fontSize: 14,
    fontWeight: '900',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
  },
  verifiedPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  verifiedPillText: {
    color: Colors.trustEmerald,
    fontSize: 10,
    fontWeight: '800',
  },
  metaText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    textAlign: 'center',
  },
  bioText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 12,
    paddingHorizontal: 12,
  },
  statsPlate: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.borderSubtle,
  },
  statValue: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  emeraldValue: {
    color: Colors.trustEmerald,
  },
  statLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  interestChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  interestText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  trustCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 20,
  },
  trustTitle: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  trustBody: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  actionsRow: {
    gap: 10,
  },
  reportBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(147, 0, 10, 0.35)',
    borderWidth: 1,
    borderColor: Colors.errorCoral,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: {
    color: Colors.errorCoral,
    fontSize: 14,
    fontWeight: '700',
  },
  blockBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBtnText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
