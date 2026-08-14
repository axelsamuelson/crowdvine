/**
 * Shared ship-readiness progress: physical capacity vs minimum bottles to ship.
 * Freight amortization must keep using physicalBottleCapacity (bottle_capacity).
 */

export const DEFAULT_PHYSICAL_BOTTLE_CAPACITY = 720;
export const DEFAULT_MIN_BOTTLES_TO_COMPLETE = 120;

export type PalletShipProgress = {
  bottlesFilled: number;
  physicalBottleCapacity: number;
  minBottlesToShip: number;
  bottlesRemainingToShip: number;
  shipProgressPercent: number;
  isReadyToShip: boolean;
};

export function normalizePositiveInt(
  value: unknown,
  fallback: number,
): number {
  const n = Math.floor(Number(value));
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export function resolvePhysicalBottleCapacity(value: unknown): number {
  return normalizePositiveInt(value, DEFAULT_PHYSICAL_BOTTLE_CAPACITY);
}

export function resolveMinBottlesToShip(value: unknown): number {
  return normalizePositiveInt(value, DEFAULT_MIN_BOTTLES_TO_COMPLETE);
}

/**
 * Progress toward ship-ready threshold (not physical capacity).
 * Percent is one decimal, capped at 100 — same display rounding as legacy fill %.
 */
export function computePalletShipProgress(
  bottlesFilled: number,
  minBottlesToShip: number,
  physicalBottleCapacity: number,
): PalletShipProgress {
  const filled = Math.max(0, Math.floor(Number(bottlesFilled) || 0));
  const minToShip = resolveMinBottlesToShip(minBottlesToShip);
  const physical = resolvePhysicalBottleCapacity(physicalBottleCapacity);
  const isReadyToShip = filled >= minToShip;
  const bottlesRemainingToShip = Math.max(0, minToShip - filled);
  const shipProgressPercent =
    minToShip <= 0
      ? 0
      : Math.round(Math.min(100, (filled / minToShip) * 100) * 10) / 10;

  return {
    bottlesFilled: filled,
    physicalBottleCapacity: physical,
    minBottlesToShip: minToShip,
    bottlesRemainingToShip,
    shipProgressPercent,
    isReadyToShip,
  };
}

/** Statuses at/after shipping commit — do not auto-revert readiness. */
export const PALLET_SHIPPING_LOCKED_STATUSES = [
  "shipping_ordered",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "shipped",
  "delivered",
  "cancelled",
] as const;

export function isPalletShippingLocked(status: string | null | undefined): boolean {
  const st = String(status ?? "")
    .trim()
    .toLowerCase();
  return (PALLET_SHIPPING_LOCKED_STATUSES as readonly string[]).includes(st);
}

/** Pallets that may still accept new reservations. */
export const PALLET_ACCEPTING_STATUSES = [
  "open",
  "consolidating",
  "complete",
] as const;
