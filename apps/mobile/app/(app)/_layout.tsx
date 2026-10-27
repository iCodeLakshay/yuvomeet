import { Stack, type NativeStackNavigationOptions } from 'expo-router';
import { colors, radii } from '../../src/ui';

/** Native form sheets for the Stitch bottom drawers (ui-native-modals). */
const sheet: NativeStackNavigationOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  sheetCornerRadius: radii.xxl,
  sheetAllowedDetents: [0.7, 1],
  contentStyle: { backgroundColor: colors.surface1 },
};

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }}>
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="report" options={{ ...sheet, sheetAllowedDetents: [0.85, 1] }} />
      <Stack.Screen name="filters" options={sheet} />
      <Stack.Screen name="verify-gate" options={{ ...sheet, sheetAllowedDetents: [0.5] }} />
      <Stack.Screen name="plan/[id]/join" options={{ ...sheet, sheetAllowedDetents: [0.65, 0.9] }} />
      <Stack.Screen name="plan/[id]/cancel" options={sheet} />
      <Stack.Screen name="plan/venue" options={{ ...sheet, sheetAllowedDetents: [0.75, 1] }} />
      <Stack.Screen name="safety/sos" options={{ ...sheet, sheetAllowedDetents: [0.75] }} />
    </Stack>
  );
}
