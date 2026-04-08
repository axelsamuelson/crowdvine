const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 60;

const buckets = new Map<string, { windowStart: number; count: number }>();

/**
 * Simple fixed-window rate limit per API key. Best-effort on serverless (per instance).
 */
export function checkMcpRateLimit(apiKey: string): boolean {
  const now = Date.now();
  const b = buckets.get(apiKey);
  if (!b || now - b.windowStart >= WINDOW_MS) {
    buckets.set(apiKey, { windowStart: now, count: 1 });
    return true;
  }
  if (b.count >= MAX_PER_WINDOW) {
    return false;
  }
  b.count += 1;
  return true;
}
