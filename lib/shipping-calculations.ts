/**
 * Shipping cost calculations: pallet linehaul + last-mile (Budbee home delivery).
 */

export interface PalletShippingInfo {
  id: string;
  name: string;
  costCents: number;
  bottleCapacity: number;
  currentBottles: number;
  remainingBottles: number;
  /** Öre per bottle for last mile; 0 falls back to env default at calculation time. */
  lastMileCostCentsPerBottle?: number;
}

export interface ShippingCostBreakdown {
  /** Total pallet linehaul cost in DB (whole pallet). */
  palletCostCents: number;
  palletCostSek: number;
  /** Combined cost per bottle (linehaul + last mile). */
  costPerBottleCents: number;
  costPerBottleSek: number;
  /** This order's share of pallet linehaul. */
  palletShippingCostCents: number;
  /** Budbee / home delivery for this order. */
  lastMileCostCents: number;
  lastMileCostCentsPerBottle: number;
  totalShippingCostCents: number;
  totalShippingCostSek: number;
  bottlesInPallet: number;
}

/** Env default when pallet.last_mile_cost_cents_per_bottle is 0. */
export function resolveLastMileCostCentsPerBottle(
  palletOverride?: number | null,
): number {
  const fromPallet = Number(palletOverride);
  if (Number.isFinite(fromPallet) && fromPallet > 0) {
    return Math.round(fromPallet);
  }
  const fromEnv = Number(process.env.LAST_MILE_COST_CENTS_PER_BOTTLE ?? "");
  if (Number.isFinite(fromEnv) && fromEnv > 0) {
    return Math.round(fromEnv);
  }
  return 0;
}

/**
 * Calculate shipping cost per bottle based on pallet cost and capacity (linehaul only).
 */
export function calculateShippingCostPerBottle(
  palletCostCents: number,
  bottleCapacity: number,
): number {
  if (bottleCapacity === 0) return 0;
  return Math.round(palletCostCents / bottleCapacity);
}

export function calculateShippingCostBreakdown(
  palletCostCents: number,
  bottleCapacity: number,
  bottlesInOrder: number,
  lastMileCostCentsPerBottle: number = 0,
): ShippingCostBreakdown {
  const palletCostPerBottleCents = calculateShippingCostPerBottle(
    palletCostCents,
    bottleCapacity,
  );
  const palletShippingCostCents = palletCostPerBottleCents * bottlesInOrder;
  const lastMileCostCents = lastMileCostCentsPerBottle * bottlesInOrder;
  const totalShippingCostCents =
    palletShippingCostCents + lastMileCostCents;
  const costPerBottleCents =
    palletCostPerBottleCents + lastMileCostCentsPerBottle;

  return {
    palletCostCents,
    palletCostSek: palletCostCents / 100,
    costPerBottleCents,
    costPerBottleSek: costPerBottleCents / 100,
    palletShippingCostCents,
    lastMileCostCents,
    lastMileCostCentsPerBottle,
    totalShippingCostCents,
    totalShippingCostSek: totalShippingCostCents / 100,
    bottlesInPallet: bottlesInOrder,
  };
}

export function formatShippingCost(costCents: number): string {
  return `${Math.round(costCents / 100)} SEK`;
}

export function calculateCartShippingCost(
  cartItems: Array<{ quantity: number }>,
  selectedPallet: PalletShippingInfo | null,
): ShippingCostBreakdown | null {
  if (!selectedPallet) {
    return null;
  }

  const totalBottles = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const lastMilePerBottle = resolveLastMileCostCentsPerBottle(
    selectedPallet.lastMileCostCentsPerBottle,
  );

  return calculateShippingCostBreakdown(
    selectedPallet.costCents,
    selectedPallet.bottleCapacity,
    totalBottles,
    lastMilePerBottle,
  );
}
