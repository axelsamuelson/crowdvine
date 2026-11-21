import { describe, expect, it } from "vitest";
import { resolveWineAbv } from "@/lib/product/wine-enrichment";
import { resolveWineAlcoholTaxCents } from "@/lib/wine-alcohol-tax";
import { resolveCustomerShippingQuote } from "@/lib/customer-shipping-pricing";

/**
 * Control: Les Chillois Pét-Nat style rows with wines.abv = NULL must not
 * break pricing, tax cents resolution, or shipping quotes. Checkout money
 * paths use base_price_cents / alcohol_tax_cents / bottle count — never ABV.
 */
describe("NULL wines.abv does not block checkout money paths", () => {
  it("resolveWineAbv returns null without throwing", () => {
    expect(resolveWineAbv(null, null)).toBeNull();
    expect(resolveWineAbv(undefined, undefined)).toBeNull();
    expect(resolveWineAbv("", "")).toBeNull();
  });

  it("alcohol tax cents still resolve when ABV is absent", () => {
    expect(resolveWineAlcoholTaxCents(null)).toBe(2219);
    expect(resolveWineAlcoholTaxCents(undefined)).toBe(2219);
    expect(resolveWineAlcoholTaxCents(0)).toBe(2219);
    expect(resolveWineAlcoholTaxCents(2500)).toBe(2500);
  });

  it("shipping quote for 6 bottles does not read ABV", () => {
    const rateBase = {
      id: "rate-1",
      countryCode: "SE",
      freeShipping: false,
      freeShippingThresholdCents: null,
      minBottles: null as number | null,
      maxBottles: null as number | null,
      active: true,
      validFrom: null,
      validTo: null,
    };

    const quote = resolveCustomerShippingQuote({
      channel: "pact",
      countryCode: "SE",
      bottleCount: 6,
      productSubtotalGrossCents: 100000,
      rates: [
        {
          ...rateBase,
          channel: "pact",
          flatFeeCents: 9900,
        },
      ],
      allowLegacyFallback: false,
    });
    expect(quote.complete).toBe(true);
    expect(quote.grossCents).toBe(9900);
    expect(quote.rateChannel).toBe("pact");

    const direct = resolveCustomerShippingQuote({
      channel: "direct_box",
      countryCode: "SE",
      bottleCount: 6,
      productSubtotalGrossCents: 100000,
      rates: [
        {
          ...rateBase,
          id: "rate-direct",
          channel: "direct_box",
          flatFeeCents: 14900,
          minBottles: 6,
        },
      ],
      allowLegacyFallback: false,
    });
    expect(direct.complete).toBe(true);
    expect(direct.grossCents).toBe(14900);
    expect(direct.rateChannel).toBe("direct_box");
  });
});
