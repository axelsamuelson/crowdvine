import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackEvent = vi.fn();

vi.mock("@/lib/analytics/event-tracker", () => ({
  AnalyticsTracker: {
    trackEvent: (...args: unknown[]) => trackEvent(...args),
  },
}));

import {
  trackCheckoutStepBlocked,
  trackShippingQuoteFailed,
  trackShippingPreviewFailed,
} from "@/lib/analytics/checkout-block-events";
import { resetEmitOnceForTests } from "@/lib/analytics/emit-once";

function installSessionStorageMock() {
  const store = new Map<string, string>();
  const mock: Storage = {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
  vi.stubGlobal("sessionStorage", mock);
  vi.stubGlobal("window", { sessionStorage: mock });
}

describe("checkout block / shipping quote analytics", () => {
  beforeEach(() => {
    installSessionStorageMock();
    resetEmitOnceForTests();
    trackEvent.mockReset();
    trackEvent.mockResolvedValue(undefined);
  });

  afterEach(() => {
    resetEmitOnceForTests();
    vi.unstubAllGlobals();
  });

  it("emits checkout_step_blocked once per session/step/reason", () => {
    expect(
      trackCheckoutStepBlocked({
        step: "age_terms",
        reason: "missing_phone",
      }),
    ).toBe(true);
    expect(
      trackCheckoutStepBlocked({
        step: "age_terms",
        reason: "missing_phone",
      }),
    ).toBe(false);
    expect(
      trackCheckoutStepBlocked({
        step: "age_terms",
        reason: "quote_missing",
      }),
    ).toBe(true);

    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent.mock.calls[0][0]).toMatchObject({
      eventType: "checkout_step_blocked",
      eventCategory: "checkout",
      metadata: { step: "age_terms", reason: "missing_phone" },
    });
    expect(trackEvent.mock.calls[1][0]).toMatchObject({
      eventType: "checkout_step_blocked",
      metadata: { step: "age_terms", reason: "quote_missing" },
    });
  });

  it("emits shipping_quote_failed with delivery_type + reason", () => {
    expect(
      trackShippingQuoteFailed({
        deliveryType: "direct_box",
        reason: "quote_error",
      }),
    ).toBe(true);
    expect(
      trackShippingQuoteFailed({
        deliveryType: "direct_box",
        reason: "quote_error",
      }),
    ).toBe(false);

    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent.mock.calls[0][0]).toMatchObject({
      eventType: "shipping_quote_failed",
      eventCategory: "checkout",
      metadata: {
        delivery_type: "direct_box",
        reason: "quote_error",
      },
    });
  });

  it("accepts auth_required / quote_timeout / quote_stale reason codes", () => {
    expect(
      trackShippingQuoteFailed({
        deliveryType: "shared_pallet",
        reason: "auth_required",
      }),
    ).toBe(true);
    expect(
      trackShippingQuoteFailed({
        deliveryType: "shared_pallet",
        reason: "quote_timeout",
      }),
    ).toBe(true);
    expect(
      trackCheckoutStepBlocked({
        step: "payment",
        reason: "quote_stale",
      }),
    ).toBe(true);
    expect(trackEvent.mock.calls.map((c) => c[0].metadata.reason)).toEqual([
      "auth_required",
      "quote_timeout",
      "quote_stale",
    ]);
  });

  it("sanitizes free-text reason to unknown (no PII)", () => {
    trackShippingQuoteFailed({
      deliveryType: "shared_pallet",
      reason: "user@example.com failed",
    });
    expect(trackEvent.mock.calls[0][0].metadata.reason).toBe("unknown");
  });

  it("emits shipping_preview_failed once per session+reason (E9)", () => {
    sessionStorage.setItem("analytics_session_id", "session_test_e9");
    expect(
      trackShippingPreviewFailed({
        deliveryType: "all",
        reason: "preview_error",
      }),
    ).toBe(true);
    expect(
      trackShippingPreviewFailed({
        deliveryType: "all",
        reason: "preview_error",
      }),
    ).toBe(false);
    expect(
      trackShippingPreviewFailed({
        deliveryType: "direct_box",
        reason: "preview_timeout",
      }),
    ).toBe(true);

    expect(trackEvent).toHaveBeenCalledTimes(2);
    expect(trackEvent.mock.calls[0][0]).toMatchObject({
      eventType: "shipping_preview_failed",
      eventCategory: "checkout",
      metadata: { delivery_type: "all", reason: "preview_error" },
    });
    expect(trackEvent.mock.calls[1][0].metadata).toMatchObject({
      delivery_type: "direct_box",
      reason: "preview_timeout",
    });
  });

  it("sanitizes shipping_preview_failed free-text and bad delivery_type", () => {
    trackShippingPreviewFailed({
      deliveryType: "postal-12345",
      reason: "Stockholm SE-11122",
    });
    expect(trackEvent.mock.calls[0][0].metadata).toEqual({
      delivery_type: "all",
      reason: "unknown",
    });
  });
});
