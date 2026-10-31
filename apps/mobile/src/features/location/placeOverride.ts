import { readJson, writeJson } from '../../lib/storage';
import { createStore } from '../../lib/store';

/** A resolved place: display label and optional city name. */
export interface Place {
  label: string;
  city: string | null;
}

/**
 * Key for the MMKV-persisted place override.
 * Stored in the shared encrypted MMKV instance (no new dependency needed).
 */
const STORAGE_KEY = 'discover.place-override.v1';

const _store = createStore<Place | null>(readJson<Place | null>(STORAGE_KEY, null));

/**
 * User-chosen place override.  When null the app falls back to live GPS.
 * Backed by MMKV so the choice survives app restarts.
 */
export const placeOverride = {
  get: (): Place | null => _store.get(),
  set: (v: Place | null): void => {
    writeJson(STORAGE_KEY, v);
    _store.set(v);
  },
  /** Reactive hook – re-renders on change (useSyncExternalStore under the hood). */
  use: (): Place | null => _store.use(),
};
