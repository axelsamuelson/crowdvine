/**
 * Cart minimum / pack rules — single source of truth for counter + validation.
 *
 * ## B2C (pactwines.com)
 * Minimum **6 bottles in the whole cart**. Any wines / producers may be mixed.
 * Matches customer copy: «Minst 6 flaskor – du kan blanda».
 * This is a **cart total** floor (≥ 6), not multiples of 6 and not per producer.
 *
 * ## B2B (dirtywine.se)
 * Explicit pack rule in `lib/cart/bottle-pack.ts`: each line quantity must be a
 * multiple of `BOTTLE_PACK_SIZE` (6), between one pack and `B2B_MAX_PACK_BOTTLES`.
 * There is no separate cart-total minimum beyond that (one valid pack line is enough).
 * Cart add / getCart already snaps lines via `normalizeExistingB2BLineQuantity`;
 * validation here is the server-side guard for the same rule.
 */

import {
  BOTTLE_PACK_SIZE,
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
};

export type CartMinimumProgress = {
  channel: CartMinimumChannel;
  /** Bottles currently in cart (B2C) or sum of line quantities (B2B). */
  quantity: number;
  /** Bottles required to satisfy the rule (B2C: always 6; B2B: sum of per-line targets). */
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
 * B2B: each line must be a full pack (`BOTTLE_PACK_SIZE` multiples).
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
    // Next pack target: ceil to pack size (min one pack).
    const required = isValid
      ? quantity
      : Math.max(
          BOTTLE_PACK_SIZE,
          Math.ceil(quantity / BOTTLE_PACK_SIZE) * BOTTLE_PACK_SIZE,
        );
    const needed = isValid ? 0 : required - quantity;
    neededTotal += needed;
    requiredTotal += required;

    lineRows.push({
      ...line,
      quantity,
      required,
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
