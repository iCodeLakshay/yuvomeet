/**
 * Stitch Floating Liquid Glass Pill Dock
 * Replicates the 4-icon floating bottom navigation from Stitch Discover Home & My Plans.
 * Touch targets strictly >= 44x44px.
 */

import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Colors, Radii } from '../theme/tokens';

const DOCK_ITEMS = [
  { key: 'feed', route: '/(tabs)/feed', icon: '🧭', label: 'Discover' },
  { key: 'my-plans', route: '/(tabs)/my-plans', icon: '📅', label: 'My Plans' },
  { key: 'chats', route: '/(tabs)/chats', icon: '💬', label: 'Chats', hasDot: true },
  { key: 'account', route: '/(tabs)/account', icon: '👤', label: 'Profile' },
] as const;

function LiquidGlassDockComponent() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View pointerEvents="box-none" style={styles.outerWrap}>
      <View style={styles.dockPill}>
        {DOCK_ITEMS.map((item) => {
          const isActive =
            pathname.includes(item.key) || (item.key === 'feed' && pathname === '/');
          return (
            <Pressable
              key={item.key}
              onPress={() => router.replace(item.route as any)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={item.label}
              style={({ pressed }) => [
                styles.tabButton,
                isActive ? styles.tabButtonActive : null,
                pressed ? styles.tabPressed : null,
              ]}
            >
              <Text style={[styles.iconText, isActive ? styles.iconTextActive : null]}>
                {item.icon}
              </Text>
              {item.hasDot && !isActive ? <View style={styles.unreadDot} /> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const LiquidGlassDock = memo(LiquidGlassDockComponent);

const styles = StyleSheet.create({
  outerWrap: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 50,
  },
  dockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.pill,
    backgroundColor: Colors.glassSurface,
    borderWidth: 1,
    borderColor: Colors.borderElevated,
  },
  tabButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: Colors.primaryWhite,
  },
  tabPressed: {
    transform: [{ scale: 0.92 }],
  },
  iconText: {
    fontSize: 18,
    opacity: 0.7,
  },
  iconTextActive: {
    opacity: 1,
  },
  unreadDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: Colors.electricLime,
  },
});
