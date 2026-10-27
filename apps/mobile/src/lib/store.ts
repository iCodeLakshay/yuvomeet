import { useSyncExternalStore } from 'react';

/** Minimal shared state for values passed between a screen and its sheet (filters, venue pick). */
export function createStore<T>(initial: T) {
  let state = initial;
  const listeners = new Set<() => void>();
  const subscribe = (cb: () => void) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };
  return {
    get: () => state,
    set: (next: T | ((prev: T) => T)) => {
      state = typeof next === 'function' ? (next as (prev: T) => T)(state) : next;
      listeners.forEach((l) => l());
    },
    use: () => useSyncExternalStore(subscribe, () => state),
  };
}
