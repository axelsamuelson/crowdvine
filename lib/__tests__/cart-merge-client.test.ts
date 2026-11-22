import { describe, expect, it, vi, afterEach } from "vitest";
import {
  ADD_TO_CART_FETCH_TIMEOUT_MS,
  CART_MERGE_FETCH_TIMEOUT_MS,
  fetchWithTimeout,
  interpretCartMergeHttpStatus,
  shouldApplyHydratedCart,
  shouldBlockAddToCartOnMerge,
} from "@/lib/cart/cart-merge-client";

describe("cart-merge-client — guest never blocked", () => {
  it("never blocks add-to-cart on merge (guest or logged-in)", () => {
    expect(shouldBlockAddToCartOnMerge()).toBe(false);
  });

  it("treats guest 200 { merged: false } as silent skip", () => {
    expect(interpretCartMergeHttpStatus(200, { merged: false })).toEqual({
      kind: "skip_silent",
    });
  });

  it("treats legacy 401/403 as silent skip (never customer error / cart wipe)", () => {
    expect(interpretCartMergeHttpStatus(401)).toEqual({ kind: "skip_silent" });
    expect(interpretCartMergeHttpStatus(403)).toEqual({ kind: "skip_silent" });
    expect(interpretCartMergeHttpStatus(500)).toEqual({ kind: "error_silent" });
  });

  it("treats logged-in 200 merge as merged (httpOnly cookies invisible to JS)", () => {
    // Client cannot see sb-*-auth-token (httpOnly). Server still merges;
    // client only interprets the response — no document.cookie guest guess.
    expect(interpretCartMergeHttpStatus(200, { merged: true })).toEqual({
      kind: "merged",
    });
    expect(interpretCartMergeHttpStatus(200, {})).toEqual({ kind: "merged" });
  });
});

describe("cart-merge-client — hydrate race + logged-in merge apply", () => {
  it("does not apply empty hydrate over a cart filled while merge was in flight", () => {
    expect(
      shouldApplyHydratedCart({
        incomingTotalQuantity: 0,
        currentTotalQuantity: 6,
        hydrateEpoch: 0,
        mutationEpoch: 1,
      }),
    ).toBe(false);
  });

  it("applies logged-in merge result when server cart is richer (httpOnly path)", () => {
    // Guest added 6 → login → merge returns 6 (or more) while JS still has
    // empty/stale qty from a parallel getCart that raced ahead.
    expect(
      shouldApplyHydratedCart({
        incomingTotalQuantity: 6,
        currentTotalQuantity: 0,
        hydrateEpoch: 0,
        mutationEpoch: 0,
      }),
    ).toBe(true);
    expect(
      shouldApplyHydratedCart({
        incomingTotalQuantity: 12,
        currentTotalQuantity: 6,
        hydrateEpoch: 0,
        mutationEpoch: 1,
      }),
    ).toBe(true);
  });

  it("applies normal hydrate when no mutation raced", () => {
    expect(
      shouldApplyHydratedCart({
        incomingTotalQuantity: 0,
        currentTotalQuantity: 0,
        hydrateEpoch: 0,
        mutationEpoch: 0,
      }),
    ).toBe(true);
  });
});

describe("cart-merge-client — timeouts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("exposes a finite add-to-cart timeout under 45s", () => {
    expect(ADD_TO_CART_FETCH_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000);
    expect(ADD_TO_CART_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(20_000);
    expect(CART_MERGE_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(15_000);
  });

  it("aborts fetchWithTimeout when the budget elapses", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const pending = fetchWithTimeout(
      "/api/cart/simple-add",
      { method: "POST" },
      100,
    );
    const assertion = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(100);
    await assertion;
  });
});
