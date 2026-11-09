/**
 * Pricing consolidation — B2C list unit is one half-up whole-kronor source
 * (`b2cWholeKronorFromOre`). Remaining TODOs are FX / B2B / Systembolaget only.
 *
 * Formula / FX surfaces still diverge (documented below):
 * - wine-retail-pricing vs b2b-wine-cost FX fallback when rate missing
 * - B2B unrounded (pallet commercial) vs Math.round (shop / inquiry)
 * - Systembolaget fixed 14.7% margin vs PACT B2C margin + VAT path
 */
import { describe, expect, it } from "vitest";
import { b2cWholeKronorFromOre } from "@/lib/cart/b2c-line-pricing";
import { computeB2bCustomerUnitPriceExclVatSek } from "@/lib/b2b-pallet-commercial";
import { computeInquiryB2bUnitPriceExclVatSek } from "@/lib/b2b/inquiry-price-math";
import { getEffectiveExchangeRate } from "@/lib/b2b-wine-cost";
import {
  calculateB2BPriceExclVat,
  calculatePriceBreakdown,
  calculateRoundedB2BPriceExclVat,
} from "@/lib/price-breakdown";
import { calculateSystembolagetPrice } from "@/lib/systembolaget-pricing";
import {
  calculateRetailPriceCents,
  resolveSekExchangeRateSync,
} from "@/lib/wine-retail-pricing";
import { wineById } from "@/lib/__tests__/fixtures/pricing-golden-wines";

/** Canonical B2C list unit (PLP / PDP / producer / cart / charge). */
function listPriceSek(basePriceCents: number): number {
  return b2cWholeKronorFromOre(basePriceCents);
}

describe("pricing surfaces after whole-kronor B2C unit prices", () => {
  describe("PLP / PDP / producer agree on stored whole kronor", () => {
    it("A Love Supreme 15600 öre → 156 SEK on PLP, PDP, and producer", () => {
      const { base_price_cents: cents } = wineById("a-love-supreme-2024");
      expect(listPriceSek(cents)).toBe(156);
    });

    it("Hippie Killer 13000 öre → 130 SEK everywhere", () => {
      const { base_price_cents: cents } = wineById("hippie-killer-2023");
      expect(listPriceSek(cents)).toBe(130);
    });

    it("Up Tempo 17400 öre → 174 SEK everywhere", () => {
      const { base_price_cents: cents } = wineById("up-tempo-2024");
      expect(listPriceSek(cents)).toBe(174);
    });

    it("fractional öre: 29326 → 293 everywhere (not ceil 294)", () => {
      expect(listPriceSek(29326)).toBe(293);
      expect(listPriceSek(31000)).toBe(310);
    });

    it("price-breakdown B2C list total matches binding whole-kronor unit", () => {
      const wine = wineById("a-love-supreme-2024");
      const breakdown = calculatePriceBreakdown({
        cost_amount: wine.cost_amount,
        exchange_rate: wine.exchange_rate,
        alcohol_tax_cents: wine.alcohol_tax_cents,
        margin_percentage: wine.margin_percentage,
        base_price_cents: wine.base_price_cents,
      });

      expect(breakdown.listTotalInclVat).toBe(156);
      expect(breakdown.listTotalInclVat).toBe(
        listPriceSek(wine.base_price_cents),
      );
    });
  });

  describe("FX fallback: retail hardcoded map vs b2b-wine-cost → 1", () => {
    it("missing EUR rate: resolveSekExchangeRateSync=11.25, getEffectiveExchangeRate=1", () => {
      // TODO(pricing-consolidation): b2b-wine-cost must not treat missing EUR FX as 1.
      expect(resolveSekExchangeRateSync("EUR")).toBe(11.25);
      expect(
        getEffectiveExchangeRate({
          cost_currency: "EUR",
          exchange_rate: null,
        }),
      ).toBe(1);
      expect(resolveSekExchangeRateSync("EUR")).not.toBe(
        getEffectiveExchangeRate({
          cost_currency: "EUR",
          exchange_rate: null,
        }),
      );
    });

    it("same cost with those FX fallbacks yields wildly different retail öre", () => {
      const wine = wineById("a-love-supreme-2024");
      const withRetailFallback = calculateRetailPriceCents({
        costAmount: wine.cost_amount,
        exchangeRate: resolveSekExchangeRateSync("EUR"),
        priceIncludesVat: true,
        marginPercentage: wine.margin_percentage,
        alcoholTaxCents: wine.alcohol_tax_cents,
      });
      const withB2bCostFallback = calculateRetailPriceCents({
        costAmount: wine.cost_amount,
        exchangeRate: getEffectiveExchangeRate({
          cost_currency: "EUR",
          exchange_rate: null,
        }),
        priceIncludesVat: true,
        marginPercentage: wine.margin_percentage,
        alcoholTaxCents: wine.alcohol_tax_cents,
      });

      // Lock the magnitude gap until FX paths share one fallback (whole kronor).
      expect(withRetailFallback).toBe(15800);
      expect(withB2bCostFallback).toBe(4600);
      expect(withRetailFallback! - withB2bCostFallback!).toBeGreaterThan(10_000);
    });
  });

  describe("B2B: pallet commercial unrounded vs shop/inquiry Math.round", () => {
    it("Up Tempo no shipping: commercial ~139.0375 vs inquiry/shop 139", () => {
      const wine = wineById("up-tempo-2024");
      const commercial = computeB2bCustomerUnitPriceExclVatSek(
        {
          cost_amount: wine.cost_amount,
          cost_currency: wine.cost_currency,
          exchange_rate: wine.exchange_rate,
          alcohol_tax_cents: wine.alcohol_tax_cents,
          b2b_margin_percentage: wine.b2b_margin_percentage,
        },
        0,
        wine.b2b_margin_percentage,
      );
      const inquiry = computeInquiryB2bUnitPriceExclVatSek({
        costAmount: wine.cost_amount,
        exchangeRate: wine.exchange_rate,
        alcoholTaxCents: wine.alcohol_tax_cents,
        b2bMarginPercentage: wine.b2b_margin_percentage,
        shippingPerBottleSek: 0,
      });
      const shopRounded = calculateRoundedB2BPriceExclVat(
        wine.cost_amount,
        wine.exchange_rate,
        wine.alcohol_tax_cents,
        wine.b2b_margin_percentage,
        0,
      );

      // TODO(pricing-consolidation): admin pallet commercial still returns unrounded SEK.
      expect(commercial).toBeCloseTo(139.0375, 10);
      expect(inquiry).toBe(139);
      expect(shopRounded).toBe(139);
      expect(commercial).not.toBe(inquiry);
      expect(Math.round(commercial!)).toBe(inquiry);
    });

    it("raw calculateB2BPriceExclVat ≠ rounded helper for fractional results", () => {
      const wine = wineById("a-love-supreme-2024");
      const raw = calculateB2BPriceExclVat(
        wine.cost_amount,
        wine.exchange_rate,
        wine.alcohol_tax_cents,
        wine.b2b_margin_percentage,
        0,
      );
      const rounded = calculateRoundedB2BPriceExclVat(
        wine.cost_amount,
        wine.exchange_rate,
        wine.alcohol_tax_cents,
        wine.b2b_margin_percentage,
        0,
      );

      // TODO(pricing-consolidation): callers still mix raw vs rounded helpers.
      expect(raw).toBeCloseTo(125.125, 10);
      expect(rounded).toBe(125);
      expect(raw).not.toBe(rounded);
    });
  });

  describe("Systembolaget vs PACT B2C retail formula", () => {
    it("same cost inputs: SB 14.7% path ≠ PACT margin+VAT öre/100", () => {
      const wine = wineById("up-tempo-2024");
      const sb = calculateSystembolagetPrice(
        wine.cost_amount,
        wine.exchange_rate,
        wine.alcohol_tax_cents,
      );
      const pactOre = calculateRetailPriceCents({
        costAmount: wine.cost_amount,
        exchangeRate: wine.exchange_rate,
        priceIncludesVat: true,
        marginPercentage: wine.margin_percentage,
        alcoholTaxCents: wine.alcohol_tax_cents,
      });

      // TODO(pricing-consolidation): SB comparator uses fixed 14.7%; PACT uses wine margin.
      expect(sb).toBe(163);
      expect(pactOre).toBe(17400);
      expect(sb).not.toBe((pactOre ?? 0) / 100);
    });
  });

  describe("stored catalog price vs live retail recalculation", () => {
    it("Résiste SEK: B2C whole-kronor list 144; B2B inquiry card stays 132 excl. VAT", () => {
      const wine = wineById("resiste-sek-b2b-card");
      const live = calculateRetailPriceCents({
        costAmount: wine.cost_amount,
        exchangeRate: wine.exchange_rate,
        priceIncludesVat: true,
        marginPercentage: wine.margin_percentage,
        alcoholTaxCents: wine.alcohol_tax_cents,
      });

      // Whole-kronor B2C list matches live formula; B2B inquiry card stays excl. VAT.
      expect(wine.base_price_cents).toBe(14400);
      expect(live).toBe(14400);
      expect(
        computeInquiryB2bUnitPriceExclVatSek({
          costAmount: wine.cost_amount,
          exchangeRate: wine.exchange_rate,
          alcoholTaxCents: wine.alcohol_tax_cents,
          b2bMarginPercentage: wine.b2b_margin_percentage,
          shippingPerBottleSek: 0,
        }),
      ).toBe(132);
    });
  });
});
