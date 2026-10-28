import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { qk, queryClient } from '../../lib/query';

export interface Place {
  /** "Talwandi, Kota" or "Kota, Rajasthan". */
  label: string;
  city: string | null;
}

/**
 * The member's current place, from the device location reverse-geocoded on the phone.
 * Coordinates never leave the device; null when location access isn't granted.
 */
async function currentPlace(): Promise<Place | null> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return null;
  const fix =
    (await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 })) ??
    (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
  const [address] = await Location.reverseGeocodeAsync({ latitude: fix.coords.latitude, longitude: fix.coords.longitude });
  if (!address) return null;
  const city = address.city ?? address.subregion ?? null;
  const local = address.district && address.district !== city ? address.district : null;
  const label = [local ?? city, local ? city : address.region].filter(Boolean).join(', ');
  return label ? { label, city } : null;
}

export function usePlace() {
  return useQuery({ queryKey: qk.place, staleTime: 15 * 60_000, retry: false, queryFn: currentPlace });
}

/** Asks for location access (from a tap on the header), then refreshes the place. */
export function useAskLocation() {
  return useMutation({
    mutationFn: async () => {
      const permission = await Location.requestForegroundPermissionsAsync();
      return permission.granted;
    },
    onSuccess: (granted) => {
      if (granted) void queryClient.invalidateQueries({ queryKey: qk.place });
    },
  });
}
