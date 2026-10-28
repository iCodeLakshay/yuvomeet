import { memo } from 'react';
import { Modal, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
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
  onSelect: (key: string) => void;
  onClose: () => void;
}

const MENU_WIDTH = 236;
const ROW = 48;

/** Long-press dropdown anchored to the message (WhatsApp / Instagram style), not a centred alert. */
export const MessageMenu = memo(function MessageMenu({ anchor, alignRight, items, onSelect, onClose }: MessageMenuProps) {
  const { width, height } = useWindowDimensions();
  if (!anchor) return null;

  const menuHeight = items.length * ROW + space.sm * 2;
  const below = anchor.y + anchor.height + space.sm;
  const top = below + menuHeight < height - space.xxxl ? below : Math.max(space.xxxl, anchor.y - menuHeight - space.sm);
  const left = alignRight
    ? Math.max(gutter, Math.min(anchor.x + anchor.width - MENU_WIDTH, width - MENU_WIDTH - gutter))
    : Math.min(Math.max(gutter, anchor.x), width - MENU_WIDTH - gutter);

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(120)} style={styles.scrim}>
        <Pressable style={StyleSheet.absoluteFill} pressScale={1} onPress={onClose} accessibilityLabel="Close menu" />
        {/* Outline over the pressed message so it reads as "this one". */}
        <View pointerEvents="none" style={[styles.focus, { top: anchor.y - 4, left: anchor.x - 4, width: anchor.width + 8, height: anchor.height + 8 }]} />
        <Animated.View
          entering={ZoomIn.duration(140)}
          style={[styles.menu, { top, left, width: MENU_WIDTH, transformOrigin: alignRight ? 'top right' : 'top left' }]}
          accessibilityRole="menu"
        >
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
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(7, 8, 12, 0.6)' },
  focus: { position: 'absolute', borderRadius: radii.xl, borderWidth: 1.5, borderColor: colors.borderStrong },
  menu: {
    position: 'absolute',
    paddingVertical: space.sm,
    borderRadius: radii.lg,
    backgroundColor: colors.surface3,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    elevation: 12,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: ROW, paddingHorizontal: space.lg },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  flex: { flex: 1 },
});
