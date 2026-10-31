import { memo } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { QUICK_REACTIONS } from './mentions';
import { colors, gutter, Icon, Pressable, radii, space, Text, type IconName } from '../../ui';
import type { Anchor } from './MessageBubble';

export interface MenuItem {
  key: string;
  label: string;
  icon: IconName;
  danger?: boolean;
  hint?: string;
}

export interface MessageMenuProps {
  anchor: Anchor | null;
  /** Own messages sit on the right, so the menu aligns right. */
  alignRight: boolean;
  items: MenuItem[];
  activeEmoji?: string;
  onReact?: (emoji: string) => void;
  onMoreReactions?: () => void;
  onSelect: (key: string) => void;
  onClose: () => void;
}

const MENU_WIDTH = 236;
const BOX_WIDTH = 312;
const ROW = 48;

/** Long-press: reaction row first, then the text menu, anchored to the message. */
export const MessageMenu = memo(function MessageMenu({
  anchor,
  alignRight,
  items,
  activeEmoji,
  onReact,
  onMoreReactions,
  onSelect,
  onClose,
}: MessageMenuProps) {
  const { width, height } = useWindowDimensions();
  if (!anchor) return null;

  const showReactions = Boolean(onReact);
  const boxWidth = showReactions ? BOX_WIDTH : MENU_WIDTH;
  const menuHeight = items.length * ROW + space.sm * 2;
  const stackHeight = menuHeight + (showReactions ? 56 + space.sm : 0);
  const below = anchor.y + anchor.height + space.sm;
  const top = below + stackHeight < height - space.xxxl ? below : Math.max(space.xxxl, anchor.y - stackHeight - space.sm);
  const left = alignRight
    ? Math.max(gutter, Math.min(anchor.x + anchor.width - boxWidth, width - boxWidth - gutter))
    : Math.min(Math.max(gutter, anchor.x), width - boxWidth - gutter);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(120)} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} pressScale={1} onPress={onClose} accessibilityLabel="Close menu" />
        <View pointerEvents="none" style={[styles.focus, { top: anchor.y - 4, left: anchor.x - 4, width: anchor.width + 8, height: anchor.height + 8 }]} />
        <Animated.View
          entering={ZoomIn.duration(140)}
          style={[styles.stack, { top, left, width: boxWidth, transformOrigin: alignRight ? 'top right' : 'top left' }]}
        >
          {showReactions ? (
            <View style={styles.reactions} accessibilityRole="toolbar">
              {QUICK_REACTIONS.map((emoji) => (
                <Pressable
                  key={emoji}
                  onPress={() => onReact?.(emoji)}
                  pressScale={0.92}
                  accessibilityLabel={`React ${emoji}`}
                  style={[styles.reaction, activeEmoji === emoji ? styles.reactionOn : null]}
                >
                  <Text style={styles.emoji}>{emoji}</Text>
                </Pressable>
              ))}
              <Pressable onPress={onMoreReactions} pressScale={0.92} accessibilityLabel="More reactions" style={styles.reaction}>
                <Icon name="add" size={22} color="text" />
              </Pressable>
            </View>
          ) : null}
          <View style={[styles.menu, alignRight ? styles.menuRight : null]} accessibilityRole="menu">
            {items.map((item, i) => (
              <Pressable
                key={item.key}
                onPress={() => onSelect(item.key)}
                pressScale={0.98}
                accessibilityRole="menuitem"
                accessibilityLabel={item.label}
                style={[styles.item, i > 0 ? styles.divider : null]}
              >
                <View style={styles.flex}>
                  <Text variant="bodyStrong" color={item.danger ? 'danger' : 'text'}>
                    {item.label}
                  </Text>
                  {item.hint ? (
                    <Text variant="caption" color="textSubtle">
                      {item.hint}
                    </Text>
                  ) : null}
                </View>
                <Icon name={item.icon} size={20} color={item.danger ? 'danger' : 'textMuted'} />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(7, 8, 12, 0.6)' },
  focus: { position: 'absolute', borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.borderStrong },
  stack: { position: 'absolute', gap: space.sm },
  reactions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radii.lg,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  reaction: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  reactionOn: { backgroundColor: colors.accentSoft },
  emoji: { fontSize: 22, lineHeight: 28 },
  menu: {
    width: MENU_WIDTH,
    paddingVertical: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    elevation: 12,
  },
  menuRight: { alignSelf: 'flex-end' },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: ROW, paddingHorizontal: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  flex: { flex: 1 },
});
