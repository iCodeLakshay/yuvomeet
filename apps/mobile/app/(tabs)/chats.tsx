/**
 * Route: `(tabs)/chats`
 * Closes CH-1: Group chat per plan, opened on approval and closed 24 hours after the plan ends.
 */

import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, formatTimeOnly, Radii } from '../../src/theme/tokens';

export default function ChatsListScreen() {
  const router = useRouter();
  const { plans, memberships, messagesByPlan } = useYuvomeet();

  const activePlanChats = plans.filter(
    (p) =>
      memberships[p.id]?.status === 'approved' ||
      memberships[p.id]?.status === 'attended',
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text maxFontSizeMultiplier={1.3} style={styles.title}>
          Group Chats
        </Text>
        <Text maxFontSizeMultiplier={1.3} style={styles.subtitle}>
          CH-1 to CH-4 · Open on approval · Auto-closes 24h after plan
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.safetyBanner}>
          <Text maxFontSizeMultiplier={1.3} style={styles.safetyBannerText}>
            🛡️ Group First: Chats exist only for approved group plans. Phone numbers and external handles (@insta, WhatsApp) are masked automatically (Rule CH-3 / S-20).
          </Text>
        </View>

        {activePlanChats.map((pl) => {
          const thread = messagesByPlan[pl.id] ?? [];
          const lastMsg = thread[thread.length - 1];
          return (
            <Pressable
              key={pl.id}
              onPress={() => router.push(`/chat/${pl.id}`)}
              accessibilityRole="button"
              style={styles.chatRow}
            >
              <Image
                source={{ uri: pl.cover_image_url }}
                cachePolicy="memory-disk"
                style={styles.avatar}
              />
              <View style={styles.chatCenter}>
                <View style={styles.topLine}>
                  <Text
                    maxFontSizeMultiplier={1.3}
                    numberOfLines={1}
                    style={styles.planTitle}
                  >
                    {pl.title}
                  </Text>
                  <Text style={styles.timeText}>
                    {lastMsg ? formatTimeOnly(lastMsg.created_at) : 'Now'}
                  </Text>
                </View>
                <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.venueSub}>
                  📍 {pl.venue_name} • {pl.approved_count} members
                </Text>
                <Text
                  maxFontSizeMultiplier={1.3}
                  numberOfLines={1}
                  style={styles.lastMsgText}
                >
                  {lastMsg
                    ? `${lastMsg.sender_name ?? 'Member'}: ${lastMsg.body ?? '📷 Photo (tap to unblur)'}`
                    : 'Tap to say hello to the group!'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  title: {
    color: Colors.primaryWhite,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  content: {
    padding: 16,
    paddingBottom: 110,
  },
  safetyBanner: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 14,
  },
  safetyBannerText: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  chatRow: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.card,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    alignItems: 'center',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
  },
  chatCenter: {
    flex: 1,
  },
  topLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitle: {
    color: Colors.primaryWhite,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  timeText: {
    color: Colors.electricLime,
    fontSize: 11,
    fontWeight: '700',
  },
  venueSub: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  lastMsgText: {
    color: Colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
  },
});
