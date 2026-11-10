import { describe, expect, it } from "vitest";
import {
  isDualOfferReviewCheckoutActive,
  mayRunLegacySharedPalletPaymentUi,
  mayStartSharedPalletCardSave,
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

  it("ON + quoteable destination isolates until buy unlocks card step", () => {
    expect(isDualOfferReviewCheckoutActive(ready)).toBe(true);
    expect(mayRunLegacySharedPalletPaymentUi(ready)).toBe(false);
    expect(
      mayRunLegacySharedPalletPaymentUi({
        ...ready,
        sharedPalletCardStepUnlocked: true,
      }),
    ).toBe(true);
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

  it("card step stays locked across switch/back until buy unlocks", () => {
    expect(mayRunLegacySharedPalletPaymentUi(ready)).toBe(false);
    expect(mayRunLegacySharedPalletPaymentUi({ ...ready })).toBe(false);
  });
});

describe("mayStartSharedPalletCardSave", () => {
  it("allows live shared_pallet only", () => {
    expect(
      mayStartSharedPalletCardSave({
        offer: "shared_pallet",
        pricing_source: "live_catalog",
      }),
    ).toBe(true);
  });

  it("denies synthetic, direct, and unavailable quotes", () => {
    expect(
      mayStartSharedPalletCardSave({
        offer: "shared_pallet",
        pricing_source: "synthetic_fixture",
      }),
    ).toBe(false);
    expect(
      mayStartSharedPalletCardSave({
        offer: "direct_box",
        pricing_source: "live_catalog",
      }),
    ).toBe(false);
    expect(
      mayStartSharedPalletCardSave({
        offer: "shared_pallet",
        pricing_source: "live_catalog",
        unavailable_reason: "shipping_pending",
      }),
    ).toBe(false);
  });
});
