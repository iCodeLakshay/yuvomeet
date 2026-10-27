import type { Tabs } from 'expo-router';
import { memo, type ComponentProps } from 'react';
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

/** Floating pill dock from Stitch. The active tab gets a white circle. */
export const TabDock = memo(function TabDock({ state, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + space.md }]}>
      <View style={styles.pill} accessibilityRole="tablist">
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
              <Icon name={tab.icon} size={22} color={focused ? 'onPrimary' : 'textMuted'} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(26, 27, 33, 0.96)',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  tab: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  active: { backgroundColor: colors.primary },
});
