import { memo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { formatTime } from '../../lib/format';
import { Avatar, colors, Icon, Pressable, radii, RemoteImage, space, Text } from '../../ui';
import type { Message } from './api';
import { splitMentions } from './mentions';

export interface Sender {
  first_name: string | null;
  photo_path: string | null;
  is_host: boolean | null;
}

export interface Anchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Quote {
  name: string;
  text: string;
}

export interface ReactionChip {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  sender?: Sender;
  /** First message of a run from the same sender: shows the avatar and name. */
  first: boolean;
  names: string[];
  quote?: Quote;
  reactions: ReactionChip[];
  onLongPress: (message: Message, anchor: Anchor) => void;
  onRetry: (message: Message) => void;
  onOpenImage: (path: string) => void;
  onOpenProfile: (userId: string) => void;
  onReply: (message: Message) => void;
  onReact: (message: Message, emoji: string) => void;
  selecting: boolean;
  selected: boolean;
  onToggleSelect: (message: Message) => void;
}

/** Chat photos stay blurred until tapped (CH-2); a second tap opens them full screen. */
function Photo({ path, pending, revealed }: { path: string | null; pending: boolean; revealed: boolean }) {
  if (pending || !path) {
    return (
      <View style={[styles.photo, styles.photoPending]}>
        <ActivityIndicator color={colors.textMuted} />
        <Text variant="caption" color="textSubtle">
          Checking photo…
        </Text>
      </View>
    );
  }
  return (
    <View>
      <RemoteImage path={path} style={styles.photo} blurRadius={revealed ? 0 : 40} />
      {revealed ? null : (
        <View style={styles.reveal}>
          <Icon name="visibility" size={20} color="primary" />
          <Text variant="caption" color="primary">
            Tap to view
          </Text>
        </View>
      )}
    </View>
  );
}

function MessageBody({ body, mine, names }: { body: string; mine: boolean; names: string[] }) {
  const parts = splitMentions(body, names);
  return (
    <Text variant="body" color={mine ? 'onPrimary' : 'text'}>
      {parts.map((part, index) =>
        part.mention ? (
          <Text key={`${index}-${part.text}`} variant="body" color="accent">
            {part.text}
          </Text>
        ) : (
          part.text
        ),
      )}
    </Text>
  );
}

export const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  sender,
  first,
  names,
  quote,
  reactions,
  onLongPress,
  onRetry,
  onOpenImage,
  onOpenProfile,
  onReply,
  onReact,
  selecting,
  selected,
  onToggleSelect,
}: MessageBubbleProps) {
  const isPhoto = Boolean(message.image_path) || message.image_status === 'pending';
  const name = sender?.first_name ?? (message.sender_id ? 'Member' : 'Former member');
  const [revealed, setRevealed] = useState(false);
  const bubbleRef = useRef<View>(null);
  const drag = useSharedValue(0);
  const canReply = !selecting && !message.pending && !message.failed;

  const reply = () => {
    if (canReply) onReply(message);
  };
  const pan = Gesture.Pan()
    .enabled(canReply)
    .activeOffsetX([-18, 18])
    .failOffsetY([-16, 16])
    .onUpdate((e) => {
      drag.set(Math.max(-80, Math.min(80, e.translationX)));
    })
    .onEnd((e) => {
      const fired = Math.abs(e.translationX) > 56;
      drag.set(withTiming(0));
      if (fired) runOnJS(reply)();
    });
  const slide = useAnimatedStyle(() => ({ transform: [{ translateX: drag.get() }] }));

  const onPress = () => {
    if (selecting) return onToggleSelect(message);
    if (message.failed) return onRetry(message);
    if (isPhoto && message.image_path && message.image_status !== 'pending') {
      if (!revealed) setRevealed(true);
      else onOpenImage(message.image_path);
    }
  };

  const longPress = () => {
    if (selecting) return onToggleSelect(message);
    bubbleRef.current?.measureInWindow((x, y, width, height) => onLongPress(message, { x, y, width, height }));
  };

  const openProfile = () => {
    if (!mine && message.sender_id) onOpenProfile(message.sender_id);
  };

  const rowStyle = [styles.row, mine ? styles.rowMine : null, first ? styles.rowFirst : null, selected ? styles.rowSelected : null];
  const content = (
    <>
      {selecting ? (
        <View style={styles.check}>
          <Icon name={selected ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selected ? 'brand' : 'textSubtle'} />
        </View>
      ) : null}
      {!mine ? (
        <View style={styles.avatarSlot}>
          {first ? (
            <Pressable
              onPress={() => message.sender_id && onOpenProfile(message.sender_id)}
              pressScale={0.96}
              accessibilityLabel={`Open ${name}'s profile`}
            >
              <Avatar path={sender?.photo_path} name={name} size={36} />
              {sender?.is_host ? (
                <View style={styles.hostTag}>
                  <Text variant="label" color="onPrimary" style={styles.hostText}>
                    Host
                  </Text>
                </View>
              ) : null}
            </Pressable>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.column, mine ? styles.columnMine : null]}>
        {first ? (
          <View style={styles.meta}>
            {!mine ? (
              <Pressable onPress={openProfile} pressScale={0.98} accessibilityLabel={`Open ${name}'s profile`}>
                <Text variant="smallStrong">{name}</Text>
              </Pressable>
            ) : null}
            <Text variant="caption" color="textSubtle">
              {formatTime(message.created_at)}
            </Text>
            {mine && !message.pending ? <Icon name="done-all" size={14} color="textSubtle" /> : null}
          </View>
        ) : null}
        <GestureDetector gesture={pan}>
          <Animated.View style={slide}>
            <View ref={bubbleRef} collapsable={false}>
              <Pressable
                onLongPress={longPress}
                onPress={onPress}
                delayLongPress={300}
                pressScale={0.98}
                accessibilityLabel={`${mine ? 'You' : name}: ${isPhoto ? 'photo' : message.body}`}
                accessibilityHint={isPhoto && revealed ? 'Tap to open full screen. Long press for options' : 'Long press for options. Swipe to reply'}
                style={[styles.bubble, mine ? styles.mine : styles.theirs, isPhoto ? styles.bubblePhoto : null, message.pending ? styles.pending : null]}
              >
                <View style={styles.bubbleInner}>
                  {quote ? (
                    <View style={[styles.quote, { borderLeftColor: mine ? colors.onPrimary : colors.accent }]}>
                      <Text variant="caption" color={mine ? 'onPrimary' : 'accent'} numberOfLines={1}>
                        {quote.name}
                      </Text>
                      <Text variant="caption" color={mine ? 'onPrimary' : 'textMuted'} numberOfLines={1}>
                        {quote.text}
                      </Text>
                    </View>
                  ) : null}
                  {isPhoto ? (
                    <Photo path={message.image_path} pending={message.image_status === 'pending'} revealed={revealed} />
                  ) : (
                    <MessageBody body={message.body ?? ''} mine={mine} names={names} />
                  )}
                </View>
              </Pressable>
            </View>
          </Animated.View>
        </GestureDetector>
        {reactions.length > 0 ? (
          <View style={styles.reactions}>
            {reactions.map((chip) => (
              <Pressable
                key={chip.emoji}
                onPress={() => onReact(message, chip.emoji)}
                pressScale={0.96}
                accessibilityLabel={`${chip.emoji}, ${chip.count}${chip.mine ? ', yours' : ''}`}
                style={[styles.chip, chip.mine ? styles.chipMine : null]}
              >
                <Text style={styles.chipEmoji}>{chip.emoji}</Text>
                {chip.count > 1 ? (
                  <Text variant="caption" color={chip.mine ? 'onPrimary' : 'textMuted'}>
                    {chip.count}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}
        {message.failed ? (
          <Text variant="caption" color="danger">
            Not sent: {message.failed} Tap to retry, long press for options.
          </Text>
        ) : null}
      </View>
    </>
  );

  return selecting ? (
    <Pressable onPress={() => onToggleSelect(message)} pressScale={1} accessibilityState={{ selected }} accessibilityLabel={selected ? 'Selected message' : 'Message'} style={rowStyle}>
      {content}
    </Pressable>
  ) : (
    <View style={rowStyle}>{content}</View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm, marginTop: space.xs, borderRadius: radii.md },
  rowMine: { justifyContent: 'flex-end' },
  rowFirst: { marginTop: space.lg },
  rowSelected: { backgroundColor: colors.accentSoft },
  check: { justifyContent: 'center', marginRight: 'auto' },
  avatarSlot: { width: 36 },
  hostTag: { position: 'absolute', top: 28, left: 2, paddingHorizontal: 3, borderRadius: 4, backgroundColor: colors.primary },
  hostText: { fontSize: 8, lineHeight: 11 },
  column: { maxWidth: '78%', gap: space.xs, alignItems: 'flex-start' },
  columnMine: { alignItems: 'flex-end' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubble: { paddingHorizontal: space.lg, paddingVertical: space.md, borderRadius: radii.xl },
  bubbleInner: { gap: space.xs },
  quote: { borderLeftWidth: 2, paddingLeft: space.sm, gap: 2 },
  theirs: { backgroundColor: colors.surface2, borderTopLeftRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  mine: { backgroundColor: colors.primary, borderTopRightRadius: radii.sm },
  bubblePhoto: { padding: space.xs },
  pending: { opacity: 0.6 },
  photo: { width: 220, height: 220, borderRadius: radii.lg },
  photoPending: { alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.surface3 },
  reveal: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.xs },
  reactions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipMine: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipEmoji: { fontSize: 14, lineHeight: 20 },
});
