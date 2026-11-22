/**
 * Client helpers for cart merge + add-to-cart hydration.
 *
 * Merge is always fire-and-forget from CartProvider: add-to-cart never waits
 * on it. The server decides whether a real (non-anonymous) user exists —
 * guests get 200 `{ merged: false }` (not 401). Do not guess auth from
 * document.cookie (httpOnly sb-*-auth-token is invisible to JS).
 */

/** Finite budget for add-to-cart network calls (AC: no ~45s hang). */
export const ADD_TO_CART_FETCH_TIMEOUT_MS = 12_000;

/** Soft budget for background merge (never blocks add-to-cart). */
export const CART_MERGE_FETCH_TIMEOUT_MS = 8_000;

export type CartMergeInterpret =
  | { kind: "merged" }
  | { kind: "skip_silent" }
  | { kind: "error_silent" };

/**
 * Add-to-cart must never await / block on merge — guests or logged-in.
 * Merge runs in the background; hydrate/getCart proceed independently.
 */
export function shouldBlockAddToCartOnMerge(): boolean {
  return false;
}

/**
 * Map merge HTTP status (+ optional body) to client behaviour.
 * 401/403 and `{ merged: false }` must never surface as a customer error
 * or empty the cart.
 */
export function interpretCartMergeHttpStatus(
  status: number,
  body?: { merged?: boolean } | null,
): CartMergeInterpret {
  if (status === 401 || status === 403) return { kind: "skip_silent" };
  if (status >= 200 && status < 300) {
    if (body && body.merged === false) return { kind: "skip_silent" };
    return { kind: "merged" };
  }
  return { kind: "error_silent" };
}

/**
 * After merge settles, decide whether a hydrate/merge cart may replace
 * local cart state. Never let a late empty hydrate wipe lines that landed
 * via add-to-cart / cart-refresh while merge was in flight.
 *
 * Logged-in merge with httpOnly cookies: server still merges; client applies
 * the richer result when it arrives (no JS-visible sb- cookie required).
 */
export function shouldApplyHydratedCart(args: {
  incomingTotalQuantity: number;
  currentTotalQuantity: number;
  /** Epoch when this hydrate started. */
  hydrateEpoch: number;
  /** Latest mutation / refresh epoch (add, update, cart-refresh). */
  mutationEpoch: number;
}): boolean {
  const {
    incomingTotalQuantity,
    currentTotalQuantity,
    hydrateEpoch,
    mutationEpoch,
  } = args;

  // A newer local mutation happened after hydrate started — drop stale result
  // unless the server cart is richer (merge folded remote lines).
  if (mutationEpoch > hydrateEpoch) {
    if (incomingTotalQuantity > currentTotalQuantity) return true;
    return false;
  }

  // Same epoch: never replace a non-empty cart with empty from hydrate.
  if (currentTotalQuantity > 0 && incomingTotalQuantity <= 0) {
    return false;
  }

  return true;
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  const outer = init?.signal;
  if (outer) {
    if (outer.aborted) controller.abort();
    else outer.addEventListener("abort", onOuterAbort, { once: true });
  }
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    if (outer) outer.removeEventListener("abort", onOuterAbort);
  }
}
