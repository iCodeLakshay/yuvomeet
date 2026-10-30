import { BlurTargetView, BlurView } from 'expo-blur';
import type { Tabs } from 'expo-router';
import { createRef, memo, type ComponentProps, type ReactNode, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, Icon, Pressable, radii, space, type IconName } from '../../ui';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

const TABS: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'explore', label: 'Discover' },
  plans: { icon: 'calendar-today', label: 'My plans' },
  chats: { icon: 'chat-bubble-outline', label: 'Chats' },
  account: { icon: 'person-outline', label: 'Profile' },
};

/**
 * Android blurs a specific view rather than whatever is behind, so every tab screen is a blur
 * target and the dock points at the one on show. iOS ignores the target and blurs what is behind.
 */
const targets: Record<string, RefObject<View | null>> = {};
const targetFor = (name: string) => (targets[name] ??= createRef<View>());

/** Wraps a tab screen (see `screenLayout` in the tabs layout) so the dock can blur it. */
export function DockScene({ name, children }: { name: string; children: ReactNode }) {
  return (
    <BlurTargetView ref={targetFor(name)} style={styles.scene}>
      {children}
    </BlurTargetView>
  );
}

/** Frosted-glass pill dock. The selected tab sits in a lighter glass bubble. */
export const TabDock = memo(function TabDock({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const target = targetFor(state.routes[state.index]?.name ?? 'index');
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + space.md }]}>
      <View style={styles.pill} accessibilityRole="tablist">
        <BlurView
          pointerEvents="none"
          tint="dark"
          intensity={55}
          blurMethod="dimezisBlurView"
          blurTarget={target}
          style={StyleSheet.absoluteFill}
        />
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.tint]} />
        <View pointerEvents="none" style={styles.rim} />
        <View style={styles.tabs}>
          {state.routes.map((route, index) => {
            const tab = TABS[route.name];
            if (!tab) return null;
            const focused = state.index === index;
            return (
              <Pressable
                key={route.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: focused }}
                accessibilityLabel={tab.label}
                haptic
                pressScale={0.9}
                onPress={() => {
                  const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
                }}
                style={[styles.tab, focused ? styles.active : null]}
              >
                <Icon name={tab.icon} size={28} color="brand" />
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  scene: { flex: 1 },
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    overflow: 'hidden',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.overlay,
  },
  tint: { backgroundColor: colors.glassTint },
  // Thin bright line along the top edge: the light catching the glass.
  rim: { position: 'absolute', top: 0, left: space.xxl, right: space.xxl, height: 1, backgroundColor: colors.glassEdge },
  tabs: { flexDirection: 'row', gap: space.sm, padding: space.sm },
  tab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.glassActive, borderWidth: 1, borderColor: colors.glassEdge },
});
