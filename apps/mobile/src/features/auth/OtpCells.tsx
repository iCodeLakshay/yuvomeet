import { forwardRef, memo, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, withSequence, withTiming } from 'react-native-reanimated';
import { colors, radii, space, Text } from '../../ui';

export interface OtpCellsProps {
  code: string;
  length: number;
  onChange: (code: string) => void;
  /** Changes whenever a wrong code is entered, to shake the cells. */
  errorKey: number;
  locked: boolean;
  disabled?: boolean;
}

/**
 * One-time-code entry. A real (visually transparent) TextInput sits over the cells, so the
 * device's own numeric keyboard appears, paste works, and the OS can offer the SMS code
 * (`oneTimeCode` on iOS, `sms-otp` on Android). The cells only draw what the input holds.
 */
export const OtpCells = memo(
  forwardRef<TextInput, OtpCellsProps>(function OtpCells({ code, length, onChange, errorKey, locked, disabled }, ref) {
    const [focused, setFocused] = useState(false);
    const shake = useAnimatedStyle(
      () => ({
        transform: [
          {
            translateX: errorKey
              ? withSequence(withTiming(-8, { duration: 50 }), withTiming(8, { duration: 50 }), withTiming(-5, { duration: 50 }), withTiming(0, { duration: 50 }))
              : 0,
          },
        ],
      }),
      [errorKey],
    );

    return (
      <View>
        <Animated.View style={[styles.row, shake]} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {Array.from({ length }, (_, i) => {
            const active = focused && !locked && i === Math.min(code.length, length - 1);
            return (
              <View key={i} style={[styles.cell, active ? styles.focused : null, locked ? styles.locked : null]}>
                <Text variant="title2">{code[i] ?? (active ? '|' : '')}</Text>
              </View>
            );
          })}
        </Animated.View>
        <TextInput
          ref={ref}
          value={code}
          onChangeText={(text) => onChange(text.replace(/\D/g, '').slice(0, length))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={!locked && !disabled}
          autoFocus
          keyboardType="number-pad"
          inputMode="numeric"
          maxLength={length}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          importantForAutofill="yes"
          caretHidden
          contextMenuHidden
          selectionColor="transparent"
          accessibilityLabel={`Verification code, ${code.length} of ${length} digits entered`}
          style={styles.input}
        />
      </View>
    );
  }),
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.sm },
  cell: {
    flex: 1,
    height: 60,
    borderRadius: radii.md,
    backgroundColor: colors.surface1,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  focused: { borderColor: colors.textMuted, backgroundColor: colors.surface3 },
  locked: { opacity: 0.5, borderColor: colors.danger },
  // iOS ignores touches on views below 0.01 alpha, so the input is barely visible, not hidden.
  input: { ...StyleSheet.absoluteFill, opacity: 0.011, color: 'transparent', fontSize: 1 },
});
