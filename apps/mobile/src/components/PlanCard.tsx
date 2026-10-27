/**
 * Memoized Plan Card for FlashList (list-performance-item-memo, list-performance-images, ui-expo-image)
 * Visuals faithfully replicate Stitch screen `projects/8524346772271803736/screens/2be2a8394076495098ab6f7db39cb494`
 * ("Yuvomeet - Discover Home").
 */

import React, { memo, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { ACTIVITIES, type FeedPlanCard, type MemberStatus } from '@yuvomeet/shared';
import { Colors, formatPlanDateTime, Radii, Spacing } from '../theme/tokens';

export interface PlanCardProps {
  plan: FeedPlanCard;
  memberStatus?: MemberStatus;
  onPressCard: (planId: string) => void;
  onPressJoin: (planId: string) => void;
  onPressHost: (hostId: string) => void;
}

function PlanCardComponent({
  plan,
  memberStatus,
  onPressCard,
  onPressJoin,
  onPressHost,
}: PlanCardProps) {
  const spotsLeft = Math.max(0, plan.capacity - plan.approved_count);
  const isFillingFast = spotsLeft > 0 && spotsLeft <= 3;
  const activityLabel =
    ACTIVITIES.find((a) => a.slug === plan.activity)?.labelEn ?? plan.activity;
  const formattedTime = formatPlanDateTime(plan.starts_at);

  const handleCardPress = useCallback(() => {
    onPressCard(plan.id);
  }, [onPressCard, plan.id]);

  const handleJoinPress = useCallback(() => {
    onPressJoin(plan.id);
  }, [onPressJoin, plan.id]);

  const handleHostPress = useCallback(() => {
    onPressHost(plan.host_id);
  }, [onPressHost, plan.host_id]);

  const joinLabel =
    memberStatus === 'approved' || memberStatus === 'attended'
      ? 'Joined'
      : memberStatus === 'requested'
      ? 'Requested'
      : spotsLeft === 0
      ? 'Full'
      : 'Join';

  return (
    <Pressable
      onPress={handleCardPress}
      accessibilityRole="button"
      accessibilityLabel={`${plan.title} at ${plan.venue_name}, ${formattedTime}, ${spotsLeft} spots left`}
      style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]}
    >
      {/* Hero Banner Image with expo-image recyclingKey */}
      <View style={styles.bannerContainer}>
        <Image
          source={{ uri: plan.cover_image_url }}
          recyclingKey={plan.id}
          cachePolicy="memory-disk"
          contentFit="cover"
          transition={150}
          style={styles.bannerImage}
        />
        <View style={styles.bannerScrim} />

        {/* Top Badges Row */}
        <View style={styles.topBadgesRow}>
          <View style={styles.darkPillBadge}>
            <Text maxFontSizeMultiplier={1.3} style={styles.badgeTextWhite}>
              {activityLabel}
            </Text>
          </View>

          {plan.audience === 'women_only' ? (
            <View style={styles.womenOnlyBadge}>
              <Text maxFontSizeMultiplier={1.3} style={styles.womenOnlyText}>
                ♀ Women Only
              </Text>
            </View>
          ) : null}

          {isFillingFast ? (
            <View style={styles.darkPillBadge}>
              <Text maxFontSizeMultiplier={1.3} style={styles.fillingFastText}>
                🔥 Filling Fast
              </Text>
            </View>
          ) : null}
        </View>

        {/* Bottom Banner Row: Time & Spots Left */}
        <View style={styles.bottomBannerRow}>
          <View style={styles.timeBadge}>
            <Text maxFontSizeMultiplier={1.3} style={styles.timeText}>
              🕒 {formattedTime}
            </Text>
          </View>
          <View style={styles.spotsPill}>
            <Text maxFontSizeMultiplier={1.3} style={styles.spotsText}>
              {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
            </Text>
          </View>
        </View>
      </View>

      {/* Card Content Body */}
      <View style={styles.bodyContainer}>
        <Text
          maxFontSizeMultiplier={1.3}
          numberOfLines={1}
          style={styles.planTitle}
        >
          {plan.title}
        </Text>

        <View style={styles.venueRow}>
          <Text
            maxFontSizeMultiplier={1.3}
            numberOfLines={1}
            style={styles.venueText}
          >
            📍 {plan.venue_name}
          </Text>
          {plan.venue_partner ? (
            <View style={styles.partnerChip}>
              <Text maxFontSizeMultiplier={1.3} style={styles.partnerChipText}>
                Verified Venue
              </Text>
            </View>
          ) : null}
        </View>

        {/* Footer: Host & Attendee Stack + Join CTA */}
        <View style={styles.footerRow}>
          <Pressable
            onPress={handleHostPress}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Host ${plan.host_first_name}`}
            style={styles.hostRow}
          >
            <View style={styles.hostAvatarWrap}>
              <Image
                source={{ uri: plan.host_avatar_url }}
                recyclingKey={`host-${plan.host_id}`}
                cachePolicy="memory-disk"
                style={styles.hostAvatar}
              />
              {plan.host_verified ? (
                <View style={styles.verifiedDot}>
                  <Text style={styles.verifiedCheck}>✓</Text>
                </View>
              ) : null}
            </View>
            <Text maxFontSizeMultiplier={1.3} style={styles.hostName}>
              {plan.host_first_name}
            </Text>
            <View style={styles.hostTag}>
              <Text maxFontSizeMultiplier={1.3} style={styles.hostTagText}>
                Host
              </Text>
            </View>
          </Pressable>

          <View style={styles.rightActions}>
            <View style={styles.avatarStack}>
              {plan.attendee_Initials.slice(0, 3).map((initials, idx) => (
                <View
                  key={`${plan.id}-att-${idx}`}
                  style={[styles.stackCircle, idx > 0 ? styles.stackOverlap : null]}
                >
                  <Text style={styles.stackInitialsText}>{initials}</Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={handleJoinPress}
              disabled={spotsLeft === 0 && !memberStatus}
              accessibilityRole="button"
              accessibilityLabel={`${joinLabel} ${plan.title}`}
              style={({ pressed }) => [
                styles.joinButton,
                memberStatus === 'approved' || memberStatus === 'attended'
                  ? styles.joinButtonConfirmed
                  : memberStatus === 'requested'
                  ? styles.joinButtonRequested
                  : null,
                pressed ? styles.joinButtonPressed : null,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.joinButtonText,
                  memberStatus === 'requested' ? styles.joinButtonTextLight : null,
                ]}
              >
                {joinLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const PlanCard = memo(PlanCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  cardPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.95,
  },
  bannerContainer: {
    width: '100%',
    height: 176,
    borderRadius: Radii.DEFAULT,
    overflow: 'hidden',
    backgroundColor: Colors.canvasLowest,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 8, 12, 0.38)',
  },
  topBadgesRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  darkPillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(13, 14, 19, 0.78)',
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  badgeTextWhite: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  fillingFastText: {
    color: Colors.warningAmber,
    fontSize: 11,
    fontWeight: '600',
  },
  womenOnlyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(139, 92, 246, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  womenOnlyText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '700',
  },
  bottomBannerRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(13, 14, 19, 0.75)',
  },
  timeText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  spotsPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  spotsText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '600',
  },
  bodyContainer: {
    paddingTop: 10,
    paddingHorizontal: 4,
  },
  planTitle: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    gap: 8,
  },
  venueText: {
    color: Colors.textSecondary,
    fontSize: 12,
    flex: 1,
  },
  partnerChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.trustEmeraldBg,
    borderWidth: 1,
    borderColor: Colors.trustEmeraldBorder,
  },
  partnerChipText: {
    color: Colors.trustEmerald,
    fontSize: 10,
    fontWeight: '600',
  },
  footerRow: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  hostAvatarWrap: {
    width: 30,
    height: 30,
    position: 'relative',
  },
  hostAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.trustEmerald,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.surfaceLow,
  },
  verifiedCheck: {
    color: Colors.canvasLowest,
    fontSize: 8,
    fontWeight: '900',
  },
  hostName: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  hostTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
  },
  hostTagText: {
    color: Colors.textSecondary,
    fontSize: 9,
    fontWeight: '600',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stackCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1.5,
    borderColor: Colors.surfaceLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackOverlap: {
    marginLeft: -6,
  },
  stackInitialsText: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: '700',
  },
  joinButton: {
    minHeight: Spacing.touchMin - 8,
    minWidth: 72,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  joinButtonConfirmed: {
    backgroundColor: Colors.electricLime,
  },
  joinButtonRequested: {
    backgroundColor: Colors.surfaceHigh,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  joinButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  joinButtonText: {
    color: Colors.onPrimaryDark,
    fontSize: 12,
    fontWeight: '700',
  },
  joinButtonTextLight: {
    color: Colors.primaryWhite,
  },
});
