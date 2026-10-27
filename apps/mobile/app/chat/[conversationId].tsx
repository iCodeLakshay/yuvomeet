/**
 * Route: `chat/[conversationId]`
 * Replicates Stitch "Yuvomeet - Group Chat" (`14a4ebbc93864825ba1aeeb35395be90`).
 * Closes CH-1, CH-2, CH-3, CH-4, SF-5, S-17, S-20, S-23:
 * - Virtualized `@shopify/flash-list` bound to thread messages
 * - Photos delivered blurred (`blurRadius={22}`) until tapped by user (Rule CH-2 / S-23)
 * - Number & link masking rejects phone numbers, URLs, and `@handles` inline (Rule CH-3 / S-20)
 * - Offline outbox in MMKV with client UUID idempotency
 * - Long-press any message or use top menu to Report, Block, View Members, or trigger SOS
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { FlashList, type ListRenderItemInfo } from '@shopify/flash-list';
import type { MessageRow } from '@yuvomeet/shared';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useYuvomeet } from '../../src/lib/store';
import { Colors, formatTimeOnly, Radii } from '../../src/theme/tokens';

interface MessageBubbleProps {
  message: MessageRow;
  isOwn: boolean;
  isUnblurred: boolean;
  onToggleUnblur: (msgId: string) => void;
  onLongPressReport: (msg: MessageRow) => void;
}

const MessageBubble = memo(function MessageBubbleComponent({
  message,
  isOwn,
  isUnblurred,
  onToggleUnblur,
  onLongPressReport,
}: MessageBubbleProps) {
  const handleUnblur = useCallback(() => {
    onToggleUnblur(message.id);
  }, [message.id, onToggleUnblur]);

  const handleReport = useCallback(() => {
    onLongPressReport(message);
  }, [message, onLongPressReport]);

  return (
    <Pressable
      onLongPress={handleReport}
      delayLongPress={250}
      style={[styles.msgRow, isOwn ? styles.msgRowOwn : styles.msgRowOther]}
    >
      {!isOwn ? (
        <View style={styles.senderAvatarWrap}>
          <Image
            source={{
              uri:
                message.sender_avatar ??
                'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
            }}
            cachePolicy="memory-disk"
            style={styles.senderAvatar}
          />
          {message.is_host ? (
            <View style={styles.hostBadgeMini}>
              <Text style={styles.hostBadgeMiniText}>HOST</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={[styles.msgCol, isOwn ? styles.msgColOwn : null]}>
        <View style={styles.metaLine}>
          {!isOwn ? (
            <Text maxFontSizeMultiplier={1.3} style={styles.senderName}>
              {message.sender_name ?? 'Member'}
            </Text>
          ) : null}
          <Text style={styles.timestampText}>
            {formatTimeOnly(message.created_at)}
            {message.pending_sync ? ' • ⏳ Queued Offline' : isOwn ? ' • ✓✓' : ''}
          </Text>
        </View>

        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
          {/* CH-2 & S-23: Chat photos delivered blurred until tapped */}
          {message.image_path ? (
            <Pressable onPress={handleUnblur} style={styles.imageAttachmentWrap}>
              <Image
                source={{ uri: message.image_path }}
                cachePolicy="memory-disk"
                blurRadius={isUnblurred ? 0 : 24}
                style={styles.chatImage}
              />
              {!isUnblurred ? (
                <View style={styles.blurOverlay}>
                  <Text maxFontSizeMultiplier={1.3} style={styles.blurOverlayText}>
                    🔒 Blurred for safety (CH-2) · Tap to view
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}

          {message.body ? (
            <Text
              maxFontSizeMultiplier={1.3}
              style={[styles.bodyText, isOwn ? styles.bodyTextOwn : null]}
            >
              {message.body}
            </Text>
          ) : null}

          {message.status === 'held' ? (
            <Text style={styles.heldTag}>
              ⏳ Pending moderation review (visible only to you · Rule S-20)
            </Text>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

export default function GroupChatScreen() {
  const router = useRouter();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const planId = conversationId ?? 'plan-chai-games';

  const {
    profile,
    plans,
    messagesByPlan,
    blockedUserIds,
    sendChatMessage,
  } = useYuvomeet();

  const plan = plans.find((p) => p.id === planId) ?? plans[0]!;
  const [inputText, setInputText] = useState('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [unblurredIds, setUnblurredIds] = useState<Record<string, boolean>>({});
  const [readOnlySimulated, setReadOnlySimulated] = useState(false);

  // S-17: Filter out messages from blocked users either way
  const visibleMessages = useMemo(() => {
    const raw = messagesByPlan[planId] ?? [];
    return raw.filter((m) => !blockedUserIds.includes(m.sender_id));
  }, [blockedUserIds, messagesByPlan, planId]);

  const handleToggleUnblur = useCallback((msgId: string) => {
    setUnblurredIds((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  }, []);

  const handleLongPressReport = useCallback(
    (msg: MessageRow) => {
      router.push({
        pathname: '/report',
        params: {
          targetUserId: msg.sender_id,
          targetName: msg.sender_name ?? 'Member',
          planId,
          messageId: msg.id,
          context: 'message',
        },
      });
    },
    [planId, router],
  );

  const handleSend = () => {
    if (readOnlySimulated || !inputText.trim()) return;
    const res = sendChatMessage(planId, inputText);
    if (!res.ok) {
      setErrorBanner(res.error ?? 'Message blocked');
      return;
    }
    setErrorBanner(null);
    setInputText('');
  };

  const handleSendSamplePhoto = () => {
    if (readOnlySimulated) return;
    sendChatMessage(
      planId,
      'Shared a cafe table photo',
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=700&q=80',
    );
  };

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<MessageRow>) => (
      <MessageBubble
        message={item}
        isOwn={item.sender_id === profile.id}
        isUnblurred={Boolean(unblurredIds[item.id])}
        onToggleUnblur={handleToggleUnblur}
        onLongPressReport={handleLongPressReport}
      />
    ),
    [handleLongPressReport, handleToggleUnblur, profile.id, unblurredIds],
  );

  const keyExtractor = useCallback((item: MessageRow) => item.id, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={plan.title}
        subtitle={`${plan.approved_count} members • Closes 24h after plan`}
        showSosButton
        planIdForSos={plan.id}
      />

      {/* Quick Sub-bar: Members, Report Plan, 24h Archive Toggle */}
      <View style={styles.subToolbar}>
        <Pressable
          onPress={() => router.push(`/chat/${planId}/members`)}
          style={styles.toolbarBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.toolbarBtnText}>
            👥 Members ({plan.approved_count})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setReadOnlySimulated((v) => !v)}
          style={styles.toolbarBtn}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.toolbarBtnText}>
            {readOnlySimulated ? '🔒 Closed (+24h State)' : '🟢 Open Chat'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() =>
            router.push({
              pathname: '/report',
              params: {
                targetUserId: plan.host_id,
                targetName: plan.host_first_name,
                planId,
                context: 'message',
              },
            })
          }
          style={styles.toolbarBtnDanger}
        >
          <Text maxFontSizeMultiplier={1.3} style={styles.toolbarBtnDangerText}>
            🚩 Report / Block
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={styles.flexOne}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.flexOne}>
          <FlashList
            data={visibleMessages}
            renderItem={renderMessage}
            keyExtractor={keyExtractor}
            estimatedItemSize={88}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <View style={styles.safetyPill}>
                <Text maxFontSizeMultiplier={1.3} style={styles.safetyPillText}>
                  🛡️ Safety Notice: Meet strictly at public venues. Phone numbers, links, and @handles are blocked in chat (Rule CH-3). Long-press any message to report.
                </Text>
              </View>
            }
          />
        </View>

        {/* Inline Screening Error Banner (Rule S-20 / CH-3) */}
        {errorBanner ? (
          <View style={styles.errorBanner}>
            <Text maxFontSizeMultiplier={1.3} style={styles.errorBannerText}>
              🚫 {errorBanner}
            </Text>
          </View>
        ) : null}

        {/* Floating Dock Input or Read-Only Closed Banner (CH-1) */}
        {readOnlySimulated ? (
          <View style={styles.closedFooter}>
            <Text maxFontSizeMultiplier={1.3} style={styles.closedFooterText}>
              🔒 This group chat closed 24 hours after the plan ended (Rule CH-1). Thread is read-only.
            </Text>
          </View>
        ) : (
          <View style={styles.inputBarWrap}>
            <View style={styles.glassInputRow}>
              <Pressable
                onPress={handleSendSamplePhoto}
                accessibilityRole="button"
                accessibilityLabel="Attach blurred photo"
                style={styles.attachBtn}
              >
                <Text style={styles.attachEmoji}>📷</Text>
              </Pressable>

              <TextInput
                value={inputText}
                onChangeText={setInputText}
                placeholder="Message group... (no phone numbers)"
                placeholderTextColor={Colors.textMuted}
                style={styles.textInput}
              />

              <Pressable
                onPress={handleSend}
                accessibilityRole="button"
                accessibilityLabel="Send message"
                style={styles.sendBtn}
              >
                <Text style={styles.sendArrow}>↑</Text>
              </Pressable>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.canvasLowest,
  },
  flexOne: {
    flex: 1,
  },
  subToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    gap: 8,
  },
  toolbarBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.surfaceContainer,
  },
  toolbarBtnText: {
    color: Colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  toolbarBtnDanger: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(147, 0, 10, 0.35)',
  },
  toolbarBtnDangerText: {
    color: Colors.errorCoral,
    fontSize: 11,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 20,
  },
  safetyPill: {
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.DEFAULT,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginBottom: 16,
  },
  safetyPillText: {
    color: Colors.textSecondary,
    fontSize: 11,
    lineHeight: 16,
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 14,
    maxWidth: '86%',
  },
  msgRowOther: {
    alignSelf: 'flex-start',
  },
  msgRowOwn: {
    alignSelf: 'flex-end',
  },
  senderAvatarWrap: {
    marginRight: 8,
    position: 'relative',
  },
  senderAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  hostBadgeMini: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    backgroundColor: Colors.primaryWhite,
    borderRadius: 4,
    paddingHorizontal: 3,
  },
  hostBadgeMiniText: {
    color: Colors.canvasLowest,
    fontSize: 7,
    fontWeight: '900',
  },
  msgCol: {
    flexShrink: 1,
  },
  msgColOwn: {
    alignItems: 'flex-end',
  },
  metaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  senderName: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  timestampText: {
    color: Colors.textMuted,
    fontSize: 10,
  },
  bubble: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleOther: {
    backgroundColor: Colors.surfaceContainer,
    borderTopLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
  },
  bubbleOwn: {
    backgroundColor: Colors.primaryWhite,
    borderTopRightRadius: 4,
  },
  bodyText: {
    color: Colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  bodyTextOwn: {
    color: Colors.onPrimaryDark,
    fontWeight: '600',
  },
  heldTag: {
    color: Colors.warningAmber,
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  imageAttachmentWrap: {
    width: 210,
    height: 140,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 6,
    position: 'relative',
  },
  chatImage: {
    width: '100%',
    height: '100%',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  blurOverlayText: {
    color: Colors.primaryWhite,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  errorBanner: {
    backgroundColor: 'rgba(147, 0, 10, 0.9)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  errorBannerText: {
    color: Colors.primaryWhite,
    fontSize: 12,
    fontWeight: '700',
  },
  closedFooter: {
    backgroundColor: Colors.surfaceLow,
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
  },
  closedFooterText: {
    color: Colors.textSecondary,
    fontSize: 12,
    textAlign: 'center',
  },
  inputBarWrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: Colors.canvasLowest,
  },
  glassInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceLow,
    borderRadius: Radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  attachBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachEmoji: {
    fontSize: 18,
  },
  textInput: {
    flex: 1,
    color: Colors.primaryWhite,
    fontSize: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendArrow: {
    color: Colors.onPrimaryDark,
    fontSize: 18,
    fontWeight: '900',
  },
});
