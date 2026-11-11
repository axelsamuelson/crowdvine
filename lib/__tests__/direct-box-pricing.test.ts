import { describe, expect, it } from "vitest";
import {
  DIRECT_BOX_DEFAULT_MARKUP_PERCENT,
  directBoxCountFromBottles,
  directBoxLineTotalSek,
  directBoxShippingSek,
  directBoxUnitPriceSek,
  getDirectBoxPriceMarkupPercent,
} from "@/lib/commerce/direct-box-pricing";
import { resolveCustomerShippingQuote } from "@/lib/customer-shipping-pricing";
import { buildSyntheticDirectOfferFromShared } from "@/lib/checkout/offer-quote";
import type { OfferQuote } from "@/lib/checkout/offer-quote";

describe("direct-box bottle markup", () => {
  it("defaults markup to 5% from env helper", () => {
    expect(getDirectBoxPriceMarkupPercent({})).toBe(
      DIRECT_BOX_DEFAULT_MARKUP_PERCENT,
    );
    expect(getDirectBoxPriceMarkupPercent({ DIRECT_BOX_PRICE_MARKUP_PERCENT: "5" })).toBe(
      5,
    );
    expect(
      getDirectBoxPriceMarkupPercent({ DIRECT_BOX_PRICE_MARKUP_PERCENT: "7" }),
    ).toBe(7);
  });

  it("rounds whole kronor per bottle (1 box)", () => {
    // 179 → 179 * 1.05 = 187.95 → 188
    expect(directBoxUnitPriceSek(179, 5)).toBe(188);
    expect(directBoxLineTotalSek(179, 6, 5)).toBe(188 * 6);
  });

  it("2 boxes: unit markup independent of quantity", () => {
    expect(directBoxUnitPriceSek(100, 5)).toBe(105);
    expect(directBoxLineTotalSek(100, 12, 5)).toBe(105 * 12);
  });

  it("mixed catalog prices round per bottle then sum", () => {
    const a = directBoxUnitPriceSek(99, 5); // 103.95 → 104
    const b = directBoxUnitPriceSek(150, 5); // 157.5 → 158
    expect(a).toBe(104);
    expect(b).toBe(158);
    expect(a * 3 + b * 3).toBe(104 * 3 + 158 * 3);
  });
});

describe("direct-box shipping per box", () => {
  it("1 box = 149 SEK, 2 boxes = 298 SEK", () => {
    expect(directBoxCountFromBottles(6)).toBe(1);
    expect(directBoxCountFromBottles(12)).toBe(2);
    expect(directBoxShippingSek({ bottleCount: 6 }).shippingSek).toBe(149);
    expect(directBoxShippingSek({ bottleCount: 12 }).shippingSek).toBe(298);
    expect(directBoxShippingSek({ bottleCount: 7 }).complete).toBe(false);
  });

  it("customer_shipping_rates multiplies flat fee by boxes for direct_box", () => {
    const rate = {
      id: "r1",
      channel: "direct_box" as const,
      countryCode: "SE",
      flatFeeCents: 14900,
      freeShipping: false,
      freeShippingThresholdCents: null,
      minBottles: 6,
      maxBottles: null,
      active: true,
      validFrom: null,
      validTo: null,
    };
    const one = resolveCustomerShippingQuote({
      channel: "direct_box",
      countryCode: "SE",
      bottleCount: 6,
      rates: [rate],
      allowLegacyFallback: false,
    });
    expect(one.complete).toBe(true);
    expect(one.grossCents).toBe(14900);

    const two = resolveCustomerShippingQuote({
      channel: "direct_box",
      countryCode: "SE",
      bottleCount: 12,
      rates: [rate],
      allowLegacyFallback: false,
    });
    expect(two.grossCents).toBe(29800);
  });
});

describe("direct offer from shared uses live 5% markup", () => {
  it("replaces retired 1.12 uplift", () => {
    const shared = {
      offer: "shared_pallet",
      quote_id: "q1",
      bottle_count: 6,
      wine_lines: [
        {
          wine_id: "w1",
          quantity: 6,
          unit_price_sek: 100,
          line_total_sek: 600,
        },
      ],
      subtotal_sek: 600,
      shipping_sek: 99,
      promo_discount_sek: 0,
      voucher_discount_sek: 0,
      pact_points_sek: 0,
      pact_points_redeem: 0,
      total_sek: 699,
      total_ore: 69900,
      destination_country: "SE",
      destination_zone_id: null,
      pricing_source: "live_catalog",
      user_id: null,
      cart_id: "c1",
      computed_at: new Date().toISOString(),
      valid_until: new Date().toISOString(),
      unavailable_reason: null,
    } as unknown as OfferQuote;

    const direct = buildSyntheticDirectOfferFromShared({
      shared,
      markupPercent: 5,
      shippingPerBoxSek: 149,
    });
    // Compare helper stays synthetic (no live Pay); money uses 5% markup.
    expect(direct.pricing_source).toBe("synthetic_fixture");
    expect(direct.wine_lines[0]!.unit_price_sek).toBe(105);
    expect(direct.shipping_sek).toBe(149);
    // Must not be the old 1.12 × 100 = 112
    expect(direct.wine_lines[0]!.unit_price_sek).not.toBe(112);
  });
});
