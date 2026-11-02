import { useEffect, useState } from 'react';

/**
 * Current time that re-renders on an interval. Screens use it instead of calling Date.now()
 * during render, so time-based UI (lockouts, late-cancel warnings, allowed start times)
 * stays correct while the screen is open.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
