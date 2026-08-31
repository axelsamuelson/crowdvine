/**
 * Canonical GM1 / GM2 / GM3 / operating contribution.
 * Reuses existing GM1/GM2 definitions from pallet operating summary.
 */

import { deriveContributionMargins } from "@/lib/admin-pallet-operating-summary";
import { grossToNetCents } from "@/lib/pallet-contribution";
import type {
  FinanceBreakdown,
  FinanceChannel,
  FinanceCompletenessStatus,
  FinanceMode,
  FinanceUnitScenarioInput,
  FinanceUnitScenarioResult,
  FinanceWarning,
} from "@/lib/finance/types";

export function percentOf(
  numeratorCents: number,
  denominatorCents: number,
): number | null {
  const d = Math.round(denominatorCents);
  if (d <= 0) return null;
  return Math.round((Math.round(numeratorCents) / d) * 10000) / 100;
}

export function coveragePercent(
  bottlesKnown: number,
  bottlesTotal: number,
): number | null {
  const t = Math.max(0, Math.floor(bottlesTotal));
  if (t <= 0) return null;
  return Math.round((Math.max(0, bottlesKnown) / t) * 1000) / 10;
}

/**
 * Allocate inbound freight across a ship quantity (bottle-count method).
 * Returns per-bottle öre (integer) and leftover handled by largest-remainder
 * only when allocating a pool — for per-bottle display use floor division.
 */
export function inboundFreightCentsPerBottle(
  inboundFreightTotalCents: number,
  shipQuantity: number,
): number {
  const total = Math.max(0, Math.round(inboundFreightTotalCents));
  const qty = Math.max(0, Math.floor(shipQuantity));
  if (qty <= 0 || total <= 0) return 0;
  return Math.floor(total / qty);
}

export function allocateInboundFreightByBottles(
  inboundFreightTotalCents: number,
  bottleWeights: number[],
): number[] {
  const total = Math.max(0, Math.round(inboundFreightTotalCents));
  const weights = bottleWeights.map((w) => Math.max(0, Math.floor(w)));
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total === 0 || sum <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (w / sum) * total);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = total - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);
  const out = [...floors];
  let idx = 0;
  while (remainder > 0 && idx < order.length) {
    out[order[idx]!.i]! += 1;
    remainder -= 1;
    idx += 1;
  }
  return out;
}

export function deriveGm3(input: {
  gm2Cents: number;
  inboundFreightCents: number;
}): number {
  return Math.round(input.gm2Cents) - Math.max(0, Math.round(input.inboundFreightCents));
}

export function buildFinanceBreakdown(input: {
  channel: FinanceChannel;
  mode: FinanceMode;
  bottles: number;
  orders: number;
  bottlesKnown: number;
  bottlesIncomplete: number;
  productGrossRevenueCents: number;
  productNetRevenueCents: number;
  shippingGrossRevenueCents: number;
  shippingNetRevenueCents: number;
  discountCents: number;
  producerPurchaseCostCents: number;
  alcoholExciseCents: number;
  paymentFeesCents: number;
  outboundCarrierCostCents: number;
  eprCents: number;
  refundBreakageReserveCents: number;
  inboundFreightCents: number;
  inboundAllocationKind: FinanceBreakdown["inboundAllocationKind"];
  opexAllocatedCents: number;
  completeness: FinanceCompletenessStatus;
  warnings: FinanceWarning[];
}): FinanceBreakdown {
  const { gm1Cents, gm2Cents } = deriveContributionMargins({
    productNetRevenueCents: input.productNetRevenueCents,
    shippingRevenueNetCents: input.shippingNetRevenueCents,
    purchaseCostCents: input.producerPurchaseCostCents,
    exciseCents: input.alcoholExciseCents,
    paymentFeeCents: input.paymentFeesCents,
    lastMileCostCents: input.outboundCarrierCostCents,
    eprCents: input.eprCents,
    refundReserveCents: input.refundBreakageReserveCents,
  });

  const inbound = Math.max(0, Math.round(input.inboundFreightCents));
  const gm3Cents = deriveGm3({ gm2Cents, inboundFreightCents: inbound });
  const opex = Math.max(0, Math.round(input.opexAllocatedCents));
  const productNet = Math.round(input.productNetRevenueCents);
  const totalNet =
    productNet + Math.round(input.shippingNetRevenueCents);

  return {
    channel: input.channel,
    mode: input.mode,
    bottles: Math.max(0, Math.floor(input.bottles)),
    orders: Math.max(0, Math.floor(input.orders)),
    bottlesKnown: Math.max(0, Math.floor(input.bottlesKnown)),
    bottlesIncomplete: Math.max(0, Math.floor(input.bottlesIncomplete)),
    productGrossRevenueCents: Math.round(input.productGrossRevenueCents),
    productNetRevenueCents: productNet,
    shippingGrossRevenueCents: Math.round(input.shippingGrossRevenueCents),
    shippingNetRevenueCents: Math.round(input.shippingNetRevenueCents),
    discountCents: Math.round(input.discountCents),
    producerPurchaseCostCents: Math.round(input.producerPurchaseCostCents),
    alcoholExciseCents: Math.round(input.alcoholExciseCents),
    gm1Cents,
    gm1PercentOfProductNet: percentOf(gm1Cents, productNet),
    paymentFeesCents: Math.round(input.paymentFeesCents),
    outboundCarrierCostCents: Math.round(input.outboundCarrierCostCents),
    eprCents: Math.round(input.eprCents),
    refundBreakageReserveCents: Math.round(input.refundBreakageReserveCents),
    gm2Cents,
    gm2PercentOfProductNet: percentOf(gm2Cents, productNet),
    gm2PercentOfTotalNet: percentOf(gm2Cents, totalNet),
    inboundFreightCents: inbound,
    inboundAllocationKind: input.inboundAllocationKind,
    gm3Cents,
    gm3PercentOfProductNet: percentOf(gm3Cents, productNet),
    opexAllocatedCents: opex,
    operatingContributionCents: gm3Cents - opex,
    completeness: input.completeness,
    coveragePercent: coveragePercent(input.bottlesKnown, input.bottles),
    warnings: input.warnings,
  };
}

/**
 * Pure per-bottle scenario economics (simulation only — does not mutate catalog).
 */
export function calculateUnitScenario(
  input: FinanceUnitScenarioInput,
): FinanceUnitScenarioResult {
  const bottles = Math.max(1, Math.floor(input.bottles));
  const bottlesPerOrder = Math.max(1, Math.floor(input.bottlesPerOrder));
  const currency = (input.purchaseCostCurrency || "SEK").toUpperCase();

  let incomplete = false;
  let incompleteReason: string | null = null;
  if (currency !== "SEK" && !(input.purchaseFxRate && input.purchaseFxRate > 0)) {
    incomplete = true;
    incompleteReason = `Missing FX for ${currency}→SEK`;
  }

  const priceMajor = Math.max(0, Number(input.sellingPriceMajor) || 0);
  const productGross = Math.round(priceMajor * 100);
  const productNet = grossToNetCents(
    productGross,
    input.priceIncludesVat !== false,
    input.vatRate,
  );

  const shipOrderGross = Math.max(
    0,
    Math.round(input.shippingRevenueGrossCentsPerOrder),
  );
  const shipOrderNet = grossToNetCents(
    shipOrderGross,
    input.shippingPriceIncludesVat !== false,
    input.vatRate,
  );
  const shippingGrossCentsPerBottle = Math.round(shipOrderGross / bottlesPerOrder);
  const shippingNetCentsPerBottle = Math.round(shipOrderNet / bottlesPerOrder);

  const purchase =
    currency === "SEK" || (input.purchaseFxRate && input.purchaseFxRate > 0)
      ? Math.max(0, Math.round(input.purchaseCostCentsPerBottle))
      : 0;

  const excise = Math.max(0, Math.round(input.exciseCentsPerBottle));
  const epr = Math.max(0, Math.round(input.eprCentsPerBottle));
  const refund = Math.max(
    0,
    Math.round(productNet * Math.max(0, input.refundBreakageReserveRate)),
  );

  const outboundOrder = Math.max(
    0,
    Math.round(input.outboundCarrierCostCentsPerOrder),
  );
  const outboundPerBottle = Math.round(outboundOrder / bottlesPerOrder);

  const percentFee = Math.round(
    (productGross + shippingGrossCentsPerBottle) *
      Math.max(0, input.stripeFeePercent),
  );
  const fixedFeePerBottle = Math.round(
    Math.max(0, input.stripeFeeFixedCentsPerOrder) / bottlesPerOrder,
  );
  const paymentFee = percentFee + fixedFeePerBottle;

  const inboundPer = inboundFreightCentsPerBottle(
    input.inboundFreightTotalCents,
    input.assumedShipQuantity,
  );

  const { gm1Cents, gm2Cents } = deriveContributionMargins({
    productNetRevenueCents: productNet,
    shippingRevenueNetCents: shippingNetCentsPerBottle,
    purchaseCostCents: purchase,
    exciseCents: excise,
    paymentFeeCents: paymentFee,
    lastMileCostCents: outboundPerBottle,
    eprCents: epr,
    refundReserveCents: refund,
  });

  const gm3Cents = deriveGm3({
    gm2Cents,
    inboundFreightCents: inboundPer,
  });

  // Silence unused volume for now — volume impact is applied by callers.
  void bottles;

  return {
    productGrossCentsPerBottle: productGross,
    productNetCentsPerBottle: productNet,
    shippingGrossCentsPerBottle,
    shippingNetCentsPerBottle,
    purchaseCostCentsPerBottle: purchase,
    exciseCentsPerBottle: excise,
    paymentFeeCentsPerBottle: paymentFee,
    outboundCentsPerBottle: outboundPerBottle,
    eprCentsPerBottle: epr,
    refundReserveCentsPerBottle: refund,
    inboundCentsPerBottle: inboundPer,
    gm1CentsPerBottle: gm1Cents,
    gm2CentsPerBottle: gm2Cents,
    gm3CentsPerBottle: gm3Cents,
    gm1Percent: percentOf(gm1Cents, productNet),
    gm2Percent: percentOf(gm2Cents, productNet),
    gm3Percent: percentOf(gm3Cents, productNet),
    incomplete,
    incompleteReason,
  };
}

export function netOutboundContributionCents(input: {
  shippingNetCents: number;
  outboundCarrierCostCents: number;
}): number {
  return (
    Math.round(input.shippingNetCents) -
    Math.max(0, Math.round(input.outboundCarrierCostCents))
  );
}
