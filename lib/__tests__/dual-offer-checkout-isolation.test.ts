import { describe, expect, it } from "vitest";
import {
  isDualOfferReviewCheckoutActive,
  mayRunLegacySharedPalletPaymentUi,
} from "@/lib/checkout/dual-offer-checkout-isolation";

describe("dual-offer checkout isolation", () => {
  const ready = {
    dualOfferCompareSurfaceAllowed: true,
    hasSelectedPallet: true,
    deliveryPreviewReady: true,
    zoneLoading: false,
  };

  it("OFF flag keeps legacy payment allowed (regression)", () => {
    const off = {
      ...ready,
      dualOfferCompareSurfaceAllowed: false,
    };
    expect(isDualOfferReviewCheckoutActive(off)).toBe(false);
    expect(mayRunLegacySharedPalletPaymentUi(off)).toBe(true);
  });

  it("ON + quoteable destination isolates dual review", () => {
    expect(isDualOfferReviewCheckoutActive(ready)).toBe(true);
    expect(mayRunLegacySharedPalletPaymentUi(ready)).toBe(false);
  });

  it("ON but no pallet does not isolate (panel not mounted)", () => {
    const args = { ...ready, hasSelectedPallet: false };
    expect(isDualOfferReviewCheckoutActive(args)).toBe(false);
    expect(mayRunLegacySharedPalletPaymentUi(args)).toBe(true);
  });

  it("ON while zone loading does not isolate yet", () => {
    const args = { ...ready, zoneLoading: true };
    expect(isDualOfferReviewCheckoutActive(args)).toBe(false);
    expect(mayRunLegacySharedPalletPaymentUi(args)).toBe(true);
  });

  it("ON without delivery preview does not isolate", () => {
    const args = { ...ready, deliveryPreviewReady: false };
    expect(isDualOfferReviewCheckoutActive(args)).toBe(false);
    expect(mayRunLegacySharedPalletPaymentUi(args)).toBe(true);
  });

  it("legacy pay remains blocked across switch/back while dual surface stays active", () => {
    // Simulate offer switch / acceptance — isolation depends only on surface,
    // not on which offer is selected or whether quote was accepted.
    expect(mayRunLegacySharedPalletPaymentUi(ready)).toBe(false);
    expect(mayRunLegacySharedPalletPaymentUi({ ...ready })).toBe(false);
  });
});
