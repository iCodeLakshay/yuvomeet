import { useMutation, useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { qk, queryClient } from '../../lib/query';
import { placeOverride, type Place } from './placeOverride';

export type { Place };

/**
 * The member's current place.
 * Returns the user-chosen override immediately when one is set;
 * otherwise reverse-geocodes the device GPS position.
 * Coordinates never leave the device; returns null when location access is not granted.
 */
async function currentPlace(): Promise<Place | null> {
  const override = placeOverride.get();
  if (override) return override;

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

/** Asks for location access (from the place picker), then refreshes the place query. */
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

/**
 * Persist a manual area pick and sync the query cache immediately so the
 * Discover header updates without waiting for a round-trip.
 * Pass null to clear the override and fall back to live GPS.
 */
export function setPlaceOverride(place: Place | null): void {
  placeOverride.set(place);
  if (place) {
    // Instantly update the cached value so the header reflects the pick.
    queryClient.setQueryData(qk.place, place);
  } else {
    // Clear the cache so the next render re-runs GPS.
    void queryClient.invalidateQueries({ queryKey: qk.place });
  }
}
