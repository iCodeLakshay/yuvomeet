import { Tabs } from 'expo-router';
import { DockScene, TabDock } from '../../../src/features/navigation/TabDock';
import { colors } from '../../../src/ui';

/**
 * The Stitch design uses a floating pill dock, which native tabs cannot draw, so the tab bar
 * is custom. Screens stay native, mount lazily and freeze when hidden. Each screen is a blur
 * target so the dock can frost whatever is scrolling behind it.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabDock {...props} />}
      screenLayout={({ route, children }) => <DockScene name={route.name}>{children}</DockScene>}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plans" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
