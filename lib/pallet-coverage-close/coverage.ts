/**
 * Coverage math for shared-pallet close (Ingrid / Axel 2026-11-11).
 *
 * contribution_before_pallet_cost(order) =
 *   wine_margin − EPR + shipping_income_ex_VAT − Stripe_fee
 *
 * coverage =
 *   sum(contribution_before_pallet_cost)
 *   / (fixed_pallet_cost + sum(Instabee_per_order))
 *
 * Instabee is ONLY in the denominator.
 */

import {
  getPalletCoverageCloseConfig,
  type PalletCoverageCloseConfig,
} from "@/lib/pallet-coverage-close/config";

export type CoverageOrderInput = {
  /** Bottle count on this active order (real size — not assumed 6). */
  bottleCount: number;
  /**
   * Wine margin for the order in öre. Prefer live price data when present;
   * otherwise bottleCount * config.wineMarginOrePerBottle.
   */
  wineMarginOre?: number | null;
  /** Gross charged amount (öre) for Stripe % — wine + shipping inkl moms etc. */
  stripeFeeBaseOre?: number | null;
};

export type OrderContributionBreakdown = {
  bottleCount: number;
  wineMarginOre: number;
  eprOre: number;
  shippingIncomeExVatOre: number;
  stripeFeeOre: number;
  /** Numerator component — does NOT subtract Instabee. */
  contributionBeforePalletOre: number;
  instabeeOre: number;
};

export function stripeFeeOreForBase(
  stripeFeeBaseOre: number,
  cfg: PalletCoverageCloseConfig,
): number {
  const base = Math.max(0, Math.round(stripeFeeBaseOre));
  return Math.round(cfg.stripeFeePercent * base + cfg.stripeFeeFixedOre);
}

export function contributionBeforePalletForOrder(
  order: CoverageOrderInput,
  cfg: PalletCoverageCloseConfig = getPalletCoverageCloseConfig({}),
): OrderContributionBreakdown {
  const bottleCount = Math.max(0, Math.floor(Number(order.bottleCount) || 0));
  const wineMarginOre =
    order.wineMarginOre != null && Number.isFinite(Number(order.wineMarginOre))
      ? Math.round(Number(order.wineMarginOre))
      : cfg.wineMarginOrePerBottle * bottleCount;

  const stripeBase =
    order.stripeFeeBaseOre != null &&
    Number.isFinite(Number(order.stripeFeeBaseOre))
      ? Math.round(Number(order.stripeFeeBaseOre))
      : // Scale default six-pack stripe base by bottle count / 6 when unknown.
        Math.round((cfg.stripeFeeBaseOreForDefaultSixPack * bottleCount) / 6);

  const stripeFeeOre = stripeFeeOreForBase(stripeBase, cfg);
  const eprOre = cfg.eprOrePerOrder;
  const shippingIncomeExVatOre = cfg.shippingIncomeExVatOrePerOrder;
  const contributionBeforePalletOre =
    wineMarginOre - eprOre + shippingIncomeExVatOre - stripeFeeOre;

  return {
    bottleCount,
    wineMarginOre,
    eprOre,
    shippingIncomeExVatOre,
    stripeFeeOre,
    contributionBeforePalletOre,
    instabeeOre: cfg.instabeeOrePerOrder,
  };
}

export type PalletCoverageResult = {
  orderCount: number;
  bottleCount: number;
  numeratorOre: number;
  denominatorOre: number;
  coverageRatio: number;
  orders: OrderContributionBreakdown[];
};

export function computePalletCoverage(
  orders: CoverageOrderInput[],
  cfg: PalletCoverageCloseConfig = getPalletCoverageCloseConfig({}),
): PalletCoverageResult {
  const breakdowns = orders.map((o) => contributionBeforePalletForOrder(o, cfg));
  const numeratorOre = breakdowns.reduce(
    (sum, b) => sum + b.contributionBeforePalletOre,
    0,
  );
  const instabeeSum = breakdowns.reduce((sum, b) => sum + b.instabeeOre, 0);
  const denominatorOre = cfg.fixedPalletCostOre + instabeeSum;
  const coverageRatio =
    denominatorOre <= 0
      ? numeratorOre > 0
        ? Number.POSITIVE_INFINITY
        : 0
      : numeratorOre / denominatorOre;

  return {
    orderCount: breakdowns.length,
    bottleCount: breakdowns.reduce((sum, b) => sum + b.bottleCount, 0),
    numeratorOre,
    denominatorOre,
    coverageRatio,
    orders: breakdowns,
  };
}

/**
 * Optional max-loss guard: pallet loss = fixed + instabee − contribution.
 * Returns true when projected loss would exceed config.maxLossPerPalletOre.
 */
export function exceedsMaxLossGuard(
  coverage: PalletCoverageResult,
  cfg: PalletCoverageCloseConfig,
): boolean {
  if (cfg.maxLossPerPalletOre == null) return false;
  const lossOre = coverage.denominatorOre - coverage.numeratorOre;
  return lossOre > cfg.maxLossPerPalletOre;
}
