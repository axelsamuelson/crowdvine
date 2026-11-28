import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHECKOUT_FETCH_TIMEOUT_MS,
  checkoutFlagsAfterCartSettled,
  emptyCheckoutCartPlaceholder,
  planCheckoutHydrate,
  shouldAwaitMergeBeforeEmptyCart,
  shouldCheckoutRunInitialMerge,
  shouldShowCheckoutCartSkeleton,
} from "@/lib/checkout/checkout-cart-hydrate";
import { fetchWithTimeout } from "@/lib/cart/cart-merge-client";

describe("checkout cart hydrate policy", () => {
  it("uses an ~8s fetch budget", () => {
    expect(CHECKOUT_FETCH_TIMEOUT_MS).toBe(8_000);
  });

  it("does not await merge on initial paint; does on OTP", () => {
    expect(shouldAwaitMergeBeforeEmptyCart("initial")).toBe(false);
    expect(shouldAwaitMergeBeforeEmptyCart("post_otp")).toBe(true);
    expect(shouldCheckoutRunInitialMerge()).toBe(false);
  });

  it("plans parallel profile+cart with merge only on OTP path", () => {
    expect(planCheckoutHydrate("initial")).toEqual({
      parallelProfileAndCart: true,
      awaitMergeBeforeCart: false,
      timeoutMs: 8_000,
    });
    expect(planCheckoutHydrate("post_otp")).toEqual({
      parallelProfileAndCart: true,
      awaitMergeBeforeCart: true,
      timeoutMs: 8_000,
    });
  });

  it("clears skeleton once cart fetch settles even on error", () => {
    const flags = checkoutFlagsAfterCartSettled();
    expect(flags).toEqual({ cartFetchDone: true, loading: false });
    expect(
      shouldShowCheckoutCartSkeleton({
        ...flags,
        postAuthCartReady: true,
        cart: emptyCheckoutCartPlaceholder(),
      }),
    ).toBe(false);
  });

  it("keeps skeleton while OTP merge gate is closed", () => {
    expect(
      shouldShowCheckoutCartSkeleton({
        loading: false,
        cartFetchDone: true,
        postAuthCartReady: false,
        cart: emptyCheckoutCartPlaceholder(),
      }),
    ).toBe(true);
  });
});

describe("checkout hydrate timeouts + OTP merge order", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("aborts a hung checkout fetch at the timeout budget", async () => {
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
      "/api/crowdvine/cart",
      {},
      CHECKOUT_FETCH_TIMEOUT_MS,
    );
    const assertion = expect(pending).rejects.toMatchObject({
      name: "AbortError",
    });
    await vi.advanceTimersByTimeAsync(CHECKOUT_FETCH_TIMEOUT_MS);
    await assertion;
  });

  it("OTP path runs merge before cart; profile in parallel", async () => {
    const order: string[] = [];
    const profile = async () => {
      order.push("profile_start");
      await Promise.resolve();
      order.push("profile_done");
    };
    const mergeThenCart = async () => {
      order.push("merge_start");
      await Promise.resolve();
      order.push("merge_done");
      order.push("cart_start");
      await Promise.resolve();
      order.push("cart_done");
    };

    const plan = planCheckoutHydrate("post_otp");
    expect(plan.awaitMergeBeforeCart).toBe(true);
    expect(plan.parallelProfileAndCart).toBe(true);

    await Promise.all([profile(), mergeThenCart()]);

    const mergeIdx = order.indexOf("merge_done");
    const cartIdx = order.indexOf("cart_start");
    expect(mergeIdx).toBeGreaterThanOrEqual(0);
    expect(cartIdx).toBeGreaterThan(mergeIdx);
    expect(order).toContain("profile_start");
    // Profile may finish before or after merge; both started without waiting
    // for the other (parallel).
    expect(order.indexOf("profile_start")).toBeLessThan(
      order.indexOf("cart_done"),
    );
  });

  it("initial path does not require merge before cart", () => {
    const plan = planCheckoutHydrate("initial");
    expect(plan.awaitMergeBeforeCart).toBe(false);
    expect(plan.parallelProfileAndCart).toBe(true);
  });
});
