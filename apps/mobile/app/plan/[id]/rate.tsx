/**
 * Route: `plan/[id]/rate`
 * Closes SF-4 & S-19:
 * - Post-plan private rating ("Felt safe?" and "Showed up?") per co-member
 * - Private: insert-only for raters, never shown to rated users
 * - Two "unsafe" ratings from different members within 30 days trigger a severe human review item
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useYuvomeet } from '../../../src/lib/store';
import { Colors, Radii, Spacing } from '../../../src/theme/tokens';

const CO_MEMBERS = [
  { id: 'host-lakshay', name: 'Lakshay (Host)' },
  { id: 'host-ananya', name: 'Ananya' },
  { id: 'host-kabir', name: 'Kabir' },
];

export default function PostPlanRatingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { submitPostPlanRating } = useYuvomeet();

  const [state, setState] = useState<
    Record<string, { feltSafe: boolean; showedUp: boolean }>
  >({
    'host-lakshay': { feltSafe: true, showedUp: true },
    'host-ananya': { feltSafe: true, showedUp: true },
    'host-kabir': { feltSafe: true, showedUp: true },
  });

  const toggleField = (memberId: string, field: 'feltSafe' | 'showedUp') => {
    setState((prev) => ({
      ...prev,
      [memberId]: {
        ...prev[memberId]!,
        [field]: !prev[memberId]![field],
      },
    }));
  };

  const handleSubmit = () => {
    const batch = Object.entries(state).map(([rateeId, val]) => ({
      rateeId,
      feltSafe: val.feltSafe,
      showedUp: val.showedUp,
    }));
    submitPostPlanRating(id ?? 'plan-chai-games', batch);
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Private Safety Rating"
        subtitle="SF-4 · 100% Confidential"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text maxFontSizeMultiplier={1.3} style={styles.headline}>
          How was the meetup?
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          Your answers are strictly private (Rule S-19). Two "felt unsafe" ratings about a person trigger a priority 12-hour safety review.
        </Text>

        {CO_MEMBERS.map((m) => {
          const item = state[m.id]!;
          return (
            <View key={m.id} style={styles.card}>
              <Text maxFontSizeMultiplier={1.3} style={styles.memberName}>
                {m.name}
              </Text>
              <View style={styles.togglesRow}>
                <Pressable
                  onPress={() => toggleField(m.id, 'showedUp')}
                  style={[
                    styles.togglePill,
                    item.showedUp ? styles.togglePositive : styles.toggleNegative,
                  ]}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.toggleText}>
                    {item.showedUp ? '✓ Showed Up' : '✕ No-Show'}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => toggleField(m.id, 'feltSafe')}
                  style={[
                    styles.togglePill,
                    item.feltSafe ? styles.togglePositive : styles.toggleNegative,
                  ]}
                >
                  <Text maxFontSizeMultiplier={1.3} style={styles.toggleText}>
                    {item.feltSafe ? '🛡️ Felt Safe' : '⚠️ Felt Unsafe'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}

        <Pressable onPress={handleSubmit} style={styles.submitBtn}>
          <Text maxFontSizeMultiplier={1.3} style={styles.submitBtnText}>
            Submit Private Ratings →
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
  },
  headline: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 18,
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  memberName: {
    color: Colors.primaryWhite,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  togglesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  togglePill: {
    flex: 1,
    minHeight: 42,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  togglePositive: {
    backgroundColor: Colors.trustEmeraldBg,
    borderColor: Colors.trustEmeraldBorder,
  },
  toggleNegative: {
    backgroundColor: 'rgba(147, 0, 10, 0.4)',
    borderColor: Colors.errorCoral,
  },
  toggleText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  submitBtnText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
});
