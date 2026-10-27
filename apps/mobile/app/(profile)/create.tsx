/**
 * Route: `(profile)/create`
 * Replicates Stitch "Yuvomeet - Onboarding: Let's get to know you" (`84645def5488479097c28113332fee32`).
 * Closes ON-3 & VR-4: First name, gender (set once), bio (max 300 chars, S-20 screened), languages, Kota area picker (`area_name` + `area_cell`).
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { type Gender, KOTA_AREAS, MAX_BIO_CHARS } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function ProfileCreateScreen() {
  const router = useRouter();
  const { profile, colleges, updateProfileDraft } = useYuvomeet();

  const [firstName, setFirstName] = useState(profile.first_name);
  const [gender, setGender] = useState<Gender>(profile.declared_gender);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [areaSlug, setAreaSlug] = useState('talwandi');
  const [collegeId, setCollegeId] = useState<string | null>(profile.college_id);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNext = () => {
    const selectedArea = KOTA_AREAS.find((a) => a.slug === areaSlug) ?? KOTA_AREAS[0]!;
    const res = updateProfileDraft({
      first_name: firstName.trim(),
      declared_gender: gender,
      bio: bio.trim(),
      area_name: selectedArea.nameEn,
      area_cell: selectedArea.areaCell,
      college_id: collegeId,
    });
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Check your profile details');
      return;
    }
    setErrorMsg(null);
    router.push('/(profile)/photos');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Let's get to know you" subtitle="Step 1 of 3 · Profile Details (ON-3)" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          FIRST NAME
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          maxLength={30}
          placeholder="e.g., Riya or Lakshay"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
        />

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          GENDER (VERIFIED AGAINST ID & SELFIE · VR-3)
        </Text>
        <View style={styles.pillRow}>
          {(['woman', 'man', 'other'] as const).map((g) => (
            <Pressable
              key={g}
              onPress={() => setGender(g)}
              accessibilityRole="button"
              style={[styles.choicePill, gender === g ? styles.choicePillActive : null]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[styles.choiceText, gender === g ? styles.choiceTextActive : null]}
              >
                {g === 'woman' ? 'Woman' : g === 'man' ? 'Man' : 'Non-binary / Other'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          YOUR AREA IN KOTA (STORED AS ~1 KM COARSE CELL · S-18)
        </Text>
        <View style={styles.pillRow}>
          {KOTA_AREAS.map((area) => {
            const active = areaSlug === area.slug;
            return (
              <Pressable
                key={area.slug}
                onPress={() => setAreaSlug(area.slug)}
                accessibilityRole="button"
                style={[styles.choicePill, active ? styles.choicePillActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.choiceText, active ? styles.choiceTextActive : null]}
                >
                  {area.nameEn}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          COLLEGE / COACHING CIRCLE (OPTIONAL · FOR SAME-COLLEGE PLANS)
        </Text>
        <View style={styles.pillRow}>
          {colleges.map((col) => {
            const active = collegeId === col.id;
            return (
              <Pressable
                key={col.id}
                onPress={() => setCollegeId(active ? null : col.id)}
                accessibilityRole="button"
                style={[styles.choicePill, active ? styles.choicePillActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.choiceText, active ? styles.choiceTextActive : null]}
                >
                  {col.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.bioHeader}>
          <Text maxFontSizeMultiplier={1.3} style={styles.label}>
            BIO (NO PHONE NUMBERS OR @HANDLES · VR-4)
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.charCount}>
            {bio.length}/{MAX_BIO_CHARS}
          </Text>
        </View>
        <TextInput
          value={bio}
          onChangeText={setBio}
          maxLength={MAX_BIO_CHARS}
          multiline
          placeholder="Tell people what group plans you enjoy (e.g., riverfront walks, board games, study sprints)..."
          placeholderTextColor={Colors.textMuted}
          style={[styles.input, styles.bioInput]}
        />

        {errorMsg ? (
          <View style={styles.errorBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
              ⚠️ {errorMsg}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleNext}
          accessibilityRole="button"
          style={styles.ctaButton}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
            Next: Upload Profile Photos →
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
    padding: 20,
    paddingBottom: 40,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.primaryWhite,
    fontSize: 15,
  },
  bioInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  bioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  charCount: {
    color: Colors.textMuted,
    fontSize: 11,
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  choicePill: {
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    justifyContent: 'center',
  },
  choicePillActive: {
    backgroundColor: Colors.primaryWhite,
    borderColor: Colors.primaryWhite,
  },
  choiceText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  choiceTextActive: {
    color: Colors.onPrimaryDark,
    fontWeight: '700',
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
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 24,
  },
  ctaText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
});
