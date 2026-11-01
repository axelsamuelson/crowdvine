import { describe, expect, it, vi } from "vitest";
import {
  b2bExclVatSekToUnitPriceCents,
  cartLineB2bLineTotalExclVat,
  cartLineB2bUnitPriceExclVat,
  computeInquiryB2bUnitPriceExclVatSek,
  inquiryLineTotalExclVatSek,
} from "@/lib/b2b/inquiry-price-math";
import { priceExclVat } from "@/lib/shopify/utils";

vi.mock("@/lib/exchange-rate-strict", () => ({
  fetchExchangeRateToSekStrict: vi.fn(async () => null),
}));

vi.mock("@/lib/b2b-pallet-stock", () => ({
  B2B_PALLET_ITEM_STOCK_SELECT: "wine_id",
  aggregateB2BPalletStockWithFullPalletTotals: vi.fn(async () => ({
    stockMap: new Map(),
    shippingMap: new Map([["wine-resiste", 0]]),
  })),
}));

import { applyServerInquiryLinePrices } from "@/lib/b2b/inquiry-pricing";

describe("inquiry B2B pricing (card price, not B2C/1.25)", () => {
  it("uses b2bPriceExclVat from the product card — not retail incl. VAT / 1.25", () => {
    // Production bug: Résiste 2025 retail 157 incl. → priceExclVat ≈ 126
    const retailInclVat = 157;
    expect(Math.round(priceExclVat(retailInclVat))).toBe(126);

    const cardB2bExcl = cartLineB2bUnitPriceExclVat({
      b2bPriceExclVat: 132,
    });
    expect(cardB2bExcl).toBe(132);
    expect(b2bExclVatSekToUnitPriceCents(cardB2bExcl!)).toBe(13200);
    expect(inquiryLineTotalExclVatSek(cardB2bExcl!, 6)).toBe(792);
    // Cart drawer / inquiry: 1 bottle shows 132, not 126
    expect(
      cartLineB2bLineTotalExclVat({ b2bPriceExclVat: 132 }, 1),
    ).toBe(132);
  });

  it("reads b2bPriceExclVat from priceBreakdown when top-level missing", () => {
    expect(
      cartLineB2bUnitPriceExclVat({
        priceBreakdown: { b2bPriceExclVat: 132 },
      }),
    ).toBe(132);
  });

  it("computes rounded B2B unit price matching the shop card (132 kr case)", () => {
    // (70 + 22.19) / (1 - 0.30) = 131.7 → Math.round → 132
    const unit = computeInquiryB2bUnitPriceExclVatSek({
      costAmount: 70,
      exchangeRate: 1,
      alcoholTaxCents: 2219,
      b2bMarginPercentage: 30,
      shippingPerBottleSek: 0,
    });
    expect(unit).toBe(132);
    expect(b2bExclVatSekToUnitPriceCents(unit!)).toBe(13200);
  });

  it("applyServerInquiryLinePrices ignores client unitPriceCents", async () => {
    const winesSelect = vi.fn().mockReturnValue({
      in: async () => ({
        data: [
          {
            id: "wine-resiste",
            wine_name: "Résiste",
            vintage: "2025",
            cost_amount: 70,
            cost_currency: "SEK",
            exchange_rate: 1,
            alcohol_tax_cents: 2219,
            b2b_margin_percentage: 30,
          },
        ],
        error: null,
      }),
    });
    const sb = {
      from: vi.fn((table: string) => {
        if (table === "wines") return { select: winesSelect };
        if (table === "b2b_pallet_shipment_items") {
          return {
            select: () => ({
              in: () => ({
                eq: async () => ({ data: [], error: null }),
              }),
            }),
          };
        }
        return {};
      }),
    };

    const priced = await applyServerInquiryLinePrices(sb as never, [
      {
        wineId: "wine-resiste",
        wineTitle: "Résiste 2025",
        quantity: 6,
        // Client wrongly sent B2C/1.25 (126 kr)
        unitPriceCents: 12600,
      },
    ]);

    expect(priced).toHaveLength(1);
    expect(priced[0].unitPriceCents).toBe(13200);
    expect(priced[0].quantity).toBe(6);
  });
});
