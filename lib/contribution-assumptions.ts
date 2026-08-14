/**
 * Centralized working assumptions for shadow pallet contribution (Phase 2).
 *
 * Prefer live application values (pallet cost_cents, last-mile, wine COGS/tax,
 * checkout paid amounts). Use these ONLY where the app has no canonical field.
 *
 * Override via env — do not scatter magic numbers in calculation helpers.
 */

export const CONTRIBUTION_ASSUMPTIONS_VERSION = "phase2-v1";

/** Swedish standard VAT for B2C wine retail (when price_includes_vat). */
export const DEFAULT_VAT_RATE = 0.25;

export type ContributionAssumptions = {
  version: string;
  /** Stripe percent of gross charged amount (e.g. 0.015 = 1.5%). */
  stripeFeePercent: number;
  /** Stripe fixed fee per payment in öre (180 = 1.80 SEK). */
  stripeFeeFixedCents: number;
  /** Refund/breakage reserve as fraction of net product revenue (0.01 = 1%). */
  refundBreakageReserveRate: number;
  /** EPR / packaging reserve per bottle in öre (50 = 0.50 SEK). */
  eprCentsPerBottle: number;
  vatRate: number;
};

const DEFAULTS: ContributionAssumptions = {
  version: CONTRIBUTION_ASSUMPTIONS_VERSION,
  stripeFeePercent: 0.015,
  stripeFeeFixedCents: 180,
  refundBreakageReserveRate: 0.01,
  eprCentsPerBottle: 50,
  vatRate: DEFAULT_VAT_RATE,
};

function parseNonNegNumber(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

/**
 * Load contribution assumptions from env with documented defaults.
 *
 * Env keys:
 * - CONTRIBUTION_STRIPE_FEE_PERCENT (default 0.015)
 * - CONTRIBUTION_STRIPE_FEE_FIXED_CENTS (default 180)
 * - CONTRIBUTION_REFUND_BREAKAGE_RESERVE_RATE (default 0.01)
 * - CONTRIBUTION_EPR_CENTS_PER_BOTTLE (default 50)
 * - CONTRIBUTION_VAT_RATE (default 0.25)
 */
export function getContributionAssumptions(
  env: NodeJS.ProcessEnv = process.env,
): ContributionAssumptions {
  return {
    version: CONTRIBUTION_ASSUMPTIONS_VERSION,
    stripeFeePercent: parseNonNegNumber(
      env.CONTRIBUTION_STRIPE_FEE_PERCENT,
      DEFAULTS.stripeFeePercent,
    ),
    stripeFeeFixedCents: Math.round(
      parseNonNegNumber(
        env.CONTRIBUTION_STRIPE_FEE_FIXED_CENTS,
        DEFAULTS.stripeFeeFixedCents,
      ),
    ),
    refundBreakageReserveRate: parseNonNegNumber(
      env.CONTRIBUTION_REFUND_BREAKAGE_RESERVE_RATE,
      DEFAULTS.refundBreakageReserveRate,
    ),
    eprCentsPerBottle: Math.round(
      parseNonNegNumber(
        env.CONTRIBUTION_EPR_CENTS_PER_BOTTLE,
        DEFAULTS.eprCentsPerBottle,
      ),
    ),
    vatRate: parseNonNegNumber(env.CONTRIBUTION_VAT_RATE, DEFAULTS.vatRate),
  };
}
