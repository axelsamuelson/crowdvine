import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isDualOfferReviewCheckoutActive,
  mayRunLegacySharedPalletPaymentUi,
} from "@/lib/checkout/dual-offer-checkout-isolation";

/**
 * Layout guard for review-only /dev dual-offer page.
 * Ensures sticky-header clearance stays scoped to that surface
 * (pt-top-spacing / scroll-mt-top-spacing) without implying global header changes.
 */
describe("dual-offer /dev review layout clearance", () => {
  const pageSrc = readFileSync(
    resolve(process.cwd(), "app/dev/dual-offer-compare/page.tsx"),
    "utf8",
  );
  const localesSrc = readFileSync(
    resolve(process.cwd(), "app/dev/dual-offer-compare/review-locales.tsx"),
    "utf8",
  );

  it("scopes sticky clearance to dual-offer /dev page main", () => {
    expect(pageSrc).toMatch(/pt-top-spacing/);
    expect(pageSrc).toMatch(/data-testid="dual-offer-dev-main"/);
    expect(pageSrc).not.toMatch(/position:\s*fixed/);
  });

  it("gives locale row and panel scroll-margin under sticky chrome", () => {
    expect(localesSrc).toMatch(/scroll-mt-top-spacing/);
    expect(localesSrc).toMatch(/dual-offer-locale-row/);
  });

  it("does not weaken OFF-path payment isolation helpers", () => {
    expect(
      mayRunLegacySharedPalletPaymentUi({
        dualOfferCompareSurfaceAllowed: false,
        hasSelectedPallet: true,
        deliveryPreviewReady: true,
        zoneLoading: false,
      }),
    ).toBe(true);
    expect(
      isDualOfferReviewCheckoutActive({
        dualOfferCompareSurfaceAllowed: false,
        hasSelectedPallet: true,
        deliveryPreviewReady: true,
        zoneLoading: false,
      }),
    ).toBe(false);
  });
});
