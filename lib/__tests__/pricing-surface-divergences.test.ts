/**
 * Pricing consolidation step 1 — documents CURRENT cross-surface divergences.
 *
 * Explicit expectations + TODO(pricing-consolidation) markers. Do NOT "fix"
 * these to agree in this PR; later steps unify rounding / FX fallbacks.
 *
 * Display surfaces (inline in crowdvine mappers / charge path):
 * - PLP:          lib/crowdvine/products-data.ts — base_price_cents / 100 (unrounded)
 * - PDP:          lib/crowdvine/product-by-handle-data.ts — Math.ceil(öre/100)
 * - Producer page: lib/crowdvine/producer-by-slug-data.ts — Math.round(öre/100)
 * - Auto-charge:  lib/reservation-auto-charge.ts — Math.ceil(öre/100) (same as PDP)
 *
 * Formula / FX surfaces:
 * - wine-retail-pricing vs b2b-wine-cost FX fallback when rate missing
 * - B2B unrounded (pallet commercial) vs Math.round (shop / inquiry)
 * - Systembolaget fixed 14.7% margin vs PACT B2C margin + VAT path
 */
import { describe, expect, it } from "vitest";
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

/** PLP amount today: unrounded major units from öre. */
function plpListPriceSek(basePriceCents: number): number {
  return basePriceCents / 100;
}

/** PDP / cart / reservation-auto-charge amount today. */
function pdpCeilListPriceSek(basePriceCents: number): number {
  return Math.ceil(basePriceCents / 100);
}

/** Producer page price_sek today. */
function producerRoundListPriceSek(basePriceCents: number): number {
  return Math.round(basePriceCents / 100);
}

describe("pricing surface divergences (documented, not fixed)", () => {
  describe("PLP unrounded vs PDP ceil vs producer round", () => {
    it("A Love Supreme 15641 öre → PLP 156.41 / PDP 157 / producer 156", () => {
      const { base_price_cents: cents } = wineById("a-love-supreme-2024");

      // TODO(pricing-consolidation): unify öre→SEK display rounding across PLP/PDP/producer.
      expect(plpListPriceSek(cents)).toBe(156.41);
      expect(pdpCeilListPriceSek(cents)).toBe(157);
      expect(producerRoundListPriceSek(cents)).toBe(156);

      expect(plpListPriceSek(cents)).not.toBe(pdpCeilListPriceSek(cents));
      expect(pdpCeilListPriceSek(cents)).not.toBe(
        producerRoundListPriceSek(cents),
      );
      expect(plpListPriceSek(cents)).not.toBe(
        producerRoundListPriceSek(cents),
      );
    });

    it("Hippie Killer 13032 öre → PLP 130.32 / PDP 131 / producer 130", () => {
      const { base_price_cents: cents } = wineById("hippie-killer-2023");

      // TODO(pricing-consolidation): same three-way split as A Love Supreme.
      expect(plpListPriceSek(cents)).toBe(130.32);
      expect(pdpCeilListPriceSek(cents)).toBe(131);
      expect(producerRoundListPriceSek(cents)).toBe(130);
    });

    it("Up Tempo 17380 öre → PLP 173.8; PDP and producer both 174 (ceil≡round)", () => {
      const { base_price_cents: cents } = wineById("up-tempo-2024");

      // TODO(pricing-consolidation): PLP still exposes fractional SEK; PDP/producer agree here.
      expect(plpListPriceSek(cents)).toBe(173.8);
      expect(pdpCeilListPriceSek(cents)).toBe(174);
      expect(producerRoundListPriceSek(cents)).toBe(174);
      expect(pdpCeilListPriceSek(cents)).toBe(
        producerRoundListPriceSek(cents),
      );
    });

    it("price-breakdown B2C list total follows PDP ceil, not PLP or producer", () => {
      const wine = wineById("a-love-supreme-2024");
      const breakdown = calculatePriceBreakdown({
        cost_amount: wine.cost_amount,
        exchange_rate: wine.exchange_rate,
        alcohol_tax_cents: wine.alcohol_tax_cents,
        margin_percentage: wine.margin_percentage,
        base_price_cents: wine.base_price_cents,
      });

      // TODO(pricing-consolidation): breakdown / auto-charge align with PDP ceil, not producer round.
      expect(breakdown.listTotalInclVat).toBe(157);
      expect(breakdown.listTotalInclVat).toBe(
        pdpCeilListPriceSek(wine.base_price_cents),
      );
      expect(breakdown.listTotalInclVat).not.toBe(
        producerRoundListPriceSek(wine.base_price_cents),
      );
      expect(breakdown.listTotalInclVat).not.toBe(
        plpListPriceSek(wine.base_price_cents),
      );
      // TODO(pricing-consolidation): component Math.ceil can make total ≠ listTotalInclVat.
      expect(breakdown.total).toBe(157.01);
      expect(breakdown.total).not.toBe(breakdown.listTotalInclVat);
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

      // TODO(pricing-consolidation): lock the magnitude gap until FX paths share one fallback.
      expect(withRetailFallback).toBe(15772);
      expect(withB2bCostFallback).toBe(4561);
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
      expect(pactOre).toBe(17380);
      expect(sb).not.toBe((pactOre ?? 0) / 100);
    });
  });

  describe("stored catalog price vs live retail recalculation", () => {
    it("Résiste SEK B2B card: stored 157 kr list ≠ live 20% B2C formula 144.05", () => {
      const wine = wineById("resiste-sek-b2b-card");
      const live = calculateRetailPriceCents({
        costAmount: wine.cost_amount,
        exchangeRate: wine.exchange_rate,
        priceIncludesVat: true,
        marginPercentage: wine.margin_percentage,
        alcoholTaxCents: wine.alcohol_tax_cents,
      });

      // TODO(pricing-consolidation): stored base_price_cents can drift from formula; B2B card is independent.
      expect(wine.base_price_cents).toBe(15700);
      expect(live).toBe(14405);
      expect(live).not.toBe(wine.base_price_cents);
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
