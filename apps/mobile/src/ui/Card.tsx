import { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable } from './Pressable';
import { colors, radii, space } from './theme';

export interface CardProps {
  children: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
  tone?: 'default' | 'raised' | 'outline';
  style?: StyleProp<ViewStyle>;
}

/** Rounded surface with a hairline border (Stitch cards). Pressable when onPress is set. */
export const Card = memo(function Card({ children, onPress, accessibilityLabel, tone = 'default', style }: CardProps) {
  const cardStyle = [styles.base, styles[tone], style];
  if (!onPress) return <View style={cardStyle}>{children}</View>;
  return (
    <Pressable onPress={onPress} accessibilityLabel={accessibilityLabel} pressScale={0.985} style={cardStyle}>
      {children}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: { borderRadius: radii.xl, padding: space.lg, borderWidth: 1, gap: space.md },
  default: { backgroundColor: colors.surface1, borderColor: colors.border },
  raised: { backgroundColor: colors.surface2, borderColor: colors.border },
  outline: { backgroundColor: 'transparent', borderColor: colors.borderStrong },
});
