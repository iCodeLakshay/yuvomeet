import { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, space, type ColorToken } from './theme';

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  iconColor?: ColorToken;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  destructive?: boolean;
}

/** Settings / notification row: circle icon, title, subtitle, chevron. */
export const ListRow = memo(function ListRow({
  title,
  subtitle,
  icon,
  iconColor,
  leading,
  trailing,
  onPress,
  chevron = Boolean(onPress),
  destructive,
}: ListRowProps) {
  const content = (
    <View style={styles.row}>
      {leading ??
        (icon ? (
          <View style={styles.iconCircle}>
            <Icon name={icon} size={20} color={destructive ? 'danger' : (iconColor ?? 'text')} />
          </View>
        ) : null)}
      <View style={styles.flex}>
        <Text variant="bodyStrong" color={destructive ? 'danger' : 'text'}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="textSubtle">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chevron-right" size={22} color="textSubtle" /> : null}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityLabel={title} pressScale={0.99}>
      {content}
    </Pressable>
  ) : (
    content
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 56, paddingVertical: space.sm },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1, gap: 2 },
});
