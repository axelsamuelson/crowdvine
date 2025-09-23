/**
 * Shipping cost calculations for pallets and bottles
 */

export interface PalletShippingInfo {
  id: string;
  name: string;
  costCents: number;
  bottleCapacity: number;
  currentBottles: number;
  remainingBottles: number;
}

export interface ShippingCostBreakdown {
  palletCostCents: number;
  palletCostSek: number;
  costPerBottleCents: number;
  costPerBottleSek: number;
  totalShippingCostCents: number;
  totalShippingCostSek: number;
  bottlesInPallet: number;
}

/**
 * Calculate shipping cost per bottle based on pallet cost and capacity
 * @param palletCostCents - Cost of the entire pallet in cents
 * @param bottleCapacity - Maximum number of bottles the pallet can hold
 * @returns Cost per bottle in cents
 */
export function calculateShippingCostPerBottle(
  palletCostCents: number,
  bottleCapacity: number,
): number {
  if (bottleCapacity === 0) return 0;
  return Math.round(palletCostCents / bottleCapacity);
}

/**
 * Calculate total shipping cost for a specific number of bottles
 * @param palletCostCents - Cost of the entire pallet in cents
 * @param bottleCapacity - Maximum number of bottles the pallet can hold
 * @param bottlesInPallet - Number of bottles currently in the pallet
 * @returns Shipping cost breakdown
 */
export function calculateShippingCostBreakdown(
  palletCostCents: number,
  bottleCapacity: number,
  bottlesInPallet: number,
): ShippingCostBreakdown {
  const costPerBottleCents = calculateShippingCostPerBottle(
    palletCostCents,
    bottleCapacity,
  );
  const totalShippingCostCents = costPerBottleCents * bottlesInPallet;

  return {
    palletCostCents,
    palletCostSek: palletCostCents / 100,
    costPerBottleCents,
    costPerBottleSek: costPerBottleCents / 100,
    totalShippingCostCents,
    totalShippingCostSek: totalShippingCostCents / 100,
    bottlesInPallet,
  };
}

/**
 * Format shipping cost for display
 * @param costCents - Cost in cents
 * @returns Formatted cost string
 */
export function formatShippingCost(costCents: number): string {
  return `${(costCents / 100).toFixed(2)} SEK`;
}

/**
 * Calculate shipping cost for cart items based on selected pallet
 * @param cartItems - Array of cart items with quantities
 * @param selectedPallet - Selected pallet information
 * @returns Shipping cost breakdown or null if no pallet selected
 */
export function calculateCartShippingCost(
  cartItems: Array<{ quantity: number }>,
  selectedPallet: PalletShippingInfo | null,
): ShippingCostBreakdown | null {
  if (!selectedPallet) {
    return null;
  }

  const totalBottles = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return calculateShippingCostBreakdown(
    selectedPallet.costCents,
    selectedPallet.bottleCapacity,
    totalBottles,
  );
}
