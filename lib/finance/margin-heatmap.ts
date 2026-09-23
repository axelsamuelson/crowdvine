/**
 * Margin heatmap (price × ship-qty) for finance scenarios and actuals.
 */

import { calculateUnitScenario } from "@/lib/finance/margins";
import type {
  FinanceBreakdown,
  FinanceChannel,
  FinanceUnitScenarioInput,
} from "@/lib/finance/types";

/** Coarser steps for pallet-fill / sensitivity tables. */
export const SHIP_QTYS = [
  60, 90, 120, 150, 180, 210, 240, 270, 300, 360, 420, 480, 540, 600, 660, 720,
];

/** Finer ship grid for the margin heatmap only. */
export const HEATMAP_SHIP_STEP = 15;
export const HEATMAP_SHIP_QTYS = (() => {
  const qtys: number[] = [];
  for (let q = 60; q <= 720; q += HEATMAP_SHIP_STEP) qtys.push(q);
  return qtys;
})();

export const HEATMAP_PRICE_STEP = 5;

export const PRICE_DELTAS = [
  -80, -60, -50, -40, -30, -25, -20, -15, -10, -5, 0, 5, 10, 15, 20, 25, 30, 40,
  50, 60, 80, 100,
];

export type MarginHeatmapCell = {
  price: number;
  shipQty: number;
  gm1CentsPerBottle: number;
  gm1Percent: number | null;
  gm2CentsPerBottle: number;
  gm2Percent: number | null;
  gm3CentsPerBottle: number;
  gm3Percent: number | null;
};

export type MarginHeatmap = {
  prices: number[];
  shipQtys: number[];
  cells: MarginHeatmapCell[];
};

export function buildPriceAxis(baseA: number, baseB: number): number[] {
  const a = Math.max(0, Math.round(Number(baseA) || 0));
  const b = Math.max(0, Math.round(Number(baseB) || 0));
  const lo = Math.max(50, Math.min(a, b) - 50);
  const hi = Math.max(a, b) + 100;
  const set = new Set<number>();
  for (let p = lo; p <= hi; p += HEATMAP_PRICE_STEP) set.add(p);
  set.add(a);
  set.add(b);
  return [...set].sort((x, y) => x - y);
}

export function buildHeatmapShipAxis(...anchors: number[]): number[] {
  const set = new Set(HEATMAP_SHIP_QTYS);
  for (const raw of anchors) {
    const q = Math.round(Number(raw) || 0);
    if (q > 0) set.add(q);
  }
  return [...set].sort((x, y) => x - y);
}

export function buildMarginHeatmap(
  baseInput: FinanceUnitScenarioInput,
  prices: number[],
  shipQtys: number[],
): MarginHeatmap {
  const cells: MarginHeatmapCell[] = [];
  for (const shipQty of shipQtys) {
    for (const price of prices) {
      const at = calculateUnitScenario({
        ...baseInput,
        sellingPriceMajor: price,
        assumedShipQuantity: shipQty,
      });
      cells.push({
        price,
        shipQty,
        gm1CentsPerBottle: at.gm1CentsPerBottle,
        gm1Percent: at.gm1Percent,
        gm2CentsPerBottle: at.gm2CentsPerBottle,
        gm2Percent: at.gm2Percent,
        gm3CentsPerBottle: at.gm3CentsPerBottle,
        gm3Percent: at.gm3Percent,
      });
    }
  }
  return { prices, shipQtys, cells };
}

/**
 * Rebuild unit-scenario assumptions from period actuals averages so the heatmap
 * reflects “nuvarande marginal” (same cost/frakt structure, varying pris × ship).
 */
export function buildUnitScenarioFromActuals(input: {
  breakdown: FinanceBreakdown;
  channel: FinanceChannel;
  forecastShipQty: number;
  /** One-pallet inbound (öre). Falls back to period inbound total. */
  inboundFreightPerPalletCents?: number | null;
}): FinanceUnitScenarioInput | null {
  const b = input.breakdown;
  const bottles = Math.max(0, Math.floor(b.bottlesKnown));
  if (bottles <= 0) return null;

  const orders = Math.max(0, Math.floor(b.orders));
  const bottlesPerOrder =
    orders > 0 ? Math.max(1, Math.round(bottles / orders)) : 6;

  const productGrossPerBottle = Math.round(b.productGrossRevenueCents / bottles);
  const sellingPriceMajor = Math.max(1, Math.round(productGrossPerBottle / 100));

  const purchaseCostCentsPerBottle = Math.max(
    0,
    Math.round(b.producerPurchaseCostCents / bottles),
  );
  const exciseCentsPerBottle = Math.max(
    0,
    Math.round(b.alcoholExciseCents / bottles),
  );
  const eprCentsPerBottle = Math.max(0, Math.round(b.eprCents / bottles));

  const refundBreakageReserveRate =
    b.productNetRevenueCents > 0
      ? Math.max(0, b.refundBreakageReserveCents / b.productNetRevenueCents)
      : 0.01;

  const shippingRevenueGrossCentsPerOrder =
    orders > 0 ? Math.max(0, Math.round(b.shippingGrossRevenueCents / orders)) : 0;
  const outboundCarrierCostCentsPerOrder =
    orders > 0 ? Math.max(0, Math.round(b.outboundCarrierCostCents / orders)) : 0;

  const inboundFromOpt = input.inboundFreightPerPalletCents;
  const inboundFreightTotalCents = Math.max(
    0,
    Math.round(
      inboundFromOpt != null && inboundFromOpt > 0
        ? inboundFromOpt
        : b.inboundFreightCents,
    ),
  );

  const shipQty = Math.max(1, Math.floor(input.forecastShipQty) || 240);
  const isDirty = input.channel === "dirtywine";

  return {
    sellingPriceMajor,
    priceIncludesVat: !isDirty,
    vatRate: 0.25,
    bottles: shipQty,
    bottlesPerOrder,
    purchaseCostCentsPerBottle,
    purchaseCostCurrency: "SEK",
    purchaseFxRate: 1,
    exciseCentsPerBottle,
    eprCentsPerBottle,
    refundBreakageReserveRate,
    stripeFeePercent: isDirty ? 0 : 0.015,
    stripeFeeFixedCentsPerOrder: isDirty ? 0 : 180,
    shippingRevenueGrossCentsPerOrder,
    shippingPriceIncludesVat: !isDirty,
    outboundCarrierCostCentsPerOrder,
    inboundFreightTotalCents,
    assumedShipQuantity: shipQty,
  };
}
