import { describe, expect, it } from "vitest";
import {
  calculateB2BPriceBreakdown,
  calculateB2BPriceExclVat,
  calculateRoundedB2BPriceExclVat,
  roundB2BPriceExclVatSek,
} from "@/lib/price-breakdown";
import { roundAmountForDisplay } from "@/lib/shopping-context/format";
import { priceExclVat } from "@/lib/shopify/utils";

describe("B2B price display consistency", () => {
  it("rounds 147.2 SEK the same way as admin (not ceil to 148)", () => {
    const raw = 147.2;
    expect(roundB2BPriceExclVatSek(raw)).toBe(147);
    expect(roundAmountForDisplay(raw, "SEK", "round")).toBe(147);
    expect(roundAmountForDisplay(raw, "SEK", "ceil")).toBe(148);
  });

  it("matches admin whole-SEK B2B price for 20% margin", () => {
    // cost 8 EUR * 11.25 + 22.19 tax → 112.19; / 0.8 = 140.2375 → 140
    const raw = calculateB2BPriceExclVat(8, 11.25, 2219, 20, 0);
    const rounded = calculateRoundedB2BPriceExclVat(8, 11.25, 2219, 20, 0);
    expect(rounded).toBe(Math.round(raw));
    expect(roundAmountForDisplay(rounded, "SEK", "round")).toBe(rounded);
  });

  it("keeps B2C öre→exkl conversion without ceil-on-inkl drift", () => {
    // Admin 20% → 147 exkl → 183.75 inkl → 18375 öre
    const basePriceCents = 18375;
    const excl = priceExclVat(basePriceCents / 100);
    expect(excl).toBe(147);
    // Old PDP path: ceil(öre/100)/1.25 → 147.2 → ceil display 148
    const oldPath = Math.ceil(basePriceCents / 100) / 1.25;
    expect(oldPath).toBe(147.2);
    expect(roundAmountForDisplay(oldPath, "SEK", "ceil")).toBe(148);
    expect(roundAmountForDisplay(excl, "SEK", "round")).toBe(147);
  });

  it("B2B breakdown total stays 147 for Up Tempo inputs (not 147.01 → ceil 148)", () => {
    const breakdown = calculateB2BPriceBreakdown(
      147,
      8,
      11.13,
      2219,
      20,
      0,
      6.666666666666667,
    );
    expect(breakdown.total).toBe(147);
    expect(roundAmountForDisplay(breakdown.total, "SEK", "round")).toBe(147);
    // Regression: component ceils used to produce 147.01
    expect(roundAmountForDisplay(147.01, "SEK", "ceil")).toBe(148);
  });
});
