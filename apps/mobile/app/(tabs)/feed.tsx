/**
 * Route: `(tabs)/feed` + `(tabs)/feed/filters` sheet
 * Replicates Stitch "Yuvomeet - Discover Home" (`2be2a8394076495098ab6f7db39cb494`).
 * Performance:
 * - `@shopify/flash-list` with `estimatedItemSize={306}`, stable `keyExtractor`, memoized `PlanCard`
 * - Zero inline style objects in list items (`list-performance-inline-objects`)
 * - Stabilized callbacks (`useCallback`)
 * - Enforces PL-2, ON-5, S-14 (city scope), S-15 (women-only zero rows for non-verified-women), S-17 (blocks).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import {
  ACTIVITIES,
  type FeedPlanCard,
  KOTA_AREAS,
  type PlanAudience,
} from '@yuvomeet/shared';
import { PlanCard } from '../../src/components/PlanCard';
import { switchAppLocale } from '../../src/lib/i18n';
import { useYuvomeet } from '../../src/lib/store';
import { startPerfSpan } from '../../src/lib/telemetry';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function DiscoverFeedScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const {
    profile,
    visibleFeedPlans,
    memberships,
    requestJoinPlan,
    isOfflineSimulated,
    setOfflineSimulated,
  } = useYuvomeet();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<string>('all');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedAudience, setSelectedAudience] = useState<'all' | PlanAudience>('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [verifyGatePlanId, setVerifyGatePlanId] = useState<string | null>(null);
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  useEffect(() => {
    const span = startPerfSpan('feed_first_page');
    span.finish();
  }, []);

  const filteredPlans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return visibleFeedPlans.filter((pl) => {
      if (selectedActivity !== 'all' && pl.activity !== selectedActivity) return false;
      if (selectedArea !== 'all' && pl.venue_area_name !== selectedArea) return false;
      if (selectedAudience !== 'all' && pl.audience !== selectedAudience) return false;
      if (q) {
        const hay = `${pl.title} ${pl.venue_name} ${pl.venue_area_name} ${pl.host_first_name}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [searchQuery, selectedActivity, selectedArea, selectedAudience, visibleFeedPlans]);

  const handlePressCard = useCallback(
    (planId: string) => {
      router.push(`/plan/${planId}`);
    },
    [router],
  );

  const handlePressHost = useCallback(
    (hostId: string) => {
      router.push(`/user/${hostId}`);
    },
    [router],
  );

  const handlePressJoin = useCallback(
    (planId: string) => {
      if (profile.verification_status !== 'verified') {
        // ON-5: Feed is readable without verification; join prompts verification
        setVerifyGatePlanId(planId);
        return;
      }
      const res = requestJoinPlan(planId);
      if (!res.ok) {
        setBannerNotice(res.message ?? 'Could not request join');
      } else {
        setBannerNotice('Join request sent to host! Track status in My Plans.');
      }
    },
    [profile.verification_status, requestJoinPlan],
  );

  const keyExtractor = useCallback((item: FeedPlanCard) => item.id, []);

  const renderPlanItem = useCallback(
    ({ item }: ListRenderItemInfo<FeedPlanCard>) => (
      <PlanCard
        plan={item}
        memberStatus={memberships[item.id]?.status}
        onPressCard={handlePressCard}
        onPressJoin={handlePressJoin}
        onPressHost={handlePressHost}
      />
    ),
    [handlePressCard, handlePressHost, handlePressJoin, memberships],
  );

  const currentLang = i18n.language === 'hi' ? 'hi' : 'en';

  return (
    <SafeAreaView style={styles.container}>
      {/* Sticky Top App Bar matching Stitch Discover Home */}
      <View style={styles.topHeader}>
        <View style={styles.locationBarRow}>
          <Pressable
            onPress={() => router.push('/(entry)/city')}
            accessibilityRole="button"
            style={styles.locationBtn}
          >
            <View style={styles.nearMeCircle}>
              <Text style={styles.nearMeIcon}>📍</Text>
            </View>
            <View>
              <Text maxFontSizeMultiplier={1.3} style={styles.cityTitle}>
                {t('kotaHub')} ▾
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.verifiedSub}>
                ✓ {t('verifiedStudentHub')} · {profile.verification_status === 'verified' ? `18+ (${profile.verified_gender})` : 'Unverified'}
              </Text>
            </View>
          </Pressable>

          <View style={styles.topRightActions}>
            <Pressable
              onPress={() => switchAppLocale(currentLang === 'en' ? 'hi' : 'en')}
              accessibilityRole="button"
              accessibilityLabel="Switch Language"
              style={styles.iconCircleBtn}
            >
              <Text style={styles.langCodeText}>{currentLang === 'en' ? 'HI' : 'EN'}</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push('/plan/create')}
              accessibilityRole="button"
              accessibilityLabel="Host a Plan"
              style={styles.hostPillBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.hostPillText}>
                ＋ Host
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Search & Filters Bar */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('feed.searchPlaceholder')}
              placeholderTextColor={Colors.textMuted}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            onPress={() => setFiltersOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Open Filters"
            style={styles.filterPillBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.filterPillText}>
              ⚙ {t('feed.filters')}
            </Text>
          </Pressable>
        </View>

        {/* Horizontal Category Chips Tray */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          <Pressable
            onPress={() => setSelectedActivity('all')}
            style={[
              styles.categoryChip,
              selectedActivity === 'all' ? styles.categoryChipActive : null,
            ]}
          >
            <Text
              maxFontSizeMultiplier={1.3}
              style={[
                styles.categoryChipText,
                selectedActivity === 'all' ? styles.categoryChipTextActive : null,
              ]}
            >
              {t('feed.all')}
            </Text>
          </Pressable>

          {ACTIVITIES.map((act) => {
            const active = selectedActivity === act.slug;
            return (
              <Pressable
                key={act.slug}
                onPress={() => setSelectedActivity(act.slug)}
                style={[styles.categoryChip, active ? styles.categoryChipActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    styles.categoryChipText,
                    active ? styles.categoryChipTextActive : null,
                  ]}
                >
                  {currentLang === 'hi' ? act.labelHi : act.labelEn}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Optional Toast / Banner Notice */}
      {bannerNotice ? (
        <Pressable onPress={() => setBannerNotice(null)} style={styles.noticeBanner}>
          <Text maxFontSizeMultiplier={1.3} style={styles.noticeBannerText}>
            {bannerNotice} (tap to dismiss)
          </Text>
        </Pressable>
      ) : null}

      {/* Main Virtualized FlashList */}
      <View style={styles.listWrapper}>
        <FlashList
          data={filteredPlans}
          renderItem={renderPlanItem}
          keyExtractor={keyExtractor}
          estimatedItemSize={306}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {/* Verified Campus Circles Banner matching Stitch */}
              <Pressable
                onPress={() => router.push('/venues')}
                style={styles.campusBanner}
              >
                <View style={styles.campusBannerLeft}>
                  <View style={styles.schoolCircle}>
                    <Text style={styles.schoolEmoji}>🎓</Text>
                  </View>
                  <View>
                    <Text maxFontSizeMultiplier={1.3} style={styles.campusBannerTitle}>
                      Allen, Resonance & IIIT Kota Circles
                    </Text>
                    <Text maxFontSizeMultiplier={1.3} style={styles.campusBannerSub}>
                      5 approved public partner cafes · Tap to view venues
                    </Text>
                  </View>
                </View>
                <View style={styles.activeNowTag}>
                  <Text style={styles.activeNowText}>Venues →</Text>
                </View>
              </Pressable>

              <View style={styles.sectionTitleRow}>
                <Text maxFontSizeMultiplier={1.3} style={styles.sectionTitle}>
                  {t('feed.activeGatherings')} ({filteredPlans.length})
                </Text>
                <Pressable
                  onPress={() => setOfflineSimulated(!isOfflineSimulated)}
                  style={styles.offlineTogglePill}
                >
                  <Text style={styles.offlineToggleText}>
                    {isOfflineSimulated ? '⚡ Offline Cache ON' : '🟢 4G Online'}
                  </Text>
                </Pressable>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>☕</Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.emptyTitle}>
                {t('feed.emptyTitle')}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.emptySub}>
                {t('feed.emptySub')}
              </Text>
              <Pressable
                onPress={() => {
                  setSelectedActivity('all');
                  setSelectedArea('all');
                  setSelectedAudience('all');
                  setSearchQuery('');
                }}
                style={styles.resetFilterBtn}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.resetFilterText}>
                  Reset All Filters
                </Text>
              </Pressable>
            </View>
          }
        />
      </View>

      {/* `(tabs)/feed/filters` Sheet Modal */}
      <Modal
        visible={filtersOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFiltersOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeaderRow}>
              <Text maxFontSizeMultiplier={1.3} style={styles.sheetTitle}>
                Filter Kota Plans (PL-2)
              </Text>
              <Pressable onPress={() => setFiltersOpen(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </Pressable>
            </View>

            <Text maxFontSizeMultiplier={1.3} style={styles.filterGroupLabel}>
              AUDIENCE
            </Text>
            <View style={styles.filterPillsWrap}>
              {(['all', 'everyone', 'women_only', 'same_college'] as const).map((aud) => (
                <Pressable
                  key={aud}
                  onPress={() => setSelectedAudience(aud)}
                  style={[
                    styles.filterChoice,
                    selectedAudience === aud ? styles.filterChoiceActive : null,
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.filterChoiceText,
                      selectedAudience === aud ? styles.filterChoiceTextActive : null,
                    ]}
                  >
                    {aud === 'all'
                      ? 'All Audiences'
                      : aud === 'women_only'
                      ? '♀ Women Only'
                      : aud === 'same_college'
                      ? '🎓 Same College'
                      : 'Everyone'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text maxFontSizeMultiplier={1.3} style={styles.filterGroupLabel}>
              KOTA AREA
            </Text>
            <View style={styles.filterPillsWrap}>
              <Pressable
                onPress={() => setSelectedArea('all')}
                style={[
                  styles.filterChoice,
                  selectedArea === 'all' ? styles.filterChoiceActive : null,
                ]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[
                    styles.filterChoiceText,
                    selectedArea === 'all' ? styles.filterChoiceTextActive : null,
                  ]}
                >
                  All Kota Areas
                </Text>
              </Pressable>
              {KOTA_AREAS.map((area) => (
                <Pressable
                  key={area.slug}
                  onPress={() => setSelectedArea(area.nameEn)}
                  style={[
                    styles.filterChoice,
                    selectedArea === area.nameEn ? styles.filterChoiceActive : null,
                  ]}
                >
                  <Text
                    maxFontSizeMultiplier={1.3}
                    style={[
                      styles.filterChoiceText,
                      selectedArea === area.nameEn ? styles.filterChoiceTextActive : null,
                    ]}
                  >
                    {area.nameEn}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={() => setFiltersOpen(false)}
              style={styles.applySheetBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.applySheetBtnText}>
                Show {filteredPlans.length} Plans
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* `plan/[id]/verify-gate` Sheet Modal (Rule ON-5) */}
      <Modal
        visible={Boolean(verifyGatePlanId)}
        transparent
        animationType="slide"
        onRequestClose={() => setVerifyGatePlanId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text maxFontSizeMultiplier={1.3} style={styles.sheetTitle}>
              {t('verify.gateTitle')}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.gateDesc}>
              {t('verify.gateSub')}
            </Text>
            <Pressable
              onPress={() => {
                setVerifyGatePlanId(null);
                router.push('/(verify)/intro');
              }}
              style={styles.applySheetBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.applySheetBtnText}>
                {t('verify.startVerify')} →
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setVerifyGatePlanId(null)}
              style={styles.cancelSheetBtn}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.cancelSheetText}>
                Keep Browsing Feed
              </Text>
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
  topHeader: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  locationBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
  },
  nearMeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearMeIcon: {
    fontSize: 16,
  },
  cityTitle: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedSub: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langCodeText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '800',
  },
  hostPillBtn: {
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostPillText: {
    color: Colors.onElectricLime,
    fontSize: 12,
    fontWeight: '800',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  searchBox: {
    flex: 1,
    height: 42,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: Colors.primaryWhite,
    fontSize: 13,
  },
  filterPillBtn: {
    height: 42,
    paddingHorizontal: 14,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '600',
  },
  chipsScroll: {
    gap: 8,
    paddingRight: 12,
  },
  categoryChip: {
    minHeight: 36,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'center',
  },
  categoryChipActive: {
    backgroundColor: Colors.primaryWhite,
    borderColor: Colors.primaryWhite,
  },
  categoryChipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: Colors.onPrimaryDark,
    fontWeight: '700',
  },
  noticeBanner: {
    backgroundColor: Colors.trustEmeraldBg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.trustEmeraldBorder,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  noticeBannerText: {
    color: Colors.trustEmerald,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  listWrapper: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  listHeader: {
    marginBottom: 10,
  },
  campusBanner: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  campusBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  schoolCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schoolEmoji: {
    fontSize: 16,
  },
  campusBannerTitle: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  campusBannerSub: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  activeNowTag: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
  },
  activeNowText: {
    color: Colors.electricLime,
    fontSize: 10,
    fontWeight: '700',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  offlineTogglePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  offlineToggleText: {
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 18,
  },
  resetFilterBtn: {
    minHeight: 44,
    paddingHorizontal: 20,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resetFilterText: {
    color: Colors.onElectricLime,
    fontSize: 13,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surfaceLow,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderElevated,
  },
  sheetHandle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.surfaceBright,
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: Colors.primaryWhite,
    fontSize: 14,
  },
  filterGroupLabel: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 10,
    marginBottom: 8,
  },
  filterPillsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChoice: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  filterChoiceActive: {
    backgroundColor: Colors.primaryWhite,
  },
  filterChoiceText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChoiceTextActive: {
    color: Colors.onPrimaryDark,
    fontWeight: '700',
  },
  applySheetBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  applySheetBtnText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
  gateDesc: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
  },
  cancelSheetBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelSheetText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
});
