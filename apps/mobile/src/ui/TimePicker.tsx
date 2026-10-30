import DateTimePicker, { DateTimePickerAndroid, type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { memo, useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Button } from './Button';
import { Notice } from './Notice';
import { Sheet } from './Sheet';

const toDate = (minutes: number) => {
  const d = new Date();
  d.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return d;
};
const toMinutes = (d: Date) => d.getHours() * 60 + d.getMinutes();
const label = (minutes: number) => `${((Math.floor(minutes / 60) + 11) % 12) + 1}:${String(minutes % 60).padStart(2, '0')} ${minutes < 720 ? 'AM' : 'PM'}`;

export interface TimePickerProps {
  visible: boolean;
  onClose: () => void;
  /** Minutes after midnight, or null when unset. */
  value: number | null;
  /** Called only with a time that passed `validate`. */
  onChange: (minutes: number) => void;
  /** Why a time cannot be used (shown to the host), or null when it is fine. */
  validate: (minutes: number) => string | null;
  /** The time the clock opens on when nothing is picked yet; null when no time is left today. */
  suggested: number | null;
  /** Called when the host confirms a time that fails `validate` (Android closes the dialog first). */
  onInvalid?: (message: string) => void;
  title?: string;
  emptyText?: string;
}

/**
 * Clock-style start time. Android opens the system Material clock dialog; iOS shows the system
 * time wheel in a sheet. Both are the platform's own controls, so keyboard entry, 12/24 hour
 * handling and accessibility come from the OS.
 */
export const TimePicker = memo(function TimePicker(props: TimePickerProps) {
  return Platform.OS === 'android' ? <AndroidClock {...props} /> : <IosWheel {...props} />;
});

function AndroidClock({ visible, onClose, value, onChange, validate, suggested, onInvalid, emptyText }: TimePickerProps) {
  // The dialog is imperative; keep the latest callbacks without re-opening it on every render.
  const latest = useRef({ onClose, value, onChange, validate, suggested, onInvalid, emptyText });
  latest.current = { onClose, value, onChange, validate, suggested, onInvalid, emptyText };

  useEffect(() => {
    if (!visible) return;
    const { value: current, suggested: start } = latest.current;
    const initial = current ?? start;
    if (initial == null) {
      latest.current.onInvalid?.(latest.current.emptyText ?? 'No start times are left on this day.');
      latest.current.onClose();
      return;
    }
    DateTimePickerAndroid.open({
      value: toDate(initial),
      mode: 'time',
      display: 'clock',
      is24Hour: false,
      onChange: (event: DateTimePickerEvent, date?: Date) => {
        const l = latest.current;
        l.onClose();
        if (event.type !== 'set' || !date) return;
        const minutes = toMinutes(date);
        const problem = l.validate(minutes);
        if (problem) l.onInvalid?.(problem);
        else l.onChange(minutes);
      },
    });
    return () => {
      void DateTimePickerAndroid.dismiss('time');
    };
  }, [visible]);

  return null;
}

function IosWheel({ visible, onClose, value, onChange, validate, suggested, title = 'Start time', emptyText }: TimePickerProps) {
  const [draft, setDraft] = useState<number | null>(value ?? suggested);
  const [seen, setSeen] = useState(visible);
  if (visible !== seen) {
    setSeen(visible);
    if (visible) setDraft(value ?? suggested);
  }
  const problem = draft == null ? (emptyText ?? 'No start times are left on this day.') : validate(draft);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={draft != null && !problem ? `Starts at ${label(draft)}` : undefined}
      footer={
        <Button
          label="Done"
          disabled={draft == null || Boolean(problem)}
          onPress={() => {
            if (draft != null && !problem) onChange(draft);
            onClose();
          }}
        />
      }
    >
      <View style={styles.wheel}>
        {draft != null ? (
          <DateTimePicker
            value={toDate(draft)}
            mode="time"
            display="spinner"
            themeVariant="dark"
            minuteInterval={5}
            onChange={(_event, date) => date && setDraft(toMinutes(date))}
          />
        ) : null}
      </View>
      {problem ? <Notice tone="warning" text={problem} /> : null}
    </Sheet>
  );
}

const styles = StyleSheet.create({ wheel: { alignItems: 'center' } });
