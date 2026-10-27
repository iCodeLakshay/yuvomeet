import { memo } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { Text } from './Text';
import { colors, space } from './theme';

export interface ToggleProps {
  label: string;
  description?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export const Toggle = memo(function Toggle({ label, description, value, onChange, disabled }: ToggleProps) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="bodyStrong">{label}</Text>
        {description ? (
          <Text variant="small" color="textSubtle">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        accessibilityLabel={label}
        trackColor={{ false: colors.surface4, true: colors.textMuted }}
        thumbColor={value ? colors.primary : colors.textSubtle}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.lg, minHeight: 52 },
  flex: { flex: 1, gap: 2 },
});
