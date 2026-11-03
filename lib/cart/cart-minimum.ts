/**
 * Cart minimum / pack rules — single source of truth for counter + validation.
 *
 * ## B2C (pactwines.com)
 * Minimum **6 bottles in the whole cart**. Any wines / producers may be mixed.
 * Matches customer copy: «Minst 6 flaskor – du kan blanda».
 * This is a **cart total** floor (≥ 6), not multiples of 6 and not per producer.
 *
 * ## B2B (dirtywine.se)
 * No cart or line minimum beyond quantity ≥ 1 per line (single bottles allowed).
 * Lines are clamped to `B2B_MAX_PACK_BOTTLES` via `lib/cart/bottle-pack.ts`.
 */

import {
  B2B_MIN_LINE_BOTTLES,
  isBottlePackQuantity,
} from "@/lib/cart/bottle-pack";

/** B2C: minimum bottles across the entire cart (any mix). */
export const B2C_CART_MIN_BOTTLES = 6;

export type CartMinimumChannel = "b2c" | "b2b";

export type CartLineQuantity = {
  /** Merchandise / wine id (stable key for UI lists). */
  id: string;
  quantity: number;
  producerId?: string;
  producerName?: string;
  producerDisplayName?: string | null;
};

export type CartMinimumProgress = {
  channel: CartMinimumChannel;
  /** Bottles currently in cart (B2C) or sum of line quantities (B2B). */
  quantity: number;
  /** Bottles required to satisfy the rule (B2C: always 6; B2B: sum of line qtys when valid). */
  required: number;
  /** Bottles still missing to satisfy the rule. */
  needed: number;
  isValid: boolean;
};

export type CartMinimumLineProgress = CartLineQuantity & {
  required: number;
  needed: number;
  isValid: boolean;
  scope: "cart" | "line";
};

/**
 * Sum positive integer bottle quantities from cart lines.
 */
export function sumCartBottles(
  lines: ReadonlyArray<{ quantity: number }>,
): number {
  let total = 0;
  for (const line of lines) {
    const q = Math.floor(Number(line.quantity) || 0);
    if (q > 0) total += q;
  }
  return total;
}

/**
 * B2C: cart-total minimum of {@link B2C_CART_MIN_BOTTLES}. Mix freely.
 */
export function computeB2CCartMinimum(
  totalBottles: number,
): CartMinimumProgress {
  const quantity = Math.max(0, Math.floor(Number(totalBottles) || 0));
  const required = B2C_CART_MIN_BOTTLES;
  const needed = Math.max(0, required - quantity);
  return {
    channel: "b2c",
    quantity,
    required,
    needed,
    isValid: quantity >= required,
  };
}

/**
 * B2B: each line must be an integer quantity ≥ 1 (no pack / cart minimum).
 * Returns per-line progress plus an aggregate progress row.
 */
export function computeB2BPackMinimum(
  lines: ReadonlyArray<CartLineQuantity>,
): {
  progress: CartMinimumProgress;
  lines: CartMinimumLineProgress[];
} {
  const lineRows: CartMinimumLineProgress[] = [];
  let neededTotal = 0;
  let requiredTotal = 0;
  let quantityTotal = 0;

  for (const line of lines) {
    const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
    if (quantity <= 0) continue;

    quantityTotal += quantity;
    const isValid = isBottlePackQuantity(quantity);
    const required = isValid ? quantity : B2B_MIN_LINE_BOTTLES;
    const needed = isValid ? 0 : Math.max(0, required - quantity);
    neededTotal += needed;
    requiredTotal += isValid ? quantity : required;

    lineRows.push({
      ...line,
      quantity,
      required: isValid ? quantity : required,
      needed,
      isValid,
      scope: "line",
    });
  }

  const isValid =
    lineRows.length > 0 && lineRows.every((row) => row.isValid);

  return {
    progress: {
      channel: "b2b",
      quantity: quantityTotal,
      required: requiredTotal,
      needed: neededTotal,
      isValid,
    },
    lines: lineRows,
  };
}

/** Analytics / UI metadata shared by counter and `cart_validation_*` events. */
export function cartMinimumTrackingMeta(
  progress: CartMinimumProgress,
  options?: { invalidCount?: number },
): {
  required_quantity: number;
  needed_total: number;
  invalid_count: number;
} {
  const fallbackInvalid = progress.isValid ? 0 : 1;
  return {
    required_quantity: progress.required,
    needed_total: progress.needed,
    invalid_count:
      typeof options?.invalidCount === "number"
        ? options.invalidCount
        : fallbackInvalid,
  };
}
