import { Image, type ImageProps } from 'expo-image';
import { memo } from 'react';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';
import { useSignedUrl } from '../lib/media';
import { colors } from './theme';

export interface RemoteImageProps extends Pick<ImageProps, 'contentFit' | 'transition' | 'blurRadius' | 'accessibilityLabel'> {
  /** Path in the private media bucket. Signed on demand; cached on disk by path. */
  path: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  fallback?: React.ReactNode;
}

export const RemoteImage = memo(function RemoteImage({
  path,
  style,
  fallback,
  contentFit = 'cover',
  transition = 150,
  ...rest
}: RemoteImageProps) {
  const uri = useSignedUrl(path);
  if (!path) return <View style={[styles.placeholder, style as StyleProp<object>]}>{fallback}</View>;
  return (
    <Image
      source={uri ? { uri, cacheKey: path } : undefined}
      placeholder={{ cacheKey: path }}
      recyclingKey={path}
      cachePolicy="disk"
      contentFit={contentFit}
      transition={transition}
      style={[styles.placeholder, style]}
      {...rest}
    />
  );
});

const styles = StyleSheet.create({ placeholder: { backgroundColor: colors.surface3, overflow: 'hidden' } });
