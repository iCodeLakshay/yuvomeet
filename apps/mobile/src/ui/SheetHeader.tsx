import { router } from 'expo-router';
import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton } from './IconButton';
import { Text } from './Text';
import { space } from './theme';

/** Title row for native form-sheet routes (report, join, filters, verify gate). */
export const SheetHeader = memo(function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.flex}>
        <Text variant="title2" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" color="textSubtle">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <IconButton icon="close" label="Close" onPress={() => router.back()} />
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingTop: space.lg },
  flex: { flex: 1, gap: 2 },
});
