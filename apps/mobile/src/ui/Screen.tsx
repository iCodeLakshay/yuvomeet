import { memo, type ReactNode } from 'react';
import { KeyboardAvoidingView, RefreshControl, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gutter, space } from './theme';

export interface ScreenProps {
  children: ReactNode;
  header?: ReactNode;
  /** Sticky bottom area (primary CTA). Sits above the keyboard and the gesture bar. */
  footer?: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  /** Extra bottom space for screens under the floating tab dock. */
  dockInset?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  background?: ReactNode;
  /** Content runs under the status bar (hero images); the screen handles the top inset. */
  fullBleed?: boolean;
  /** Pull to refresh (scroll screens only). */
  onRefresh?: () => void;
  refreshing?: boolean;
}

export const DOCK_HEIGHT = 96;

/** Safe-area aware page shell shared by every route. */
export const Screen = memo(function Screen({
  children,
  header,
  footer,
  scroll = true,
  padded = true,
  dockInset = false,
  contentStyle,
  background,
  fullBleed = false,
  onRefresh,
  refreshing = false,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = (footer ? space.lg : insets.bottom + space.xxl) + (dockInset ? DOCK_HEIGHT : 0);
  const content = [padded ? styles.padded : null, { paddingBottom: bottomPad }, contentStyle];

  return (
    <View style={[styles.root, { paddingTop: fullBleed ? 0 : insets.top }]}>
      {background}
      {header}
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        {scroll ? (
          <ScrollView
            style={styles.flex}
            contentContainerStyle={content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            refreshControl={
              onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} colors={[colors.onPrimary]} /> : undefined
            }
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, content]}>{children}</View>
        )}
        {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  padded: { paddingHorizontal: gutter },
  footer: {
    paddingHorizontal: gutter,
    paddingTop: space.md,
    gap: space.sm,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
