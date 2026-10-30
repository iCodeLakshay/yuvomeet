import { memo, type ReactNode } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from './IconButton';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, gutter, radii, space } from './theme';
import { ToastHost } from './Toast';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

/** In-screen bottom sheet (pickers) for state that stays on the current route. */
export const Sheet = memo(function Sheet({ visible, onClose, title, subtitle, children, footer }: SheetProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      {visible ? (
        <Animated.View entering={FadeIn.duration(140)} style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} pressScale={1} onPress={onClose} accessibilityLabel="Close" />
          <Animated.View entering={SlideInDown.duration(220)} style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]} accessibilityViewIsModal>
            <View style={styles.grabber} />
            <View style={styles.head}>
              <View style={styles.flex}>
                <Text variant="title3" accessibilityRole="header">
                  {title}
                </Text>
                {subtitle ? (
                  <Text variant="caption" color="textSubtle">
                    {subtitle}
                  </Text>
                ) : null}
              </View>
              <IconButton icon="close" label="Close" size={36} onPress={onClose} />
            </View>
            {children}
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Animated.View>
          <ToastHost inModal />
        </Animated.View>
      ) : null}
    </Modal>
  );
});

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, justifyContent: 'flex-end' },
  panel: {
    paddingHorizontal: gutter,
    paddingTop: space.sm,
    gap: space.lg,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
  },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.surface4 },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1, gap: 2 },
  footer: { gap: space.sm },
});
