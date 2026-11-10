import { describe, expect, it } from "vitest";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";

describe("dual-offer surface gate", () => {
  it("defaults OFF when flag unset", () => {
    expect(isDualOfferCheckoutSurfaceAllowed({})).toBe(false);
    expect(
      isDualOfferCheckoutSurfaceAllowed({ NODE_ENV: "development" }),
    ).toBe(false);
  });

  it("allows local development when flag ON", () => {
    expect(
      isDualOfferCheckoutSurfaceAllowed({
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
        NODE_ENV: "development",
      }),
    ).toBe(true);
  });

  it("allows Vercel preview when flag ON", () => {
    expect(
      isDualOfferCheckoutSurfaceAllowed({
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
      }),
    ).toBe(true);
  });

  it("denies production even when flag ON", () => {
    expect(
      isDualOfferCheckoutSurfaceAllowed({
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
        NODE_ENV: "production",
        VERCEL_ENV: "production",
      }),
    ).toBe(false);
    expect(
      isDualOfferCheckoutSurfaceAllowed({
        CHECKOUT_DUAL_OFFER_COMPARE: "true",
        NODE_ENV: "production",
      }),
    ).toBe(false);
  });
});
