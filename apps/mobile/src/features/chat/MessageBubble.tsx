import { memo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { formatTime } from '../../lib/format';
import { Avatar, colors, Icon, Pressable, radii, RemoteImage, space, Text } from '../../ui';
import type { Message } from './api';

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

export interface MessageBubbleProps {
  message: Message;
  mine: boolean;
  sender?: Sender;
  /** First message of a run from the same sender: shows the avatar and name. */
  first: boolean;
  onLongPress: (message: Message, anchor: Anchor) => void;
  onRetry: (message: Message) => void;
  onOpenImage: (path: string) => void;
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

export const MessageBubble = memo(function MessageBubble({
  message,
  mine,
  sender,
  first,
  onLongPress,
  onRetry,
  onOpenImage,
  selecting,
  selected,
  onToggleSelect,
}: MessageBubbleProps) {
  const isPhoto = Boolean(message.image_path) || message.image_status === 'pending';
  const name = sender?.first_name ?? (message.sender_id ? 'Member' : 'Former member');
  const [revealed, setRevealed] = useState(false);
  const bubbleRef = useRef<View>(null);

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
            <>
              <Avatar path={sender?.photo_path} name={name} size={36} />
              {sender?.is_host ? (
                <View style={styles.hostTag}>
                  <Text variant="label" color="onPrimary" style={styles.hostText}>
                    Host
                  </Text>
                </View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.column, mine ? styles.columnMine : null]}>
        {first ? (
          <View style={styles.meta}>
            {!mine ? <Text variant="smallStrong">{name}</Text> : null}
            <Text variant="caption" color="textSubtle">
              {formatTime(message.created_at)}
            </Text>
            {mine && !message.pending ? <Icon name="done-all" size={14} color="textSubtle" /> : null}
          </View>
        ) : null}
        <View ref={bubbleRef} collapsable={false}>
          <Pressable
            onLongPress={longPress}
            onPress={onPress}
            delayLongPress={300}
            pressScale={0.98}
            accessibilityLabel={`${mine ? 'You' : name}: ${isPhoto ? 'photo' : message.body}`}
            accessibilityHint={isPhoto && revealed ? 'Tap to open full screen. Long press for options' : 'Long press for options'}
            style={[styles.bubble, mine ? styles.mine : styles.theirs, isPhoto ? styles.bubblePhoto : null, message.pending ? styles.pending : null]}
          >
            {isPhoto ? (
              <Photo path={message.image_path} pending={message.image_status === 'pending'} revealed={revealed} />
            ) : (
              <Text variant="body" color={mine ? 'onPrimary' : 'text'}>
                {message.body}
              </Text>
            )}
          </Pressable>
        </View>
        {message.failed ? (
          <Text variant="caption" color="danger">
            Not sent: {message.failed} Tap to retry, long press for options.
          </Text>
        ) : null}
      </View>
    </>
  );

  // In select mode the whole row toggles; otherwise only the bubble is interactive.
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
  theirs: { backgroundColor: colors.surface2, borderTopLeftRadius: radii.sm, borderWidth: 1, borderColor: colors.border },
  mine: { backgroundColor: colors.primary, borderTopRightRadius: radii.sm },
  bubblePhoto: { padding: space.xs },
  pending: { opacity: 0.6 },
  photo: { width: 220, height: 220, borderRadius: radii.lg },
  photoPending: { alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.surface3 },
  reveal: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.xs },
});
