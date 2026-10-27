import { Linking } from 'react-native';

/** Hands navigation to Google Maps; the app never tracks the route (S-37). */
export function openDirections(lat: number, lng: number, label: string) {
  const geo = `geo:0,0?q=${lat},${lng}(${encodeURIComponent(label)})`;
  return Linking.openURL(geo).catch(() => Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`));
}
