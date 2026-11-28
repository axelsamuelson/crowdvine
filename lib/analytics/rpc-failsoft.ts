/**
 * Bounded RPC helpers for SSG/ISR popularity stats.
 *
 * Without a client budget, a slow live aggregate (pre-migration 318) waits on
 * Postgres statement_timeout (~8s+) per worker; parallel SSG then blows the
 * 60s page export limit even when callers fail-soft on the eventual error.
 */

export const SHOP_VIEW_RPC_BUDGET_MS = 2_500;
/** How long a failed/timed-out load sticks as empty before retrying. */
export const SHOP_VIEW_FAIL_SOFT_STICKY_MS = 60_000;

/** In-process single-flight + short sticky empty after timeout/error. */
export function createFailSoftLoader<T>(options: {
  label: string;
  empty: T;
  budgetMs?: number;
  stickyMs?: number;
  load: (signal: AbortSignal) => Promise<T>;
}): () => Promise<T> {
  const budgetMs = options.budgetMs ?? SHOP_VIEW_RPC_BUDGET_MS;
  const stickyMs = options.stickyMs ?? SHOP_VIEW_FAIL_SOFT_STICKY_MS;
  let inFlight: Promise<T> | null = null;
  /** Sticky fallback after a timed-out/failed load (cleared on success). */
  let stickyEmpty: T | null = null;
  let stickyUntil = 0;

  return async () => {
    if (stickyEmpty !== null && Date.now() < stickyUntil) {
      return stickyEmpty;
    }
    stickyEmpty = null;
    if (inFlight) return inFlight;

    inFlight = (async () => {
      const signal = AbortSignal.timeout(budgetMs);
      try {
        const value = await options.load(signal);
        stickyEmpty = null;
        stickyUntil = 0;
        return value;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error ?? "unknown");
        console.warn(`[${options.label}]`, message);
        stickyEmpty = options.empty;
        stickyUntil = Date.now() + stickyMs;
        return options.empty;
      } finally {
        inFlight = null;
      }
    })();

    return inFlight;
  };
}
