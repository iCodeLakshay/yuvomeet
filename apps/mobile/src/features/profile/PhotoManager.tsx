import { MAX_PROFILE_PHOTOS } from '@yuvomeet/shared';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { errorMessage } from '../../lib/errors';
import { pickImage } from '../../lib/media';
import { Badge, colors, confirm, Icon, Notice, Pressable, RemoteImage, space, Text, type IconName } from '../../ui';
import { useAddPhoto, useDeletePhoto, useMyPhotos } from './api';

const STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' }> = {
  approved: { label: 'Approved', tone: 'success' },
  pending: { label: 'Checking', tone: 'warning' },
  rejected: { label: 'Not approved', tone: 'danger' },
};

function Action({ icon, label, onPress, disabled }: { icon: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} accessibilityLabel={label} style={styles.action}>
      <View style={styles.actionCircle}>
        <Icon name={icon} size={24} />
      </View>
      <Text variant="caption" color="textMuted">
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * Stitch "Add a profile photo": large preview, camera/gallery/remove actions, plus a strip for
 * the 2 to 6 photos ON-3 requires. Every upload is moderated before others can see it (S-21).
 */
export function PhotoManager() {
  const photos = useMyPhotos();
  const add = useAddPhoto();
  const remove = useDeletePhoto();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = photos.data ?? [];
  const selected = list.find((p) => p.id === selectedId) ?? list[0];
  const full = list.length >= MAX_PROFILE_PHOTOS;

  const addFrom = async (source: 'camera' | 'library') => {
    setError(null);
    try {
      const uri = await pickImage(source, true);
      if (!uri) return;
      const result = await add.mutateAsync({ uri, position: list.length });
      setSelectedId(result.id);
      if (result.status === 'rejected') setError('That photo was not approved. Use a clear photo of your face.');
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  const removeSelected = async () => {
    if (!selected) return;
    if (!(await confirm({ title: 'Remove this photo?', confirmLabel: 'Remove', icon: 'delete-outline', danger: true }))) return;
    setError(null);
    try {
      await remove.mutateAsync(selected.id);
      setSelectedId(null);
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.preview}>
        <RemoteImage
          path={selected?.path}
          style={styles.circle}
          accessibilityLabel="Selected photo"
          fallback={
            <View style={styles.empty}>
              <Icon name="add-a-photo" size={40} color="textSubtle" />
            </View>
          }
        />
        {add.isPending ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.text} />
          </View>
        ) : null}
        <Pressable onPress={() => addFrom('camera')} disabled={full || add.isPending} accessibilityLabel="Take a photo" style={styles.cameraBadge}>
          <Icon name="photo-camera" size={22} color="onPrimary" />
        </Pressable>
      </View>

      <View style={styles.actions}>
        <Action icon="photo-camera" label="Camera" onPress={() => addFrom('camera')} disabled={full || add.isPending} />
        <Action icon="image" label="Gallery" onPress={() => addFrom('library')} disabled={full || add.isPending} />
        <Action icon="delete-outline" label="Remove" onPress={removeSelected} disabled={!selected || remove.isPending} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {list.map((p) => {
          const s = STATUS[p.status] ?? STATUS.pending!;
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelectedId(p.id)}
              accessibilityLabel={`Photo, ${s.label}`}
              style={[styles.thumb, selected?.id === p.id ? styles.thumbOn : null]}
            >
              <RemoteImage path={p.path} style={styles.thumbImage} />
              <View style={styles.thumbBadge}>
                <Badge label={s.label} tone={s.tone} />
              </View>
            </Pressable>
          );
        })}
        {Array.from({ length: Math.max(0, 2 - list.length) }, (_, i) => (
          <Pressable key={`empty-${i}`} onPress={() => addFrom('library')} accessibilityLabel="Add photo" style={[styles.thumb, styles.thumbEmpty]}>
            <Icon name="add" size={24} color="textSubtle" />
          </Pressable>
        ))}
      </ScrollView>
      {error ? <Notice tone="danger" text={error} /> : null}
    </View>
  );
}

const SIZE = 220;

const styles = StyleSheet.create({
  wrap: { gap: space.xl, alignItems: 'center' },
  preview: { width: SIZE, height: SIZE, marginTop: space.md },
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 3, borderColor: colors.borderStrong },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface2 },
  busy: { ...StyleSheet.absoluteFill, borderRadius: SIZE / 2, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center' },
  cameraBadge: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.bg,
  },
  actions: { flexDirection: 'row', gap: space.xl },
  action: { alignItems: 'center', gap: space.sm, minWidth: 64 },
  actionCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  strip: { gap: space.sm, paddingHorizontal: space.xs },
  thumb: { width: 84, height: 108, borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'transparent' },
  thumbOn: { borderColor: colors.accent },
  thumbImage: { flex: 1 },
  thumbEmpty: { backgroundColor: colors.surface1, borderColor: colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  thumbBadge: { position: 'absolute', left: 4, bottom: 4 },
});
