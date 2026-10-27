/**
 * Route: `plan/create` + `plan/create/venue` sheet
 * Replicates Stitch "Yuvomeet - Create a Plan" (`4096f548f50a44f9bfae024d0b75cb0d`).
 * Closes PL-1, SF-1, SF-6, S-26, S-31 to S-34:
 * - Approved public venue only (residential/private addresses blocked)
 * - Capacity 3–10 stepper
 * - Starts at least 3 hours ahead
 * - Ends by 21:00 IST unless at a partner venue with `late_events_allowed`
 * - Women-only audience selectable only by verified women (S-34)
 */

import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ACTIVITIES, type PlanAudience } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function CreatePlanScreen() {
  const router = useRouter();
  const { profile, venues, createNewPlan } = useYuvomeet();

  const [activity, setActivity] = useState('chai-cafe');
  const [title, setTitle] = useState('Evening Chai & Casual Discussion');
  const [description, setDescription] = useState(
    'Unwind after classes with Kulhad chai and board games. Everyone welcome!',
  );
  const [venueId, setVenueId] = useState(venues[0]?.id ?? '');
  const [capacity, setCapacity] = useState(6);
  const [audience, setAudience] = useState<PlanAudience>('everyone');
  const [leadHours, setLeadHours] = useState(4); // Default 4h ahead (>= 3h rule S-31)
  const [venueSheetOpen, setVenueSheetOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedVenue = venues.find((v) => v.id === venueId) ?? venues[0];

  const handlePublish = () => {
    const startMs = Date.now() + leadHours * 3600 * 1000;
    const endMs = startMs + 90 * 60 * 1000; // 1.5h duration

    const res = createNewPlan({
      title,
      description,
      activity,
      venueId,
      startsAt: new Date(startMs).toISOString(),
      endsAt: new Date(endMs).toISOString(),
      capacity,
      audience,
      collegeId: audience === 'same_college' ? profile.college_id : null,
    });

    if (!res.ok) {
      setErrorMsg(res.error ?? 'Check plan rules');
      return;
    }

    setErrorMsg(null);
    router.replace(`/plan/${res.planId}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Create a Plan"
        subtitle="PL-1 & SF-6 · Public Venues Only"
      />

      <ScrollView contentContainerStyle={styles.content}>
        {/* 1. Category Selector */}
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          SELECT CATEGORY
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {ACTIVITIES.map((act) => {
            const active = activity === act.slug;
            return (
              <Pressable
                key={act.slug}
                onPress={() => setActivity(act.slug)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.chipText, active ? styles.chipTextActive : null]}
                >
                  {act.labelEn}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* 2. Plan Title */}
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          PLAN TITLE (3–60 CHARS · S-20 SCREENED)
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          maxLength={60}
          placeholder="e.g., Evening chai & casual discussion"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
        />

        {/* 3. Lead Time & 21:00 Cutoff Bento Cards */}
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          START TIME (MIN 3 HOURS AHEAD · RULE S-31)
        </Text>
        <View style={styles.bentoGrid}>
          {[
            { hours: 4, label: 'In 4 Hours (Valid ✓)' },
            { hours: 2, label: 'In 2 Hours (Test <3h Block)' },
          ].map((opt) => (
            <Pressable
              key={opt.hours}
              onPress={() => setLeadHours(opt.hours)}
              style={[
                styles.timeCard,
                leadHours === opt.hours ? styles.timeCardActive : null,
              ]}
            >
              <Text maxFontSizeMultiplier={1.3} style={styles.timeCardTitle}>
                {opt.label}
              </Text>
              <Text maxFontSizeMultiplier={1.3} style={styles.timeCardSub}>
                Duration: 90 mins
              </Text>
            </Pressable>
          ))}
        </View>

        {/* 4. Approved Public Meeting Point & Safety Warning */}
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          PUBLIC MEETING POINT (APPROVED KOTA VENUES ONLY · SF-1)
        </Text>
        <Pressable
          onPress={() => setVenueSheetOpen(true)}
          accessibilityRole="button"
          style={styles.venuePickerBtn}
        >
          <View>
            <Text maxFontSizeMultiplier={1.3} style={styles.venueName}>
              📍 {selectedVenue?.name}
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.venueSub}>
              {selectedVenue?.address_line} ·{' '}
              {selectedVenue?.late_events_allowed
                ? 'Partner Late-Evening Allowed'
                : 'Ends by 9:00 PM IST'}
            </Text>
          </View>
          <Text style={styles.changeText}>Change ▾</Text>
        </Pressable>

        <View style={styles.safetyWarningBox}>
          <Text maxFontSizeMultiplier={1.3} style={styles.safetyWarningText}>
            🛡️ Residential or private addresses are not permitted (Rule SF-1). Keep meetups safe and accessible in verified public spaces.
          </Text>
        </View>

        {/* 5. Group Capacity Counter (3 to 10) */}
        <View style={styles.counterCard}>
          <View>
            <Text maxFontSizeMultiplier={1.3} style={styles.counterTitle}>
              Group Capacity (3–10)
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.counterSub}>
              Includes you as host · Max 10 for safe meetups
            </Text>
          </View>

          <View style={styles.stepperPill}>
            <Pressable
              onPress={() => setCapacity((c) => Math.max(3, c - 1))}
              accessibilityRole="button"
              accessibilityLabel="Decrease capacity"
              style={styles.stepperBtn}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </Pressable>
            <Text maxFontSizeMultiplier={1.3} style={styles.capacityValue}>
              {capacity}
            </Text>
            <Pressable
              onPress={() => setCapacity((c) => Math.min(10, c + 1))}
              accessibilityRole="button"
              accessibilityLabel="Increase capacity"
              style={styles.stepperBtn}
            >
              <Text style={styles.stepperBtnText}>＋</Text>
            </Pressable>
          </View>
        </View>

        {/* 6. Audience Selector (Everyone / Women Only / Same College) */}
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          WHO CAN SEE & JOIN THIS PLAN (PL-1 & PL-4)
        </Text>
        <View style={styles.chipsRowWrap}>
          {(['everyone', 'women_only', 'same_college'] as const).map((aud) => {
            const active = audience === aud;
            return (
              <Pressable
                key={aud}
                onPress={() => setAudience(aud)}
                style={[styles.chip, active ? styles.chipActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.chipText, active ? styles.chipTextActive : null]}
                >
                  {aud === 'everyone'
                    ? 'Everyone (18+)'
                    : aud === 'women_only'
                    ? '♀ Verified Women Only'
                    : '🎓 Same College / Institute'}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* 7. Optional Description */}
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          PLAN NOTE / VIBE (OPTIONAL)
        </Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          maxLength={500}
          multiline
          style={[styles.input, styles.descInput]}
        />

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
              ⚠️ {errorMsg}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handlePublish}
          accessibilityRole="button"
          style={styles.publishBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.publishBtnText}>
            Preview & Publish Plan →
          </Text>
        </Pressable>
      </ScrollView>

      {/* `plan/create/venue` Approved Venue Picker Sheet */}
      <Modal
        visible={venueSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setVenueSheetOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheetContainer}>
            <Text maxFontSizeMultiplier={1.3} style={styles.sheetTitle}>
              Pick an Approved Public Venue (SF-1)
            </Text>
            {venues.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => {
                  setVenueId(v.id);
                  setVenueSheetOpen(false);
                }}
                style={[
                  styles.venueOption,
                  v.id === venueId ? styles.venueOptionSelected : null,
                ]}
              >
                <Text maxFontSizeMultiplier={1.3} style={styles.venueOptionName}>
                  {v.name} {v.partner ? '· ★ Partner' : ''}
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={styles.venueOptionAddr}>
                  {v.address_line} ({v.area_name})
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setVenueSheetOpen(false)}
              style={styles.closeSheetBtn}
            >
              <Text style={styles.closeSheetText}>Close</Text>
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
    paddingBottom: 44,
  },
  label: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginTop: 14,
    marginBottom: 8,
  },
  chipsRow: {
    gap: 8,
    paddingRight: 12,
  },
  chipsRowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.primaryWhite,
    borderColor: Colors.primaryWhite,
  },
  chipText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.onPrimaryDark,
    fontWeight: '800',
  },
  input: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.primaryWhite,
    fontSize: 14,
  },
  descInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  timeCard: {
    flex: 1,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  timeCardActive: {
    borderColor: Colors.electricLime,
    borderWidth: 1.5,
  },
  timeCardTitle: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  timeCardSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
  venuePickerBtn: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  venueName: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  venueSub: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 3,
  },
  changeText: {
    color: Colors.electricLime,
    fontSize: 12,
    fontWeight: '700',
  },
  safetyWarningBox: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.md,
    padding: 10,
    marginTop: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  safetyWarningText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  counterCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  counterTitle: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  counterSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.surfaceHigh,
    borderRadius: Radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceBright,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: {
    color: Colors.primaryWhite,
    fontSize: 18,
    fontWeight: '700',
  },
  capacityValue: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: 'rgba(147, 0, 10, 0.35)',
    borderRadius: Radii.md,
    padding: 12,
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.errorCoral,
  },
  errorText: {
    color: Colors.errorCoral,
    fontSize: 12,
    fontWeight: '600',
  },
  publishBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  publishBtnText: {
    color: Colors.onPrimaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: Colors.surfaceLow,
    borderTopLeftRadius: Radii.sheet,
    borderTopRightRadius: Radii.sheet,
    padding: 20,
  },
  sheetTitle: {
    color: Colors.primaryWhite,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 12,
  },
  venueOption: {
    padding: 12,
    borderRadius: Radii.DEFAULT,
    backgroundColor: Colors.surfaceContainer,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  venueOptionSelected: {
    borderColor: Colors.electricLime,
  },
  venueOptionName: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  venueOptionAddr: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  closeSheetBtn: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  closeSheetText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
