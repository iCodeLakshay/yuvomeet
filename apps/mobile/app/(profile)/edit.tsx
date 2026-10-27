/**
 * Route: `(profile)/edit`
 * Closes ON-3, VR-3, S-42: Edit own profile. Gender is locked after creation (changeable only via support).
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { KOTA_AREAS, MAX_BIO_CHARS } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function EditProfileScreen() {
  const router = useRouter();
  const { profile, updateProfileDraft } = useYuvomeet();
  const [firstName, setFirstName] = useState(profile.first_name);
  const [bio, setBio] = useState(profile.bio ?? '');
  const [areaName, setAreaName] = useState(profile.area_name);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleSave = () => {
    const matchedArea =
      KOTA_AREAS.find((a) => a.nameEn === areaName) ?? KOTA_AREAS[0]!;
    const res = updateProfileDraft({
      first_name: firstName.trim(),
      bio: bio.trim(),
      area_name: matchedArea.nameEn,
      area_cell: matchedArea.areaCell,
    });

    if (!res.ok) {
      setFeedback(res.error ?? 'Could not save profile');
      return;
    }
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Edit Profile" subtitle="ON-3 · S-20 Text Screening" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          FIRST NAME
        </Text>
        <TextInput
          value={firstName}
          onChangeText={setFirstName}
          maxLength={30}
          style={styles.input}
        />

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          BIO (MAX {MAX_BIO_CHARS} CHARS · SCREENED BY S-20)
        </Text>
        <TextInput
          value={bio}
          onChangeText={setBio}
          maxLength={MAX_BIO_CHARS}
          multiline
          style={[styles.input, styles.bioInput]}
        />

        <Text maxFontSizeMultiplier={1.3} style={styles.label}>
          AREA IN KOTA
        </Text>
        <View style={styles.pillRow}>
          {KOTA_AREAS.map((area) => (
            <Pressable
              key={area.slug}
              onPress={() => setAreaName(area.nameEn)}
              style={[
                styles.areaPill,
                areaName === area.nameEn ? styles.areaPillActive : null,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.areaPillText,
                  areaName === area.nameEn ? styles.areaPillTextActive : null,
                ]}
              >
                {area.nameEn}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.lockedCard}>
          <Text maxFontSizeMultiplier={1.3} style={styles.lockedTitle}>
            🔒 Verified Gender: {profile.verified_gender ?? profile.declared_gender}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.lockedSub}>
            Rule VR-3 & S-42: Gender is confirmed against your selfie & ID and can only be changed via a support request.
          </Text>
        </View>

        {feedback ? (
          <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
            ⚠️ {feedback}
          </Text>
        ) : null}

        <Pressable
          onPress={() => router.push('/(profile)/photos')}
          style={styles.secondaryBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.secondaryBtnText}>
            Manage Profile Photos (2–6)
          </Text>
        </Pressable>

        <Pressable onPress={handleSave} style={styles.saveBtn}>
          <Text maxFontSizeMultiplier={1.3} style={styles.saveBtnText}>
            Save Changes
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
    marginTop: 14,
    marginBottom: 8,
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
    minHeight: 90,
    textAlignVertical: 'top',
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  areaPill: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  areaPillActive: {
    backgroundColor: Colors.primaryWhite,
  },
  areaPillText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  areaPillTextActive: {
    color: Colors.onPrimaryDark,
    fontWeight: '700',
  },
  lockedCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    marginTop: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  lockedTitle: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  lockedSub: {
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
  },
  errorText: {
    color: Colors.errorCoral,
    fontSize: 13,
    marginTop: 12,
  },
  secondaryBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  secondaryBtnText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    fontWeight: '700',
  },
  saveBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveBtnText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
});
