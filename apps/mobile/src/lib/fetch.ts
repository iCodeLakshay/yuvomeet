/**
 * fetch with a timeout, so a stalled request fails instead of spinning forever. Storage
 * uploads are exempt: a photo on a slow connection can legitimately take longer.
 */
const REQUEST_TIMEOUT_MS = 30_000;

export function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  if (init?.signal || url.includes('/storage/v1/')) return fetch(input, init);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}
