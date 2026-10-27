import { Stack } from 'expo-router';
import { colors } from '../../src/ui';

export default function AccountLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg }, animation: 'slide_from_right' }} />;
}
