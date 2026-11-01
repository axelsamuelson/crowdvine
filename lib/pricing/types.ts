/**
 * Shared pricing types for the consolidation SSOT (`lib/pricing/`).
 *
 * FX source and rounding mode are explicit config — Axel has not locked a
 * canonical choice yet. Defaults that match today's surfaces live in
 * {@link ./defaults}.
 */

/** How missing/stored FX is resolved before the formula runs. */
export type FxSource =
  /** Use the caller-supplied rate as-is (golden / stored-rate path). */
  | "explicit"
  /**
   * Today's B2C retail fallback: stored → FALLBACK_SEK_RATES (EUR 11.25 …) → 1.
   * Matches `resolveSekExchangeRateSync` in wine-retail-pricing.
   */
  | "retail_fallback"
  /**
   * Today's b2b-wine-cost fallback: stored → rateMap → 1 (even for EUR).
   * Matches `getEffectiveExchangeRate`.
   */
  | "b2b_cost_fallback";

/**
 * Applied once to the channel total at the end of the formula.
 * Intermediate breakdown fields stay full-precision floats (in öre).
 */
export type RoundingMode =
  /** B2C retail today: `Math.round(sek * 100)` → integer öre. */
  | "round_ore"
  /** B2B shop / inquiry today: `Math.round(sek)` whole SEK → öre. */
  | "round_sek"
  /** B2B pallet commercial today: no rounding (fractional öre OK). */
  | "none";

/** Channel selects VAT treatment; margin meaning is caller-supplied. */
export type PricingChannel = "b2c" | "b2b";

/**
 * Explicit pricing config. Callers must pick FX + rounding; presets in
 * `defaults.ts` encode today's per-surface behaviour from PR #143 goldens.
 */
export type PricingConfig = {
  channel: PricingChannel;
  fxSource: FxSource;
  rounding: RoundingMode;
  /**
   * VAT rate applied after margin for B2C (default 0.25 when channel is b2c).
   * B2B is excl. VAT — use 0.
   */
  vatRate?: number;
};

/** Wine cost inputs for one bottle. */
export type PriceInput = {
  costAmount: number;
  /** ISO currency; used by FX fallbacks. Default SEK when omitted. */
  costCurrency?: string | null;
  /**
   * Stored / fixture exchange rate to SEK.
   * Required for `fxSource: "explicit"` (must be finite and > 0).
   */
  exchangeRate?: number | null;
  /** Alcohol tax in öre. Resolved via wine-alcohol-tax default when null/0. */
  alcoholTaxCents?: number | null;
  /** Gross margin % (0–100). B2C or B2B margin depending on channel. */
  marginPercentage: number;
  /** B2B pallet shipping allocated per bottle (SEK). Ignored for B2C. */
  shippingPerBottleSek?: number;
  /** Optional live rate map for `b2b_cost_fallback`. */
  rateMap?: Record<string, number>;
};

/** Optional post-formula discounts (applied after base rounding). */
export type DiscountInput = {
  /** Member discount % (0–100). B2C: on gross; B2B: on margin only. */
  memberDiscountPercent?: number;
  /** Pallet early-bird tier after member (B2C). */
  palletTier?: 0 | 10 | 20;
};

export type PriceBreakdown = {
  /** cost_amount × FX, in öre (full precision). */
  costOre: number;
  /** Alcohol tax in öre. */
  alcoholTaxOre: number;
  /** Shipping in öre (B2B); 0 for B2C. */
  shippingOre: number;
  /** cost + tax (+ shipping for B2B), öre. */
  costBaseOre: number;
  /** Margin amount in öre (priceExVat − costBase). */
  marginOre: number;
  /** Price excl. VAT in öre (after margin, before VAT). */
  priceExVatOre: number;
  /** VAT in öre (0 for B2B). */
  vatOre: number;
  /** Resolved FX rate used. */
  resolvedFx: number;
  marginPercentage: number;
};

export type PriceResult = {
  /** Unit price in öre after end rounding (and optional discounts). */
  totalOre: number;
  /** Same as totalOre / 100. */
  totalSek: number;
  /**
   * Base list total in öre after formula rounding, before member/pallet
   * discounts. Equals totalOre when no discounts apply.
   */
  listTotalOre: number;
  breakdown: PriceBreakdown;
  config: Required<Pick<PricingConfig, "channel" | "fxSource" | "rounding">> & {
    vatRate: number;
  };
  memberDiscountOre?: number;
  palletDiscountOre?: number;
};
