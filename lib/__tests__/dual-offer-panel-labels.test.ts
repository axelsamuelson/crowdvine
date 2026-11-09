import { describe, expect, it } from "vitest";
import {
  buildOfferQuote,
  type OfferLineSnapshot,
} from "@/lib/checkout/offer-quote";
import type { CheckoutQuote } from "@/lib/checkout/checkout-quote";
import {
  formatOfferSek,
  isMixedBottleBasket,
} from "@/lib/checkout/dual-offer-display";

function money(): CheckoutQuote {
  return {
    subtotal_sek: 1190,
    shipping_sek: 99,
    promo_discount_sek: 0,
    voucher_discount_sek: 0,
    pact_points_sek: 0,
    pact_points_redeem: 0,
    total_sek: 1289,
    total_ore: 128900,
    shipping_pending: false,
    fulfillment_channel: "shared_pallet",
    rate_channel: "pact",
  };
}

describe("dual-offer bottle label honesty", () => {
  it("detects mixed basket and computes cart-weighted average", () => {
    const wine_lines: OfferLineSnapshot[] = [
      {
        wine_id: "a",
        quantity: 6,
        unit_price_sek: 145,
        line_total_sek: 870,
      },
      {
        wine_id: "b",
        quantity: 2,
        unit_price_sek: 160,
        line_total_sek: 320,
      },
    ];
    const quote = buildOfferQuote({
      offer: "shared_pallet",
      money: money(),
      wine_lines,
      destination_country: "SE",
      pricing_source: "synthetic_fixture",
      user_id: "u",
      cart_id: "c",
    });
    expect(isMixedBottleBasket(quote)).toBe(true);
    // 1190 / 8 = 148.75
    expect(quote.bottle_unit_price_sek).toBe(148.75);
  });

  it("uniform basket is not mixed", () => {
    const wine_lines: OfferLineSnapshot[] = [
      {
        wine_id: "a",
        quantity: 6,
        unit_price_sek: 145,
        line_total_sek: 870,
      },
    ];
    const quote = buildOfferQuote({
      offer: "shared_pallet",
      money: {
        ...money(),
        subtotal_sek: 870,
        total_sek: 969,
        total_ore: 96900,
      },
      wine_lines,
      destination_country: "SE",
      pricing_source: "synthetic_fixture",
      user_id: "u",
      cart_id: "c",
    });
    expect(isMixedBottleBasket(quote)).toBe(false);
    expect(quote.bottle_unit_price_sek).toBe(145);
  });

  it("formats SEK as whole kronor (no ,00)", () => {
    const s = formatOfferSek(1283, "sv");
    expect(s).toMatch(/1[\s\u00a0]?283/);
    expect(s).toMatch(/kr|SEK/i);
    expect(s).not.toMatch(/,00|\.00/);
    expect(formatOfferSek(1283.4, "en")).not.toMatch(/\.00|,00/);
  });
});
