import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { colors, radii, space } from './theme';

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
}

export const Stepper = memo(function Stepper({ value, min, max, onChange, label }: StepperProps) {
  return (
    <View style={styles.pill} accessibilityLabel={`${label}: ${value}`}>
      <IconButton icon="remove" label={`Decrease ${label}`} onPress={() => onChange(Math.max(min, value - 1))} size={40} />
      <Text variant="title3" style={styles.value}>
        {value}
      </Text>
      <IconButton icon="add" label={`Increase ${label}`} onPress={() => onChange(Math.min(max, value + 1))} size={40} />
    </View>
  );
});

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.bgDeep,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: { minWidth: 28, textAlign: 'center' },
});
