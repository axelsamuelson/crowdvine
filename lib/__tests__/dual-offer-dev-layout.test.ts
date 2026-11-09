import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isDualOfferReviewCheckoutActive,
  mayRunLegacySharedPalletPaymentUi,
} from "@/lib/checkout/dual-offer-checkout-isolation";
import {
  comparisonTextOverlapsHeaderBand,
  headerBandRect,
  rectsOverlap,
} from "@/lib/checkout/dual-offer-dev-header-overlap";

/**
 * Layout guard for review-only /dev dual-offer page.
 * Scrollport below fixed transparent header — content must not enter header band
 * at arbitrary scroll (not merely scroll-target clearance).
 */
describe("dual-offer /dev review layout clearance", () => {
  const pageSrc = readFileSync(
    resolve(process.cwd(), "app/dev/dual-offer-compare/page.tsx"),
    "utf8",
  );

  it("scopes an isolated scrollport below --top-spacing (review route only)", () => {
    expect(pageSrc).toMatch(/top-\[var\(--top-spacing\)\]/);
    expect(pageSrc).toMatch(/overflow-y-auto/);
    expect(pageSrc).toMatch(/data-testid="dual-offer-dev-main"/);
    // Must not rewrite ConditionalHeader / global header component.
    expect(pageSrc).not.toMatch(/ConditionalHeader/);
    expect(pageSrc).not.toMatch(/components\/layout\/header/);
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

describe("dual-offer header-band overlap detector (regression for e2e90c85)", () => {
  it("flags Shared avg-price row under MENY band (old failure mode)", () => {
    // Simulated 390 viewport: header chrome bottom ~48; avg-price row mid-band.
    const headerBottom = 48;
    const avgPriceRow = { top: 20, left: 16, right: 374, bottom: 44 };
    expect(
      comparisonTextOverlapsHeaderBand({
        headerBottom,
        viewportWidth: 390,
        comparisonRects: [avgPriceRow],
      }),
    ).toBe(true);
  });

  it("passes when all comparison rects sit strictly below the header band", () => {
    const headerBottom = 48;
    const avgPriceRow = { top: 88, left: 16, right: 374, bottom: 112 };
    const directHeading = { top: 400, left: 16, right: 374, bottom: 428 };
    expect(
      comparisonTextOverlapsHeaderBand({
        headerBottom,
        viewportWidth: 390,
        comparisonRects: [avgPriceRow, directHeading],
      }),
    ).toBe(false);
  });

  it("rejects target-only clearance that leaves another row overlapping", () => {
    const headerBottom = 48;
    const band = headerBandRect(headerBottom, 390);
    const clearedDirectHeading = {
      top: 64,
      left: 16,
      right: 374,
      bottom: 92,
    };
    const stillOverlappingAvg = {
      top: 12,
      left: 200,
      right: 360,
      bottom: 36,
    };
    expect(rectsOverlap(clearedDirectHeading, band)).toBe(false);
    expect(rectsOverlap(stillOverlappingAvg, band)).toBe(true);
    expect(
      comparisonTextOverlapsHeaderBand({
        headerBottom,
        viewportWidth: 390,
        comparisonRects: [clearedDirectHeading, stillOverlappingAvg],
      }),
    ).toBe(true);
  });
});
