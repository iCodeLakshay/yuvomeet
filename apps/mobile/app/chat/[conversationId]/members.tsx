/**
 * Route: `chat/[conversationId]/members`
 * Closes CH-1 & CH-4: View plan members, their verified badge, check-in status, and report/block option.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScreenHeader } from '../../../src/components/ScreenHeader';
import { Colors, Radii } from '../../../src/theme/tokens';

const PLAN_MEMBERS = [
  { id: 'host-lakshay', name: 'Lakshay Saxena', role: 'Host', checkedIn: true },
  { id: 'host-ananya', name: 'Ananya Sharma', role: 'Member', checkedIn: true },
  { id: 'host-kabir', name: 'Kabir Verma', role: 'Member', checkedIn: false },
  { id: 'user-kota-me', name: 'You (Riya)', role: 'Member', checkedIn: true },
];

export default function ChatMembersScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Plan Members"
        subtitle={`CH-1 · ${PLAN_MEMBERS.length} Approved Members`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {PLAN_MEMBERS.map((m) => (
          <View key={m.id} style={styles.memberCard}>
            <Pressable
              onPress={() => router.push(`/user/${m.id}`)}
              style={styles.leftRow}
            >
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{m.name.slice(0, 2).toUpperCase()}</Text>
              </View>
              <View>
                <Text maxFontSizeMultiplier={1.3} style={styles.memberName}>
                  {m.name} ✓
                </Text>
                <Text maxFontSizeMultiplier={1.3} style={styles.memberMeta}>
                  {m.role} • {m.checkedIn ? '📍 Checked in at venue' : 'Approved'}
                </Text>
              </View>
            </Pressable>

            {m.id !== 'user-kota-me' ? (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/report',
                    params: {
                      targetUserId: m.id,
                      targetName: m.name,
                      planId: conversationId,
                      context: 'plan',
                    },
                  })
                }
                style={styles.reportPill}
              >
                <Text style={styles.reportPillText}>Report / Block</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
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
    padding: 16,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: Colors.primaryWhite,
    fontSize: 13,
    fontWeight: '800',
  },
  memberName: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  memberMeta: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  reportPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(147, 0, 10, 0.35)',
  },
  reportPillText: {
    color: Colors.errorCoral,
    fontSize: 11,
    fontWeight: '700',
  },
});
