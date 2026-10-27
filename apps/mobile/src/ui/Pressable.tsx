import { memo } from 'react';
import { Pressable as RNPressable, type PressableProps as RNPressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

export interface PressableProps extends Omit<RNPressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. 1 disables the effect. */
  pressScale?: number;
  haptic?: boolean;
}

/**
 * Press feedback on the UI thread (transform only, animation-gpu-properties). Built on the
 * platform Pressable rather than a gesture detector so TalkBack activation keeps working.
 */
export const Pressable = memo(function Pressable({
  pressScale = 0.97,
  haptic = false,
  onPressIn,
  onPressOut,
  onPress,
  style,
  disabled,
  ...rest
}: PressableProps) {
  const pressed = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressScale) * pressed.get() }],
    opacity: disabled ? 0.45 : 1,
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPressIn={(e) => {
        pressed.set(withTiming(1, { duration: 90 }));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.set(withTiming(0, { duration: 140 }));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) void Haptics.selectionAsync();
        onPress?.(e);
      }}
      style={[style, animated]}
      {...rest}
    />
  );
});
