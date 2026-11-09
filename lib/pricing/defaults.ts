/**
 * Preset configs that reproduce today's per-surface behaviour (PR #143 goldens).
 *
 * FX source and rounding remain undecided product-wide — these presets are the
 * documented defaults until Axel picks a single policy.
 */
import type { PricingConfig } from "@/lib/pricing/types";

/** B2C retail formula → whole kronor incl. VAT (`calculateRetailPriceCents`). */
export const B2C_RETAIL_TODAY: PricingConfig = {
  channel: "b2c",
  fxSource: "explicit",
  rounding: "round_sek",
  vatRate: 0.25,
};

/** Dirty Wine / shop / inquiry B2B excl. VAT → whole SEK. */
export const B2B_SHOP_TODAY: PricingConfig = {
  channel: "b2b",
  fxSource: "explicit",
  rounding: "round_sek",
  vatRate: 0,
};

/** Admin pallet commercial B2B — unrounded SEK float (as öre). */
export const B2B_COMMERCIAL_TODAY: PricingConfig = {
  channel: "b2b",
  fxSource: "explicit",
  rounding: "none",
  vatRate: 0,
};

/**
 * When no stored rate: B2C retail hardcoded EUR/USD/GBP map (never 1 for EUR).
 * Pair with whole-kronor consumer rounding (`round_sek`).
 */
export const B2C_RETAIL_FX_FALLBACK: PricingConfig = {
  channel: "b2c",
  fxSource: "retail_fallback",
  rounding: "round_sek",
  vatRate: 0.25,
};

/**
 * When no stored rate: b2b-wine-cost path falls back to 1 (even for EUR).
 * Documented divergence vs retail — not a recommendation.
 */
export const B2B_COST_FX_FALLBACK: PricingConfig = {
  channel: "b2b",
  fxSource: "b2b_cost_fallback",
  rounding: "round_sek",
  vatRate: 0,
};
