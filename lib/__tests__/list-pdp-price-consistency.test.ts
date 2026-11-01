import { describe, expect, it } from "vitest";
import {
  calculatePriceBreakdown,
  getProductListPriceSek,
} from "@/lib/price-breakdown";
import { formatPrice } from "@/lib/shopify/utils";

describe("PLP vs PDP list price consistency", () => {
  it("L 2023 (17380 öre) displays as 174 kr on both list and PDP paths", () => {
    const basePriceCents = 17380;
    const product = {
      priceBreakdown: { basePriceCents },
      priceRange: { minVariantPrice: { amount: "174" } },
    };

    const listSek = getProductListPriceSek(product);
    expect(listSek).toBe(173.8);
    expect(formatPrice(listSek!, "SEK")).toBe("174 kr");

    const breakdown = calculatePriceBreakdown(
      {
        cost_amount: 8,
        exchange_rate: 11.13,
        alcohol_tax_cents: 2219,
        margin_percentage: 20,
        base_price_cents: basePriceCents,
      },
      0,
    );

    // Must not leave 174.01 residue that ceils to 175 on PDP.
    expect(breakdown.listTotalInclVat).toBe(174);
    expect(breakdown.total).toBe(174);
    expect(formatPrice(breakdown.total, "SEK")).toBe("174 kr");
  });
});
