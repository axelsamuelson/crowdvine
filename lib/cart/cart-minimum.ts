/**
 * Cart minimum / pack rules — single source of truth for counter + validation.
 *
 * ## B2C (pactwines.com)
 * Per packing source (producer, or wholesaler via `wines.source_type` /
 * `source_name`), bottle count must be a multiple of 6 (6, 12, 18, …).
 * Mix freely within a source. An order may contain several sources.
 * See `lib/cart/packing-source.ts` (Axel 2026-11-11).
 *
 * ## B2B (dirtywine.se)
 * No cart or line minimum beyond quantity ≥ 1 per line (single bottles allowed).
 * Lines are clamped to `B2B_MAX_PACK_BOTTLES` via `lib/cart/bottle-pack.ts`.
 */

import {
  B2B_MIN_LINE_BOTTLES,
  isBottlePackQuantity,
} from "@/lib/cart/bottle-pack";
import {
  computePackingSourceProgress,
  PACK_BOTTLES_PER_SOURCE,
  type PackingSourceInput,
  type PackingSourceProgress,
} from "@/lib/cart/packing-source";

/** B2C: bottles per packing-source box. */
export const B2C_CART_MIN_BOTTLES = PACK_BOTTLES_PER_SOURCE;

export type CartMinimumChannel = "b2c" | "b2b";

export type CartLineQuantity = {
  /** Merchandise / wine id (stable key for UI lists). */
  id: string;
  quantity: number;
  producerId?: string;
  producerName?: string;
  producerDisplayName?: string | null;
  sourceType?: string | null;
  sourceName?: string | null;
  region?: string | null;
};

export type CartMinimumProgress = {
  channel: CartMinimumChannel;
  /** Bottles currently in cart (B2C) or sum of line quantities (B2B). */
  quantity: number;
  /** Bottles required to satisfy the rule. */
  required: number;
  /** Bottles still missing to satisfy the rule. */
  needed: number;
  isValid: boolean;
};

export type CartMinimumLineProgress = CartLineQuantity & {
  required: number;
  needed: number;
  isValid: boolean;
  scope: "cart" | "line" | "source";
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
 * @deprecated Prefer {@link computeB2CPackingMinimum}. Kept for call sites that
 * only have a total bottle count (cannot enforce per-source packing).
 */
export function computeB2CCartMinimum(
  totalBottles: number,
): CartMinimumProgress {
  const quantity = Math.max(0, Math.floor(Number(totalBottles) || 0));
  const rem = quantity % B2C_CART_MIN_BOTTLES;
  const needed =
    quantity === 0
      ? B2C_CART_MIN_BOTTLES
      : rem === 0
        ? 0
        : B2C_CART_MIN_BOTTLES - rem;
  return {
    channel: "b2c",
    quantity,
    required: quantity + needed,
    needed,
    isValid: quantity > 0 && needed === 0,
  };
}

/**
 * B2C: each packing source must be a multiple of {@link B2C_CART_MIN_BOTTLES}.
 */
export function computeB2CPackingMinimum(
  lines: ReadonlyArray<CartLineQuantity>,
): {
  progress: CartMinimumProgress;
  sources: PackingSourceProgress[];
} {
  const packLines: Array<PackingSourceInput & { quantity: number }> = [];
  for (const line of lines) {
    const quantity = Math.max(0, Math.floor(Number(line.quantity) || 0));
    if (quantity <= 0) continue;
    const displayName =
      line.sourceType?.toLowerCase() === "wholesaler" ||
      line.sourceType?.toLowerCase() === "wholesale"
        ? line.sourceName || line.producerName || line.producerDisplayName
        : line.producerDisplayName || line.producerName || line.sourceName;
    packLines.push({
      quantity,
      sourceType: line.sourceType,
      sourceName: line.sourceName,
      producerId: line.producerId,
      displayName,
      region: line.region,
    });
  }

  const sources = computePackingSourceProgress(packLines);
  const quantity = sumCartBottles(packLines);
  const needed = sources.reduce((sum, row) => sum + row.needed, 0);
  const required = sources.reduce((sum, row) => sum + row.required, 0);

  return {
    progress: {
      channel: "b2c",
      quantity,
      required,
      needed,
      isValid: sources.length > 0 && sources.every((row) => row.isValid),
    },
    sources,
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
