/**
 * Route: `settings/appeals`
 * Closes VR-6: List of user's submitted appeals and their 48-hour human review SLA.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, formatPlanDateTime, Radii, Spacing } from '../../src/theme/tokens';

export default function MyAppealsScreen() {
  const router = useRouter();
  const { appeals } = useYuvomeet();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="My Appeals" subtitle="VR-6 · 48-Hour Human Review" />

      <ScrollView contentContainerStyle={styles.content}>
        {appeals.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text maxFontSizeMultiplier={1.3} style={styles.emptyTitle}>
              No Active Appeals
            </Text>
            <Text maxFontSizeMultiplier={1.3} style={styles.emptySub}>
              If a photo, verification check, or account status is ever rejected, you can appeal here and a human reviewer will answer within 48 hours.
            </Text>
            <Pressable
              onPress={() => router.push('/(verify)/appeal')}
              style={styles.newAppealBtn}
            >
              <Text style={styles.newAppealText}>Submit New Appeal →</Text>
            </Pressable>
          </View>
        ) : (
          appeals.map((a) => (
            <View key={a.id} style={styles.card}>
              <View style={styles.topRow}>
                <Text style={styles.subjectTag}>{a.subject.toUpperCase()}</Text>
                <Text style={styles.statusTag}>Status: {a.status.toUpperCase()}</Text>
              </View>
              <Text maxFontSizeMultiplier={1.3} style={styles.msgText}>
                "{a.message}"
              </Text>
              <Text style={styles.dueText}>
                Human reply due by: {formatPlanDateTime(a.due_at)} (48h SLA)
              </Text>
            </View>
          ))
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
  content: {
    padding: 20,
  },
  emptyCard: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  emptyTitle: {
    color: Colors.primaryWhite,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySub: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  newAppealBtn: {
    minHeight: Spacing.touchMin,
    borderRadius: Radii.pill,
    backgroundColor: Colors.electricLime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newAppealText: {
    color: Colors.onElectricLime,
    fontSize: 14,
    fontWeight: '800',
  },
  card: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  subjectTag: {
    color: Colors.electricLime,
    fontSize: 11,
    fontWeight: '800',
  },
  statusTag: {
    color: Colors.warningAmber,
    fontSize: 11,
    fontWeight: '700',
  },
  msgText: {
    color: Colors.primaryWhite,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  dueText: {
    color: Colors.textMuted,
    fontSize: 11,
  },
});
