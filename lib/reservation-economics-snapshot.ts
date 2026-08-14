/**
 * Build frozen economics snapshots for order_reservation_items at checkout confirm.
 *
 * Lifecycle: snapshot when reservation items are inserted — the same moment
 * bottles enter PALLET_FILL_STATUSES (pending_producer_approval / conditional_pending).
 * Earlier would allow price/COGS drift; later would lag the bottle fill meter.
 */

import {
  getContributionAssumptions,
  type ContributionAssumptions,
} from "@/lib/contribution-assumptions";
import {
  buildUnitEconomicsSnapshot,
  linePrePalletContributionCents,
  type UnitEconomicsSnapshot,
} from "@/lib/pallet-contribution";
import {
  getWineAlcoholTaxCentsPerBottle,
  getWinePurchaseCostCentsPerBottle,
  type WineCostFields,
} from "@/lib/b2b-wine-cost";

export type CartLineEconomicsSource = {
  merchandiseId: string;
  quantity: number;
  /** Line merchandise total in major SEK after cart-level price rules (member/early-bird). */
  lineTotalSek: number;
};

export type WineEconomicsFields = WineCostFields & {
  price_includes_vat?: boolean | null;
};

export type ReservationItemEconomicsRow = {
  reservation_id: string;
  item_id: string;
  quantity: number;
  price_band: "market";
  economics_snapshot: UnitEconomicsSnapshot;
  pre_pallet_contribution_cents: number;
};

/**
 * Allocate an integer pool across weights (largest remainder).
 */
export function allocatePoolByWeights(
  pool: number,
  weights: number[],
): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (pool === 0 || totalWeight <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (Math.max(0, w) / totalWeight) * pool);
  const floors = exact.map((x) => Math.floor(x));
  let remainder = Math.round(pool) - floors.reduce((s, x) => s + x, 0);
  const fracOrder = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac);

  const out = [...floors];
  let idx = 0;
  while (remainder > 0 && idx < fracOrder.length) {
    out[fracOrder[idx]!.i]! += 1;
    remainder -= 1;
    idx += 1;
  }
  while (remainder < 0 && idx < fracOrder.length) {
    const i = fracOrder[idx]!.i;
    if (out[i]! > 0) {
      out[i]! -= 1;
      remainder += 1;
    }
    idx += 1;
  }
  return out;
}

export function buildReservationItemEconomicsRows(input: {
  reservationId: string;
  lines: CartLineEconomicsSource[];
  wineById: Map<string, WineEconomicsFields>;
  /** Order-level discounts (promo + voucher + pact) for this reservation, öre. */
  orderLevelDiscountCents: number;
  /** Customer shipping charged allocated to this reservation, öre inkl moms. */
  shippingRevenueGrossCents: number;
  lastMileCostCentsPerBottle: number;
  /** Share of checkout Stripe fixed fee allocated to this reservation, öre. */
  paymentFeeFixedCents: number;
  assumptions?: ContributionAssumptions;
}): ReservationItemEconomicsRow[] {
  const assumptions = input.assumptions ?? getContributionAssumptions();
  const lines = input.lines.filter((l) => (Number(l.quantity) || 0) > 0);
  if (lines.length === 0) return [];

  const lineGrossCents = lines.map((l) =>
    Math.max(0, Math.round((Number(l.lineTotalSek) || 0) * 100)),
  );
  const quantities = lines.map((l) => Math.max(0, Math.floor(l.quantity)));
  const totalBottles = quantities.reduce((s, q) => s + q, 0);
  if (totalBottles <= 0) return [];

  const discountAlloc = allocatePoolByWeights(
    Math.max(0, Math.round(input.orderLevelDiscountCents)),
    lineGrossCents,
  );
  const shippingAlloc = allocatePoolByWeights(
    Math.max(0, Math.round(input.shippingRevenueGrossCents)),
    quantities,
  );
  const fixedFeeAlloc = allocatePoolByWeights(
    Math.max(0, Math.round(input.paymentFeeFixedCents)),
    quantities,
  );

  return lines.map((line, i) => {
    const qty = quantities[i]!;
    const grossLine = lineGrossCents[i]!;
    const discountLine = discountAlloc[i] ?? 0;
    const paidLine = Math.max(0, grossLine - discountLine);
    const unitGross = Math.round(paidLine / qty);
    const unitDiscount = Math.round(discountLine / qty);
    const unitShipGross = Math.round((shippingAlloc[i] ?? 0) / qty);
    const unitFixedFee = Math.round((fixedFeeAlloc[i] ?? 0) / qty);
    const unitPercentFee = Math.round(unitGross * assumptions.stripeFeePercent);
    const unitPaymentFee = unitPercentFee + unitFixedFee;

    const wine = input.wineById.get(line.merchandiseId) ?? {};
    const priceIncludesVat = wine.price_includes_vat !== false;
    const unitPurchase = getWinePurchaseCostCentsPerBottle(wine);
    const unitExcise = getWineAlcoholTaxCentsPerBottle(wine);

    const snapshot = buildUnitEconomicsSnapshot({
      unitGrossRevenueCents: unitGross,
      unitDiscountCents: unitDiscount,
      unitPurchaseCostCents: unitPurchase,
      unitExciseCents: unitExcise,
      unitShippingRevenueGrossCents: unitShipGross,
      unitLastMileCostCents: input.lastMileCostCentsPerBottle,
      unitPaymentFeeCents: unitPaymentFee,
      priceIncludesVat,
      assumptions,
    });

    return {
      reservation_id: input.reservationId,
      item_id: line.merchandiseId,
      quantity: qty,
      price_band: "market" as const,
      economics_snapshot: snapshot,
      pre_pallet_contribution_cents: linePrePalletContributionCents(
        snapshot,
        qty,
      ),
    };
  });
}
