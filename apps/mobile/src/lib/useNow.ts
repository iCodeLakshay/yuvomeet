import { useEffect, useState } from 'react';

/**
 * The current time as render state, refreshed every `intervalMs`. Use it instead of calling
 * Date.now() during render: the value stays stable within a render and time-based UI (late
 * warnings, "today" groupings, start-time validation) updates while the screen stays open.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}
