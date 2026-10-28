import { memo } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { gutter, IconButton, RemoteImage } from '../../ui';

/** Full-screen chat photo: pinch or double-tap to zoom, drag while zoomed. */
export const ImageViewer = memo(function ImageViewer({ path, onClose }: { path: string | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const scale = useSharedValue(1);
  const saved = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.set(withTiming(1));
    saved.set(1);
    tx.set(withTiming(0));
    ty.set(withTiming(0));
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.set(Math.min(4, Math.max(1, saved.get() * e.scale)));
    })
    .onEnd(() => {
      saved.set(scale.get());
      if (scale.get() <= 1.01) reset();
    });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      startX.set(tx.get());
      startY.set(ty.get());
    })
    .onUpdate((e) => {
      if (scale.get() > 1) {
        tx.set(startX.get() + e.translationX);
        ty.set(startY.get() + e.translationY);
      }
    });
  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.get() > 1) reset();
      else {
        scale.set(withTiming(2.5));
        saved.set(2.5);
      }
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: tx.get() }, { translateY: ty.get() }, { scale: scale.get() }] }));

  const close = () => {
    scale.set(1);
    saved.set(1);
    tx.set(0);
    ty.set(0);
    onClose();
  };

  return (
    <Modal visible={Boolean(path)} transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <GestureHandlerRootView style={styles.root}>
        <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, doubleTap)}>
          <Animated.View style={[styles.flex, style]}>
            <RemoteImage path={path} style={styles.flex} contentFit="contain" accessibilityLabel="Photo" />
          </Animated.View>
        </GestureDetector>
        <View style={[styles.close, { top: insets.top + 8 }]}>
          <IconButton icon="close" label="Close photo" variant="glass" onPress={close} />
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1, backgroundColor: 'transparent' },
  close: { position: 'absolute', right: gutter },
});
