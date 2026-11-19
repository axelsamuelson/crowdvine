/**
 * Customer progress: "X av Y flaskor" where Y = bottles needed for the
 * CURRENT coverage threshold (recomputed when the threshold drops).
 * No countdown / deadline in the UI.
 */

import {
  defaultSixPackContributionBeforePalletOre,
  getPalletCoverageCloseConfig,
  type PalletCoverageCloseConfig,
} from "@/lib/pallet-coverage-close/config";
import {
  computePalletCoverage,
  type CoverageOrderInput,
} from "@/lib/pallet-coverage-close/coverage";
import {
  resolveCoverageThreshold,
  type CoverageThreshold,
} from "@/lib/pallet-coverage-close/threshold";

export type ProgressDisplay = {
  filledBottles: number;
  /** Bottles needed for the current threshold (or bottle cap when cap-only). */
  targetBottles: number;
  threshold: CoverageThreshold;
  coverageRatio: number;
};

/**
 * Estimate how many identical average-size orders are needed to hit `ratio`.
 * Solves n*C / (F + n*I) >= ratio  →  n >= ratio*F / (C − ratio*I)
 */
export function ordersNeededForCoverageRatio(
  ratio: number,
  contributionPerOrderOre: number,
  cfg: PalletCoverageCloseConfig,
): number {
  const C = contributionPerOrderOre;
  const I = cfg.instabeeOrePerOrder;
  const F = cfg.fixedPalletCostOre;
  const denom = C - ratio * I;
  if (denom <= 0) return Number.POSITIVE_INFINITY;
  return Math.ceil((ratio * F) / denom);
}

/**
 * Bottles needed (Y) for the current threshold using average bottles/order
 * from live orders when present; else assume 6-pack economics.
 */
export function bottlesNeededForCurrentThreshold(input: {
  orders: CoverageOrderInput[];
  firstOrderAt: Date | string;
  now?: Date;
  cfg?: PalletCoverageCloseConfig;
}): ProgressDisplay {
  const cfg = input.cfg ?? getPalletCoverageCloseConfig({});
  const now = input.now ?? new Date();
  const threshold = resolveCoverageThreshold(input.firstOrderAt, now, cfg);
  const coverage = computePalletCoverage(input.orders, cfg);
  const filledBottles = coverage.bottleCount;

  if (threshold.requiredCoverage == null) {
    return {
      filledBottles,
      targetBottles: cfg.bottleCap,
      threshold,
      coverageRatio: coverage.coverageRatio,
    };
  }

  const avgBottlesPerOrder =
    coverage.orderCount > 0
      ? coverage.bottleCount / coverage.orderCount
      : 6;
  const avgContribution =
    coverage.orderCount > 0
      ? coverage.numeratorOre / coverage.orderCount
      : defaultSixPackContributionBeforePalletOre(cfg);

  const ordersNeeded = ordersNeededForCoverageRatio(
    threshold.requiredCoverage,
    avgContribution,
    cfg,
  );
  const targetFromCoverage = Math.ceil(ordersNeeded * avgBottlesPerOrder);
  const targetBottles = Math.min(cfg.bottleCap, Math.max(1, targetFromCoverage));

  return {
    filledBottles,
    targetBottles,
    threshold,
    coverageRatio: coverage.coverageRatio,
  };
}
