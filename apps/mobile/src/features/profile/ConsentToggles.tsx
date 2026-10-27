import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Icon, space, Toggle, type IconName } from '../../ui';

export type ConsentKey = 'camera' | 'location' | 'notifications';
export type ConsentChoices = Record<ConsentKey, boolean>;

const PURPOSES: { key: ConsentKey; icon: IconName; label: string; description: string }[] = [
  { key: 'camera', icon: 'photo-camera', label: 'Camera', description: 'Only when you add profile photos or do the selfie check.' },
  { key: 'location', icon: 'my-location', label: 'One-time location', description: 'Only for venue check-in and SOS. Never tracked or stored.' },
  { key: 'notifications', icon: 'notifications-none', label: 'Notifications', description: 'Join approvals, plan changes and group chat.' },
];

/** Privacy C-1 purpose toggles. Shared by onboarding consent and Settings > Privacy (C-4). */
export const ConsentToggles = memo(function ConsentToggles({ value, onChange }: { value: ConsentChoices; onChange: (key: ConsentKey, granted: boolean) => void }) {
  return (
    <>
      {PURPOSES.map((p) => (
        <Card key={p.key}>
          <View style={styles.row}>
            <Icon name={p.icon} size={22} color="textMuted" />
            <View style={styles.flex}>
              <Toggle label={p.label} description={p.description} value={value[p.key]} onChange={(v) => onChange(p.key, v)} />
            </View>
          </View>
        </Card>
      ))}
    </>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  flex: { flex: 1 },
});
