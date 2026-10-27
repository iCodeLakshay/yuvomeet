import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { space } from './theme';

export interface SectionHeaderProps {
  title: string;
  icon?: IconName;
  meta?: string;
  right?: ReactNode;
  /** Uppercase form label style instead of a section title. */
  small?: boolean;
}

export const SectionHeader = memo(function SectionHeader({ title, icon, meta, right, small }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      {icon ? <Icon name={icon} size={20} color="textMuted" /> : null}
      <Text variant={small ? 'label' : 'title3'} color={small ? 'textSubtle' : 'text'} style={styles.flex} accessibilityRole="header">
        {title}
      </Text>
      {meta ? (
        <Text variant="label" color="textSubtle">
          {meta}
        </Text>
      ) : null}
      {right}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  flex: { flex: 1 },
});
