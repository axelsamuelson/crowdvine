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
  intersectRects,
  rectsOverlap,
} from "@/lib/checkout/dual-offer-dev-header-overlap";

/**
 * Layout guard for review-only /dev dual-offer page.
 * Scrollport + opaque shield below/under fixed transparent header — content must
 * not visually enter the header band at arbitrary scroll.
 */
describe("dual-offer /dev review layout clearance", () => {
  const pageSrc = readFileSync(
    resolve(process.cwd(), "app/dev/dual-offer-compare/page.tsx"),
    "utf8",
  );

  it("scopes scrollport + opaque header shield to the review route only", () => {
    expect(pageSrc).toMatch(/top-\[var\(--top-spacing\)\]/);
    expect(pageSrc).toMatch(/overflow-y-auto/);
    expect(pageSrc).toMatch(/data-testid="dual-offer-dev-main"/);
    expect(pageSrc).toMatch(/data-testid="dual-offer-dev-header-shield"/);
    expect(pageSrc).toMatch(/h-\[var\(--top-spacing\)\]/);
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
  const scrollport = { top: 64, left: 0, right: 390, bottom: 844 };

  it("flags Shared avg-price row under MENY when it is visible in the header band", () => {
    // Document-scroll failure mode: avg-price painted at y=20 under transparent header.
    const bodyScrollport = { top: 0, left: 0, right: 390, bottom: 844 };
    const avgPriceRow = { top: 20, left: 16, right: 374, bottom: 44 };
    expect(
      comparisonTextOverlapsHeaderBand({
        headerBottom: 48,
        viewportWidth: 390,
        scrollportRect: bodyScrollport,
        comparisonRects: [avgPriceRow],
      }),
    ).toBe(true);
  });

  it("ignores overflow-clipped panel boxes that extend above the scrollport", () => {
    // Tall panel getBoundingClientRect can span above main.top after inner scroll;
    // only the visible ∩ scrollport portion counts.
    const tallPanel = { top: -149, left: 16, right: 374, bottom: 1141 };
    const visible = intersectRects(tallPanel, scrollport);
    expect(visible?.top).toBe(64);
    expect(
      comparisonTextOverlapsHeaderBand({
        headerBottom: 48,
        viewportWidth: 390,
        scrollportRect: scrollport,
        comparisonRects: [tallPanel],
      }),
    ).toBe(false);
  });

  it("passes when visible comparison rects sit strictly below the header band", () => {
    const avgPriceRow = { top: 98, left: 16, right: 374, bottom: 118 };
    const directHeading = { top: 400, left: 16, right: 374, bottom: 428 };
    expect(
      comparisonTextOverlapsHeaderBand({
        headerBottom: 48,
        viewportWidth: 390,
        scrollportRect: scrollport,
        comparisonRects: [avgPriceRow, directHeading],
      }),
    ).toBe(false);
  });

  it("rejects target-only clearance that leaves another visible row overlapping", () => {
    const headerBottom = 48;
    const band = headerBandRect(headerBottom, 390);
    const bodyScrollport = { top: 0, left: 0, right: 390, bottom: 844 };
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
        scrollportRect: bodyScrollport,
        comparisonRects: [clearedDirectHeading, stillOverlappingAvg],
      }),
    ).toBe(true);
  });
});
