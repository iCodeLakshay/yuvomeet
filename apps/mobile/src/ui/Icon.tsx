import createIconSet from '@expo/vector-icons/createIconSet';
import glyphMap from '@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialIcons.json';
import { memo } from 'react';
import { colors, type ColorToken } from './theme';

/**
 * Material Icons, the same set Stitch uses. The font is embedded at build time by the
 * expo-font config plugin, so icons render on first frame without async loading.
 */
const MaterialIcons = createIconSet(glyphMap, 'MaterialIcons', 'MaterialIcons.ttf');

export type IconName = keyof typeof glyphMap;

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
}

export const Icon = memo(function Icon({ name, size = 20, color = 'text' }: IconProps) {
  return <MaterialIcons name={name} size={size} color={colors[color]} accessibilityElementsHidden importantForAccessibility="no" />;
});
