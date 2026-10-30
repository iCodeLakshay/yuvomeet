import { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeOut, LinearTransition, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStore } from '../lib/store';
import { Icon, type IconName } from './Icon';
import { Pressable } from './Pressable';
import { Text } from './Text';
import { colors, gutter, radii, space, type ColorToken } from './theme';

export type ToastTone = 'success' | 'info' | 'warning' | 'error';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  title?: string;
}

const tones: Record<ToastTone, { icon: IconName; color: ColorToken; border: string }> = {
  success: { icon: 'check-circle', color: 'success', border: colors.successBorder },
  info: { icon: 'info-outline', color: 'brand', border: colors.borderStrong },
  warning: { icon: 'info-outline', color: 'warning', border: 'rgba(245, 158, 11, 0.45)' },
  error: { icon: 'error-outline', color: 'danger', border: colors.danger },
};

const SHOWN_FOR: Record<ToastTone, number> = { success: 3200, info: 3600, warning: 4800, error: 5600 };
const MAX_VISIBLE = 3;

const items = createStore<ToastItem[]>([]);
const timers = new Map<number, ReturnType<typeof setTimeout>>();
/** Open modals (sheets) each render their own host, so the root one steps aside while any is open. */
const modalLayers = createStore(0);
let seq = 0;

function dismiss(id: number) {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  items.set((list) => list.filter((i) => i.id !== id));
}

function arm(item: ToastItem) {
  const t = timers.get(item.id);
  if (t) clearTimeout(t);
  timers.set(item.id, setTimeout(() => dismiss(item.id), SHOWN_FOR[item.tone]));
}

function show(tone: ToastTone, message: string, title?: string) {
  // The same message while it is still on screen restarts its timer instead of stacking up.
  const same = items.get().find((i) => i.tone === tone && i.message === message && i.title === title);
  if (same) {
    arm(same);
    return;
  }
  const item: ToastItem = { id: ++seq, tone, message, title };
  const overflow = items.get().slice(0, Math.max(0, items.get().length - (MAX_VISIBLE - 1)));
  overflow.forEach((i) => dismiss(i.id));
  items.set((list) => [...list, item]);
  arm(item);
}

/**
 * The one way the app tells people something happened: errors, warnings, confirmations and
 * tips all appear as a toast at the top of the screen. Pass a short sentence; `title` is optional.
 */
export const toast = {
  success: (message: string, title?: string) => show('success', message, title),
  info: (message: string, title?: string) => show('info', message, title),
  warning: (message: string, title?: string) => show('warning', message, title),
  error: (message: string, title?: string) => show('error', message, title),
};

/** Mounted once in the root layout, and inside every Modal-based sheet so toasts never hide behind one. */
export const ToastHost = memo(function ToastHost({ inModal = false }: { inModal?: boolean }) {
  const list = items.use();
  const layers = modalLayers.use();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!inModal) return;
    modalLayers.set((n) => n + 1);
    return () => modalLayers.set((n) => n - 1);
  }, [inModal]);

  if (!inModal && layers > 0) return null;
  return (
    <View pointerEvents="box-none" style={[styles.host, { top: insets.top + space.sm }]}>
      {list.map((t) => {
        const tone = tones[t.tone];
        return (
          <Animated.View
            key={t.id}
            entering={SlideInUp.duration(220)}
            exiting={FadeOut.duration(160)}
            layout={LinearTransition.duration(180)}
            style={styles.row}
          >
            <Pressable
              onPress={() => dismiss(t.id)}
              pressScale={0.98}
              accessibilityRole={t.tone === 'error' ? 'alert' : 'text'}
              accessibilityLiveRegion="polite"
              accessibilityLabel={t.title ? `${t.title}. ${t.message}` : t.message}
              accessibilityHint="Double tap to dismiss"
              style={[styles.toast, { borderColor: tone.border }]}
            >
              <Icon name={tone.icon} size={17} color={tone.color} />
              <View style={styles.copy}>
                {t.title ? <Text variant="smallStrong">{t.title}</Text> : null}
                <Text variant="small" color={t.title ? 'textMuted' : 'text'}>
                  {t.message}
                </Text>
              </View>
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, paddingHorizontal: gutter, gap: space.sm, zIndex: 1000, elevation: 1000 },
  row: { alignSelf: 'stretch' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.surface3,
    borderWidth: 1,
  },
  copy: { flex: 1, gap: 2 },
});
