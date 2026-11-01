/**
 * Single entry point for unit pricing. Not wired into production surfaces yet
 * (pricing consolidation step 2) — callers still use the legacy modules.
 */
import { applyRounding } from "@/lib/pricing/round";
import { resolveFxRate } from "@/lib/pricing/fx";
import { computeRawFormula } from "@/lib/pricing/formula";
import {
  applyMemberDiscountOre,
  applyPalletDiscountOre,
} from "@/lib/pricing/discounts";
import type {
  DiscountInput,
  PriceInput,
  PriceResult,
  PricingConfig,
} from "@/lib/pricing/types";

function resolveVatRate(config: PricingConfig): number {
  if (config.vatRate != null) return config.vatRate;
  return config.channel === "b2c" ? 0.25 : 0;
}

/**
 * Compute unit price in öre:
 *   (cost × FX + alcohol tax [+ B2B shipping]) / (1 − margin)  [× (1+VAT) for B2C]
 *
 * Rounding runs once at the end of that formula. Member / pallet discounts are
 * optional post-processors (each with today's own rounding).
 *
 * Returns `null` when the margin denominator is invalid (margin ≥ 100%).
 */
export function calculateUnitPrice(
  input: PriceInput,
  config: PricingConfig,
  discounts: DiscountInput = {},
): PriceResult | null {
  const vatRate = resolveVatRate(config);
  const resolvedFx = resolveFxRate(config.fxSource, input);
  const raw = computeRawFormula(input, {
    channel: config.channel,
    resolvedFx,
    vatRate,
  });

  if (!raw.isValid) return null;

  const listTotalOre = applyRounding(raw.rawTotalSek, config.rounding);

  let totalOre = listTotalOre;
  let memberDiscountOre: number | undefined;
  let palletDiscountOre: number | undefined;

  const memberPct = discounts.memberDiscountPercent ?? 0;
  if (memberPct > 0) {
    const afterMember = applyMemberDiscountOre(
      config.channel,
      listTotalOre,
      input.marginPercentage,
      memberPct,
    );
    memberDiscountOre = listTotalOre - afterMember;
    totalOre = afterMember;
  }

  const tier = discounts.palletTier ?? 0;
  if (config.channel === "b2c" && tier > 0) {
    const afterPallet = applyPalletDiscountOre(totalOre, tier);
    palletDiscountOre = totalOre - afterPallet;
    totalOre = afterPallet;
  }

  return {
    totalOre,
    totalSek: totalOre / 100,
    listTotalOre,
    breakdown: raw.breakdown,
    config: {
      channel: config.channel,
      fxSource: config.fxSource,
      rounding: config.rounding,
      vatRate,
    },
    memberDiscountOre,
    palletDiscountOre,
  };
}

/** Convenience: B2C retail öre under an explicit config (null when invalid). */
export function calculateB2cRetailOre(
  input: PriceInput,
  config: PricingConfig,
): number | null {
  const result = calculateUnitPrice(input, config);
  return result?.totalOre ?? null;
}

/** Convenience: B2B excl. VAT in whole/fractional SEK (depends on rounding). */
export function calculateB2bExclVatSek(
  input: PriceInput,
  config: PricingConfig,
): number | null {
  const result = calculateUnitPrice(input, config);
  if (!result) return null;
  if (config.rounding === "round_sek") return result.totalOre / 100;
  if (config.rounding === "none") return result.totalOre / 100;
  return result.totalOre / 100;
}
