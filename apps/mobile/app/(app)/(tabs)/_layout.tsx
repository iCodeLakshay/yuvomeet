import { Tabs } from 'expo-router';
import { TabDock } from '../../../src/features/navigation/TabDock';
import { colors } from '../../../src/ui';

/**
 * The Stitch design uses a floating pill dock, which native tabs cannot draw, so the tab bar
 * is custom. Screens stay native, mount lazily and freeze when hidden.
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabDock {...props} />}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true, sceneStyle: { backgroundColor: colors.bg } }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="plans" />
      <Tabs.Screen name="chats" />
      <Tabs.Screen name="account" />
    </Tabs>
  );
}
