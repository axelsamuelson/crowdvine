/**
 * Reverse solvers: required retail price / max producer cost for target margins.
 * Integer-öre friendly; deterministic; no LLM.
 */

import { deriveContributionMargins } from "@/lib/admin-pallet-operating-summary";
import { grossToNetCents } from "@/lib/pallet-contribution";
import {
  deriveGm3,
  gm2WithInboundFreight,
  inboundFreightCentsPerBottle,
  percentOf,
} from "@/lib/finance/margins";

export type MarginTargetKind =
  | "gm1_percent"
  | "gm2_percent"
  | "gm3_percent"
  | "gm1_sek_per_bottle"
  | "gm2_sek_per_bottle"
  | "gm3_sek_per_bottle";

export type SolverCostAssumptions = {
  priceIncludesVat: boolean;
  vatRate: number;
  bottlesPerOrder: number;
  purchaseCostCentsPerBottle: number;
  purchaseCostCurrency: string;
  purchaseFxRate: number | null;
  exciseCentsPerBottle: number;
  eprCentsPerBottle: number;
  refundBreakageReserveRate: number;
  stripeFeePercent: number;
  stripeFeeFixedCentsPerOrder: number;
  shippingRevenueGrossCentsPerOrder: number;
  shippingPriceIncludesVat: boolean;
  outboundCarrierCostCentsPerOrder: number;
  inboundFreightTotalCents: number;
  assumedShipQuantity: number;
};

export type RequiredPriceResult =
  | {
      ok: true;
      requiredGrossCentsPerBottle: number;
      requiredNetCentsPerBottle: number;
      requiredRetailMajor: number;
      gm1Cents: number;
      gm2Cents: number;
      gm3Cents: number;
      gm1Percent: number | null;
      gm2Percent: number | null;
    }
  | { ok: false; reason: string };

export type MaxPurchaseCostResult =
  | {
      ok: true;
      maxPurchaseCostCentsSek: number;
      maxPurchaseCostForeignMajor: number | null;
      currency: string;
      fxRate: number | null;
    }
  | { ok: false; reason: string };

function evaluateAtGross(
  grossCents: number,
  a: SolverCostAssumptions,
): {
  productNet: number;
  gm1: number;
  gm2: number;
  gm3: number;
  incomplete: boolean;
  reason: string | null;
} {
  const currency = (a.purchaseCostCurrency || "SEK").toUpperCase();
  if (currency !== "SEK" && !(a.purchaseFxRate && a.purchaseFxRate > 0)) {
    return {
      productNet: 0,
      gm1: 0,
      gm2: 0,
      gm3: 0,
      incomplete: true,
      reason: `Missing FX for ${currency}→SEK`,
    };
  }

  const bottlesPerOrder = Math.max(1, Math.floor(a.bottlesPerOrder));
  const productNet = grossToNetCents(
    Math.max(0, Math.round(grossCents)),
    a.priceIncludesVat !== false,
    a.vatRate,
  );
  const shipGross = Math.max(0, Math.round(a.shippingRevenueGrossCentsPerOrder));
  const shipNet = grossToNetCents(
    shipGross,
    a.shippingPriceIncludesVat !== false,
    a.vatRate,
  );
  const shipNetPer = Math.round(shipNet / bottlesPerOrder);
  const shipGrossPer = Math.round(shipGross / bottlesPerOrder);
  const outboundPer = Math.round(
    Math.max(0, a.outboundCarrierCostCentsPerOrder) / bottlesPerOrder,
  );
  const fixedFeePer = Math.round(
    Math.max(0, a.stripeFeeFixedCentsPerOrder) / bottlesPerOrder,
  );
  const percentFee = Math.round(
    (Math.max(0, Math.round(grossCents)) + shipGrossPer) *
      Math.max(0, a.stripeFeePercent),
  );
  const payment = percentFee + fixedFeePer;
  const refund = Math.max(
    0,
    Math.round(productNet * Math.max(0, a.refundBreakageReserveRate)),
  );
  const purchase = Math.max(0, Math.round(a.purchaseCostCentsPerBottle));
  const excise = Math.max(0, Math.round(a.exciseCentsPerBottle));
  const epr = Math.max(0, Math.round(a.eprCentsPerBottle));
  const inboundPer = inboundFreightCentsPerBottle(
    a.inboundFreightTotalCents,
    a.assumedShipQuantity,
  );

  const { gm1Cents, gm2Cents: gm2BeforeInbound } = deriveContributionMargins({
    productNetRevenueCents: productNet,
    shippingRevenueNetCents: shipNetPer,
    purchaseCostCents: purchase,
    exciseCents: excise,
    paymentFeeCents: payment,
    lastMileCostCents: outboundPer,
    eprCents: epr,
    refundReserveCents: refund,
  });
  const gm2Cents = gm2WithInboundFreight(gm2BeforeInbound, inboundPer);
  const gm3Cents = deriveGm3({ gm2Cents });

  return {
    productNet,
    gm1: gm1Cents,
    gm2: gm2Cents,
    gm3: gm3Cents,
    incomplete: false,
    reason: null,
  };
}

function meetsTarget(
  kind: MarginTargetKind,
  target: number,
  ev: { productNet: number; gm1: number; gm2: number; gm3: number },
): boolean {
  if (kind === "gm1_sek_per_bottle") {
    return ev.gm1 >= Math.round(target * 100);
  }
  if (kind === "gm2_sek_per_bottle") {
    return ev.gm2 >= Math.round(target * 100);
  }
  if (kind === "gm3_sek_per_bottle") {
    return ev.gm3 >= Math.round(target * 100);
  }
  const pct =
    kind === "gm1_percent"
      ? percentOf(ev.gm1, ev.productNet)
      : kind === "gm2_percent"
        ? percentOf(ev.gm2, ev.productNet)
        : percentOf(ev.gm3, ev.productNet);
  if (pct == null) return false;
  return pct + 1e-9 >= target;
}

/**
 * Binary search required VAT-aware retail gross (öre/bottle) for a margin target.
 */
export function solveRequiredRetailPrice(input: {
  targetKind: MarginTargetKind;
  /** Percent points (e.g. 30) or SEK major for *_sek_per_bottle. */
  target: number;
  assumptions: SolverCostAssumptions;
  /** Search ceiling in öre (default 200_000 = 2000 SEK). */
  maxGrossCents?: number;
}): RequiredPriceResult {
  const fxCheck = evaluateAtGross(0, input.assumptions);
  if (fxCheck.incomplete) {
    return { ok: false, reason: fxCheck.reason ?? "Incomplete assumptions" };
  }

  const hiMax = Math.max(10_000, Math.round(input.maxGrossCents ?? 200_000));
  let lo = 0;
  let hi = hiMax;
  let found: ReturnType<typeof evaluateAtGross> | null = null;

  // Expand ceiling if needed
  for (let expand = 0; expand < 8; expand++) {
    const ev = evaluateAtGross(hi, input.assumptions);
    if (meetsTarget(input.targetKind, input.target, ev)) {
      found = ev;
      break;
    }
    hi *= 2;
    if (hi > 5_000_000) break;
  }
  if (!found) {
    return {
      ok: false,
      reason: "No retail price within search bounds meets the target",
    };
  }

  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2);
    const ev = evaluateAtGross(mid, input.assumptions);
    if (meetsTarget(input.targetKind, input.target, ev)) {
      hi = mid;
      found = ev;
    } else {
      lo = mid + 1;
    }
  }

  const gross = hi;
  const finalEv = evaluateAtGross(gross, input.assumptions);
  return {
    ok: true,
    requiredGrossCentsPerBottle: gross,
    requiredNetCentsPerBottle: finalEv.productNet,
    requiredRetailMajor: Math.round(gross) / 100,
    gm1Cents: finalEv.gm1,
    gm2Cents: finalEv.gm2,
    gm3Cents: finalEv.gm3,
    gm1Percent: percentOf(finalEv.gm1, finalEv.productNet),
    gm2Percent: percentOf(finalEv.gm2, finalEv.productNet),
  };
}

/**
 * Max producer purchase cost (SEK öre/bottle) given fixed retail and target.
 */
export function solveMaxPurchaseCost(input: {
  sellingPriceMajor: number;
  targetKind: MarginTargetKind;
  target: number;
  assumptions: Omit<SolverCostAssumptions, "purchaseCostCentsPerBottle"> & {
    purchaseCostCentsPerBottle?: number;
  };
}): MaxPurchaseCostResult {
  const currency = (input.assumptions.purchaseCostCurrency || "SEK").toUpperCase();
  const fx =
    currency === "SEK"
      ? 1
      : input.assumptions.purchaseFxRate && input.assumptions.purchaseFxRate > 0
        ? input.assumptions.purchaseFxRate
        : null;
  if (fx == null) {
    return { ok: false, reason: `Missing FX for ${currency}→SEK` };
  }

  const gross = Math.max(
    0,
    Math.round((Number(input.sellingPriceMajor) || 0) * 100),
  );

  // Binary search max purchase cost in SEK öre
  let lo = 0;
  let hi = Math.max(gross * 2, 100_000);
  let best = 0;
  let any = false;

  const tryCost = (purchaseCents: number) => {
    const a: SolverCostAssumptions = {
      ...input.assumptions,
      purchaseCostCentsPerBottle: purchaseCents,
    };
    return evaluateAtGross(gross, a);
  };

  // If even purchase=0 misses target, fail
  if (!meetsTarget(input.targetKind, input.target, tryCost(0))) {
    return {
      ok: false,
      reason: "Target not reachable even at zero producer purchase cost",
    };
  }

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    if (meetsTarget(input.targetKind, input.target, tryCost(mid))) {
      any = true;
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (!any) {
    return { ok: false, reason: "Could not solve max purchase cost" };
  }

  const foreignMajor =
    currency === "SEK" ? best / 100 : Math.round((best / fx) * 100) / 10000;

  return {
    ok: true,
    maxPurchaseCostCentsSek: best,
    maxPurchaseCostForeignMajor: currency === "SEK" ? best / 100 : foreignMajor,
    currency,
    fxRate: fx,
  };
}
