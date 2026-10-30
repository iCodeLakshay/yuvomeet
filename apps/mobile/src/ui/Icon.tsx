import { memo } from 'react';
import { View } from 'react-native';
import { GLASS, type IconName } from './glassIcons';
import { colors, type ColorToken } from './theme';

export type { IconName };

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorToken;
}

/**
 * The Glass artwork only fills about 73% of its 24-unit box, which left a wide empty margin around
 * every icon. The glyph is drawn this much larger inside the same `size` box, so the artwork reads
 * bigger and nothing around it moves.
 */
const FILL = 1.25;

/**
 * Every icon in the app is a Glass icon from @thesvg/ui-react-native. Names stay the Material
 * names the Stitch frames and the database (activities, interests) already use; glassIcons.ts
 * maps each one to its Glass equivalent. A name with no mapping renders a neutral Glass icon
 * rather than failing, so a new database value can never break a screen.
 */
export const Icon = memo(function Icon({ name, size = 24, color = 'text' }: IconProps) {
  const Glyph = (GLASS as Record<string, (typeof GLASS)[IconName]>)[name] ?? GLASS.groups;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Glyph size={size * FILL} color={colors[color]} accessibilityElementsHidden importantForAccessibility="no" />
    </View>
  );
});
