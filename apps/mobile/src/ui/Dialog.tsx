import { memo, useEffect } from 'react';
import { BackHandler, Modal, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ZoomIn } from 'react-native-reanimated';
import { createStore } from '../lib/store';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, gutter, radii, space } from './theme';

export interface DialogAction {
  label: string;
  value: string;
  tone?: 'primary' | 'danger' | 'secondary';
}

export interface DialogOptions {
  title: string;
  message?: string;
  icon?: IconName;
  danger?: boolean;
  actions: DialogAction[];
  /** Label of the dismiss button; resolves null. */
  cancelLabel?: string;
}

interface Pending extends DialogOptions {
  resolve: (value: string | null) => void;
}

const current = createStore<Pending | null>(null);

/** Custom alert for decisions (sign out, delete, leave, block). Resolves the chosen action value, or null. */
export function showDialog(options: DialogOptions): Promise<string | null> {
  current.get()?.resolve(null);
  return new Promise((resolve) => current.set({ ...options, resolve }));
}

/** Yes/no shortcut over showDialog. */
export async function confirm(options: {
  title: string;
  message?: string;
  confirmLabel: string;
  icon?: IconName;
  danger?: boolean;
  cancelLabel?: string;
}): Promise<boolean> {
  const value = await showDialog({
    title: options.title,
    message: options.message,
    icon: options.icon,
    danger: options.danger,
    cancelLabel: options.cancelLabel ?? 'Cancel',
    actions: [{ label: options.confirmLabel, value: 'ok', tone: options.danger ? 'danger' : 'primary' }],
  });
  return value === 'ok';
}

/** One-button message (errors after an action). */
export function notify(title: string, message?: string, icon: IconName = 'error-outline') {
  void showDialog({ title, message, icon, actions: [{ label: 'OK', value: 'ok', tone: 'secondary' }] });
}

function close(value: string | null) {
  const d = current.get();
  current.set(null);
  d?.resolve(value);
}

/** Mounted once in the root layout. */
export const DialogHost = memo(function DialogHost() {
  const d = current.use();

  useEffect(() => {
    if (!d) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(null);
      return true;
    });
    return () => sub.remove();
  }, [d]);

  return (
    <Modal visible={Boolean(d)} transparent animationType="none" statusBarTranslucent onRequestClose={() => close(null)}>
      {d ? (
        <Animated.View entering={FadeIn.duration(140)} exiting={FadeOut.duration(120)} style={styles.scrim}>
          <Pressable style={StyleSheet.absoluteFill} pressScale={1} onPress={() => close(null)} accessibilityLabel="Dismiss" />
          <Animated.View entering={ZoomIn.duration(180)} style={styles.card} accessibilityViewIsModal>
            {d.icon ? (
              <View style={[styles.icon, d.danger ? styles.iconDanger : null]}>
                <Icon name={d.icon} size={26} color={d.danger ? 'danger' : 'text'} />
              </View>
            ) : null}
            <Text variant="title3" align="center" accessibilityRole="header">
              {d.title}
            </Text>
            {d.message ? (
              <Text variant="small" color="textMuted" align="center">
                {d.message}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {d.actions.map((a) => (
                <Button
                  key={a.value}
                  label={a.label}
                  size="md"
                  variant={a.tone === 'danger' ? 'danger' : a.tone === 'secondary' ? 'secondary' : 'primary'}
                  onPress={() => close(a.value)}
                />
              ))}
              {d.cancelLabel ? <Button label={d.cancelLabel} size="md" variant="ghost" onPress={() => close(null)} /> : null}
            </View>
          </Animated.View>
        </Animated.View>
      ) : null}
    </Modal>
  );
});

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center', paddingHorizontal: gutter + space.sm },
  card: {
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: space.sm,
    padding: space.xxl,
    borderRadius: radii.xxl,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface3,
    marginBottom: space.xs,
  },
  iconDanger: { backgroundColor: colors.dangerBg },
  actions: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
});
