/**
 * Route: `plan/[id]/check-in`
 * Closes PL-6, S-36, S-37:
 * - Member can check in only within 150m of the venue pin and ±30 minutes of start time
 * - Accuracy must be <= 100m, mocked location rejected
 * - GPS coordinate is verified and immediately discarded (never stored in DB or logs)
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { useYuvomeet } from '../../../src/lib/store';
import { Colors, Radii, Spacing } from '../../../src/theme/tokens';

export default function PlanCheckInScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { plans, performVenueCheckIn } = useYuvomeet();
  const plan = plans.find((p) => p.id === (id ?? 'plan-chai-games')) ?? plans[0]!;

  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Venue Check-In"
        subtitle={`PL-6 · 150m & ±30m Window`}
        showSosButton
        planIdForSos={plan.id}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.pinEmoji}>📍</Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.venueName}>
            {plan.venue_name}
          </Text>
          <Text maxFontSizeMultiplier={1.3} style={styles.venueAddr}>
            {plan.venue_address}
          </Text>

          <View style={styles.rulesBox}>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleItem}>
              • Distance check: ≤ 150 meters from venue pin (Rule PL-6)
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleItem}>
              • Time window: ±30 minutes of plan start time
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.ruleItem}>
              • Privacy (Rule S-36): One GPS fix is checked and immediately discarded. No coordinates are ever saved.
            </Text>
          </View>

          {result ? (
            <View
              style={[
                styles.resultBox,
                result.ok ? styles.resultBoxSuccess : styles.resultBoxError,
              ]}
            >
              <Text
                maxFontSizeMultiplier={1.3}
                style={[
                  styles.resultText,
                  result.ok ? styles.resultTextSuccess : styles.resultTextError,
                ]}
              >
                {result.ok ? '✓ ' : '⚠️ '}
                {result.message}
              </Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => setResult(performVenueCheckIn(plan.id))}
            style={styles.primaryBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.primaryBtnText}>
              📍 Check In Now (At Venue · ~55m)
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setResult(
                performVenueCheckIn(plan.id, {
                  lat: plan.venue_lat + 0.0025, // ~280m away
                  lng: plan.venue_lng + 0.0025,
                  accuracy: 20,
                  mocked: false,
                }),
              )
            }
            style={styles.secondaryBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.secondaryBtnText}>
              Test >150m Rejection (280m away)
            </Text>
          </Pressable>

          <Pressable
            onPress={() =>
              setResult(
                performVenueCheckIn(plan.id, {
                  lat: plan.venue_lat,
                  lng: plan.venue_lng,
                  accuracy: 15,
                  mocked: true,
                }),
              )
            }
            style={styles.secondaryBtn}
          >
            <Text maxFontSizeMultiplier={1.3} style={styles.secondaryBtnText}>
              Test Mock GPS Rejection (Rule S-37)
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
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
  },
  pinEmoji: {
    fontSize: 40,
    marginBottom: 10,
  },
  venueName: {
    color: Colors.primaryWhite,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  venueAddr: {
    color: Colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  rulesBox: {
    width: '100%',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    marginBottom: 16,
  },
  ruleItem: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 19,
  },
  resultBox: {
    width: '100%',
    borderRadius: Radii.DEFAULT,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  resultBoxSuccess: {
    backgroundColor: Colors.trustEmeraldBg,
    borderColor: Colors.trustEmeraldBorder,
  },
  resultBoxError: {
    backgroundColor: 'rgba(147, 0, 10, 0.35)',
    borderColor: Colors.errorCoral,
  },
  resultText: {
    fontSize: 13,
    fontWeight: '700',
  },
  resultTextSuccess: {
    color: Colors.trustEmerald,
  },
  resultTextError: {
    color: Colors.errorCoral,
  },
  primaryBtn: {
    width: '100%',
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  primaryBtnText: {
    color: Colors.onElectricLime,
    fontSize: 15,
    fontWeight: '800',
  },
  secondaryBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  secondaryBtnText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
});
