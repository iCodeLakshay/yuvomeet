import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, Icon, Pressable, radii, space, Text } from '../../ui';

const KEYS = [
  ['1', ''], ['2', 'ABC'], ['3', 'DEF'],
  ['4', 'GHI'], ['5', 'JKL'], ['6', 'MNO'],
  ['7', 'PQRS'], ['8', 'TUV'], ['9', 'WXYZ'],
  ['', ''], ['0', ''], ['del', ''],
] as const;

/** Stitch OTP keypad. Keys are 44 px+ targets with spoken labels. */
export const Keypad = memo(function Keypad({ onKey, disabled }: { onKey: (key: string) => void; disabled?: boolean }) {
  return (
    <View style={styles.grid}>
      {KEYS.map(([key, letters], i) =>
        key === '' ? (
          <View key={i} style={styles.key} />
        ) : (
          <Pressable
            key={i}
            onPress={() => onKey(key)}
            disabled={disabled}
            haptic
            pressScale={0.94}
            accessibilityLabel={key === 'del' ? 'Delete' : key}
            style={[styles.key, key === 'del' ? styles.plain : styles.surface]}
          >
            {key === 'del' ? (
              <Icon name="backspace" size={24} color="textMuted" />
            ) : (
              <>
                <Text variant="title2">{key}</Text>
                {letters ? (
                  <Text variant="label" color="textSubtle" style={styles.letters}>
                    {letters}
                  </Text>
                ) : null}
              </>
            )}
          </Pressable>
        ),
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md },
  key: { width: '31%', height: 56, borderRadius: radii.xl, alignItems: 'center', justifyContent: 'center' },
  surface: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  plain: { backgroundColor: 'transparent' },
  letters: { fontSize: 9, lineHeight: 11, marginTop: -2 },
});
