/**
 * Route: `settings/blocked`
 * Closes CH-4 & S-17: Manage blocked users. Unblocking restores visibility.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { SEED_PUBLIC_PROFILES, useYuvomeet } from '../../src/lib/store';
import { Colors, Radii } from '../../src/theme/tokens';

export default function BlockedUsersScreen() {
  const { blockedUserIds, unblockMember } = useYuvomeet();

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title="Blocked Users"
        subtitle={`CH-4 & S-17 · ${blockedUserIds.length} Blocked`}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {blockedUserIds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text maxFontSizeMultiplier={1.3} style={styles.emptyText}>
              You haven't blocked anyone. When you block someone, they immediately disappear from your feed, plans, and chats (Rule S-17).
            </Text>
          </View>
        ) : (
          blockedUserIds.map((uid) => {
            const name = SEED_PUBLIC_PROFILES[uid]?.first_name ?? uid;
            return (
              <View key={uid} style={styles.row}>
                <Text maxFontSizeMultiplier={1.3} style={styles.name}>
                  {name}
                </Text>
                <Pressable
                  onPress={() => unblockMember(uid)}
                  style={styles.unblockBtn}
                >
                  <Text style={styles.unblockText}>Unblock</Text>
                </Pressable>
              </View>
            );
          })
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
    borderRadius: Radii.DEFAULT,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  row: {
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
  name: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
  },
  unblockBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceHigh,
  },
  unblockText: {
    color: Colors.electricLime,
    fontSize: 12,
    fontWeight: '700',
  },
});
