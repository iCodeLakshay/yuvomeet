/**
 * Route: `(profile)/interests`
 * Replicates Stitch "Yuvomeet - Onboarding: Interests" (`f4e5b952c1864cbba48ccaf6861e366e`).
 * Closes ON-3: Select 2 to 8 interests, completes profile activation, and fires `profile_completed`.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { INTERESTS } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, Radii, Spacing } from '../../src/theme/tokens';

export default function InterestsPickerScreen() {
  const router = useRouter();
  const { profile, updateProfileDraft, completeOnboardingProfile } = useYuvomeet();
  const [selected, setSelected] = useState<string[]>(profile.interests);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleInterest = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((item) => item !== slug) : [...prev, slug],
    );
  };

  const handleFinish = () => {
    updateProfileDraft({ interests: selected });
    const res = completeOnboardingProfile();
    if (!res.ok) {
      setErrorMsg(res.error ?? 'Complete required fields');
      return;
    }
    router.replace('/(tabs)/feed');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Your Campus Vibes"
        subtitle={`Step 3 of 3 · ${selected.length} Selected`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          What are you up for?
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          Pick at least 2 activities so hosts and co-members can see what you enjoy.
        </Text>

        <View style={styles.chipsWrap}>
          {INTERESTS.map((item) => {
            const isSelected = selected.includes(item.slug);
            return (
              <Pressable
                key={item.slug}
                onPress={() => toggleInterest(item.slug)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                style={[styles.chip, isSelected ? styles.chipActive : null]}
              >
                <Text
                  maxFontSizeMultiplier={1.3}
                  style={[styles.chipText, isSelected ? styles.chipTextActive : null]}
                >
                  {item.labelEn} · {item.labelHi}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {errorMsg ? (
          <Text maxFontSizeMultiplier={1.3} style={styles.errorText}>
            ⚠️ {errorMsg}
          </Text>
        ) : null}

        <Pressable
          onPress={handleFinish}
          accessibilityRole="button"
          style={styles.ctaButton}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.ctaText}>
            Complete Profile & Explore Kota →
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
  headline: {
    color: Colors.primaryWhite,
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chip: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceLow,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
    justifyContent: 'center',
  },
  chipActive: {
    backgroundColor: Colors.electricLime,
    borderColor: Colors.electricLime,
  },
  chipText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: Colors.onElectricLime,
    fontWeight: '800',
  },
  errorText: {
    color: Colors.errorCoral,
    fontSize: 13,
    marginBottom: 14,
  },
  ctaButton: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  ctaText: {
    color: Colors.onPrimaryDark,
    fontSize: 15,
    fontWeight: '800',
  },
});
