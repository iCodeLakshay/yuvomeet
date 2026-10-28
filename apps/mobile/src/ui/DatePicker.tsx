import { memo, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { IconButton } from './IconButton';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { colors, radii, space } from './theme';

/** Calendar days are keyed by the UTC ms of 00:00 IST (same keys as features/plans/schedule). */
const IST = 5.5 * 3_600_000;
const DAY = 86_400_000;
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthTitle = new Intl.DateTimeFormat('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });

const keyOf = (y: number, m: number, d: number) => Date.UTC(y, m, d) - IST;
const partsOf = (key: number) => {
  const d = new Date(key + IST);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
};

export interface DatePickerProps {
  visible: boolean;
  onClose: () => void;
  value: number;
  onChange: (dayKey: number) => void;
  minDay: number;
  maxDay: number;
  title?: string;
}

/** Month calendar in a bottom sheet: every day selectable between minDay and maxDay. */
export const DatePicker = memo(function DatePicker({ visible, onClose, value, onChange, minDay, maxDay, title = 'Pick a date' }: DatePickerProps) {
  const start = partsOf(value);
  const [month, setMonth] = useState({ y: start.y, m: start.m });
  const [picked, setPicked] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setPicked(value);
    setMonth({ y: start.y, m: start.m });
  }

  const today = minDay;
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(month.y, month.m, 1)).getUTCDay();
    const count = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
    const out: (number | null)[] = Array.from({ length: first }, () => null);
    for (let d = 1; d <= count; d++) out.push(keyOf(month.y, month.m, d));
    while (out.length % 7) out.push(null);
    return out;
  }, [month]);

  const min = partsOf(minDay);
  const max = partsOf(maxDay);
  const canPrev = month.y > min.y || (month.y === min.y && month.m > min.m);
  const canNext = month.y < max.y || (month.y === max.y && month.m < max.m);
  const shift = (delta: number) =>
    setMonth(({ y, m }) => {
      const next = new Date(Date.UTC(y, m + delta, 1));
      return { y: next.getUTCFullYear(), m: next.getUTCMonth() };
    });

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      footer={
        <Button
          label="Done"
          onPress={() => {
            onChange(picked);
            onClose();
          }}
        />
      }
    >
      <View style={styles.monthRow}>
        <IconButton icon="chevron-left" label="Previous month" size={40} onPress={canPrev ? () => shift(-1) : undefined} color={canPrev ? 'text' : 'textSubtle'} />
        <Text variant="bodyStrong" style={styles.flex} align="center">
          {monthTitle.format(new Date(Date.UTC(month.y, month.m, 1)))}
        </Text>
        <IconButton icon="chevron-right" label="Next month" size={40} onPress={canNext ? () => shift(1) : undefined} color={canNext ? 'text' : 'textSubtle'} />
      </View>
      <View>
        <View style={styles.week}>
          {WEEKDAYS.map((w, i) => (
            <Text key={i} variant="caption" color="textSubtle" align="center" style={styles.cell}>
              {w}
            </Text>
          ))}
        </View>
        <View style={styles.grid}>
          {cells.map((key, i) => {
            if (key == null) return <View key={`e${i}`} style={styles.cell} />;
            const disabled = key < minDay || key > maxDay;
            const selected = key === picked;
            const isToday = Math.abs(key - today) < DAY / 2;
            return (
              <View key={key} style={styles.cell}>
                <Pressable
                  onPress={() => setPicked(key)}
                  disabled={disabled}
                  pressScale={0.9}
                  accessibilityLabel={new Date(key + IST).toUTCString().slice(0, 16)}
                  accessibilityState={{ selected, disabled }}
                  style={[styles.day, isToday && !selected ? styles.today : null, selected ? styles.selected : null]}
                >
                  <Text variant={selected ? 'smallStrong' : 'small'} color={selected ? 'onPrimary' : disabled ? 'textSubtle' : 'text'}>
                    {partsOf(key).d}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  week: { flexDirection: 'row', marginBottom: space.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, alignItems: 'center', paddingVertical: 3 },
  day: { width: 42, height: 42, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 1, borderColor: colors.borderStrong },
  selected: { backgroundColor: colors.primary },
});
