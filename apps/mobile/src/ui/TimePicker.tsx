import { memo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Pressable } from './Pressable';
import { Sheet } from './Sheet';
import { Text } from './Text';
import { colors, radii, space } from './theme';

const MINUTES = [0, 15, 30, 45];
const GROUPS: { label: string; hours: number[] }[] = [
  { label: 'Morning', hours: [6, 7, 8, 9, 10, 11] },
  { label: 'Afternoon', hours: [12, 13, 14, 15, 16, 17] },
  { label: 'Evening', hours: [18, 19, 20, 21, 22, 23] },
];

const hourLabel = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`;

export interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  /** Minutes after midnight, or null when unset. */
  value: number | null;
  onChange: (minutes: number) => void;
  /** Whether a start time (minutes after midnight) can be picked. */
  isAllowed: (minutes: number) => boolean;
  title?: string;
  /** Extra controls under the clock (e.g. duration). */
  children?: ReactNode;
  emptyText?: string;
}

/** Hour grid plus minute segments: every time of day visible at once, invalid ones dimmed. */
export const TimePicker = memo(function TimePicker({ visible, onClose, value, onChange, isAllowed, title = 'Pick a time', children, emptyText }: TimePickerProps) {
  const [hour, setHour] = useState<number | null>(value != null ? Math.floor(value / 60) : null);
  const [minute, setMinute] = useState<number>(value != null ? value % 60 : 0);
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setHour(value != null ? Math.floor(value / 60) : null);
    setMinute(value != null ? value % 60 : 0);
  }

  const hourOpen = (h: number) => MINUTES.some((m) => isAllowed(h * 60 + m));
  const anyOpen = GROUPS.some((g) => g.hours.some(hourOpen));
  const picked = hour != null && isAllowed(hour * 60 + minute) ? hour * 60 + minute : null;

  const chooseHour = (h: number) => {
    setHour(h);
    if (!isAllowed(h * 60 + minute)) setMinute(MINUTES.find((m) => isAllowed(h * 60 + m)) ?? 0);
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={picked != null ? `Starts at ${hourLabel(Math.floor(picked / 60)).replace(' ', `:${String(picked % 60).padStart(2, '0')} `)}` : undefined}
      footer={
        <Button
          label="Done"
          disabled={picked == null}
          onPress={() => {
            if (picked != null) onChange(picked);
            onClose();
          }}
        />
      }
    >
      {anyOpen ? (
        <View style={styles.groups}>
          {GROUPS.map((g) => (
            <View key={g.label} style={styles.group}>
              <Text variant="label" color="textSubtle">
                {g.label}
              </Text>
              <View style={styles.row}>
                {g.hours.map((h) => {
                  const open = hourOpen(h);
                  const on = hour === h;
                  return (
                    <Pressable
                      key={h}
                      onPress={() => chooseHour(h)}
                      disabled={!open}
                      pressScale={0.94}
                      accessibilityLabel={hourLabel(h)}
                      accessibilityState={{ selected: on, disabled: !open }}
                      style={[styles.hour, on ? styles.on : null]}
                    >
                      <Text variant="smallStrong" color={on ? 'onPrimary' : open ? 'text' : 'textSubtle'}>
                        {hourLabel(h)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <View style={styles.group}>
            <Text variant="label" color="textSubtle">
              Minutes
            </Text>
            <View style={styles.segment}>
              {MINUTES.map((m) => {
                const open = hour != null && isAllowed(hour * 60 + m);
                const on = minute === m && hour != null;
                return (
                  <Pressable
                    key={m}
                    onPress={() => setMinute(m)}
                    disabled={!open}
                    pressScale={0.96}
                    accessibilityLabel={`${m} minutes`}
                    accessibilityState={{ selected: on, disabled: !open }}
                    style={[styles.minute, on ? styles.minuteOn : null]}
                  >
                    <Text variant="smallStrong" color={on ? 'text' : open ? 'textMuted' : 'textSubtle'}>
                      :{String(m).padStart(2, '0')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : (
        <Text variant="small" color="textSubtle">
          {emptyText ?? 'No times left on this day.'}
        </Text>
      )}
      {children}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  groups: { gap: space.md },
  group: { gap: space.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  hour: {
    width: '31%',
    flexGrow: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
  },
  on: { backgroundColor: colors.primary, borderColor: colors.primary },
  segment: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: radii.pill, backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
  minute: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill },
  minuteOn: { backgroundColor: colors.surface4 },
});
