import {
  B2C_CART_MIN_BOTTLES,
  cartMinimumTrackingMeta,
  computeB2BPackMinimum,
  computeB2CCartMinimum,
  sumCartBottles,
  type CartMinimumChannel,
  type CartMinimumProgress,
} from "@/lib/cart/cart-minimum";
import { generateProducerSlug } from "@/lib/producer-handle";

export type CartItem = {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    product: {
      id: string;
      producerId?: string;
      producerName?: string;
    };
  };
};

/**
 * UI/analytics row for cart minimum progress.
 * B2C: one cart-scoped row (mix any wines).
 * B2B: one row per line that must be a full pack.
 */
export type ProducerValidation = {
  producerId: string;
  producerName: string;
  producerHandle: string;
  quantity: number;
  isValid: boolean;
  needed: number;
  /** Target bottles for this row (current + needed when invalid). */
  required?: number;
  groupId?: string;
  groupName?: string;
  /** `cart` = whole-cart B2C minimum; `line` = B2B pack line. */
  scope?: "cart" | "line" | "producer";
};

export type ValidationResult = {
  isValid: boolean;
  channel: CartMinimumChannel;
  /** Shared counters — same numbers the cart progress UI and tracking use. */
  quantity: number;
  requiredQuantity: number;
  neededTotal: number;
  producerValidations: ProducerValidation[];
  errors: string[];
};

export type ValidateCartMinimumOptions = {
  /**
   * `b2c` (default): ≥ {@link B2C_CART_MIN_BOTTLES} bottles total, any mix.
   * `b2b`: each line must be a full bottle pack (see `lib/cart/bottle-pack.ts`).
   */
  channel?: CartMinimumChannel;
};

function emptyResult(channel: CartMinimumChannel): ValidationResult {
  return {
    isValid: true,
    channel,
    quantity: 0,
    requiredQuantity: channel === "b2c" ? B2C_CART_MIN_BOTTLES : 0,
    neededTotal: 0,
    producerValidations: [],
    errors: [],
  };
}

function fromProgress(
  progress: CartMinimumProgress,
  producerValidations: ProducerValidation[],
  errors: string[],
): ValidationResult {
  return {
    isValid: progress.isValid,
    channel: progress.channel,
    quantity: progress.quantity,
    requiredQuantity: progress.required,
    neededTotal: progress.needed,
    producerValidations,
    errors,
  };
}

/**
 * Pure cart minimum validation (no I/O).
 * Prefer this in tests and when producer enrichment is unnecessary.
 */
export function validateCartMinimum(
  cartItems: CartItem[],
  options: ValidateCartMinimumOptions = {},
): ValidationResult {
  const channel: CartMinimumChannel = options.channel ?? "b2c";

  if (!cartItems || cartItems.length === 0) {
    return emptyResult(channel);
  }

  if (channel === "b2b") {
    const lines = cartItems.map((item) => ({
      id: item.merchandise?.id || item.id,
      quantity: item.quantity,
      producerId: item.merchandise?.product?.producerId,
      producerName: item.merchandise?.product?.producerName,
    }));
    const { progress, lines: lineRows } = computeB2BPackMinimum(lines);

    if (lineRows.length === 0) {
      return emptyResult("b2b");
    }

    const producerValidations: ProducerValidation[] = lineRows.map((row) => {
      const name =
        row.producerName?.trim() ||
        (row.producerId ? `Producer ${row.producerId.slice(0, 8)}` : "Line");
      return {
        producerId: row.producerId || row.id,
        producerName: name,
        producerHandle: row.producerName
          ? generateProducerSlug(row.producerName)
          : "",
        quantity: row.quantity,
        isValid: row.isValid,
        needed: row.needed,
        required: row.required,
        scope: "line",
      };
    });

    const errors = producerValidations
      .filter((v) => !v.isValid)
      .map(
        (v) =>
          `${v.producerName}: ${v.quantity} bottles. Add ${v.needed} more for a full ${v.required}-pack.`,
      );

    return fromProgress(progress, producerValidations, errors);
  }

  // B2C: cart-total minimum — mix any wines / producers.
  const quantity = sumCartBottles(cartItems);
  const progress = computeB2CCartMinimum(quantity);
  const producerValidations: ProducerValidation[] = [
    {
      producerId: "cart",
      producerName: "",
      producerHandle: "",
      quantity: progress.quantity,
      isValid: progress.isValid,
      needed: progress.needed,
      required: progress.required,
      scope: "cart",
    },
  ];
  const errors = progress.isValid
    ? []
    : [
        `Cart has ${progress.quantity} bottles. Add ${progress.needed} more to reach the minimum of ${progress.required}.`,
      ];

  return fromProgress(progress, producerValidations, errors);
}

/**
 * Validates cart against channel minimum rules.
 * Kept async for call-site compatibility; logic is pure (no DB).
 *
 * Historical bug: this used to require multiples of 6 **per producer**, which
 * made a mixed 6-bottle B2C cart fail (e.g. required 12 / missing 10 for two
 * 1-bottle producers, or required 24 / missing 18 for four mixed lines).
 */
export async function validateSixBottleRule(
  cartItems: CartItem[],
  options: ValidateCartMinimumOptions = {},
): Promise<ValidationResult> {
  try {
    return validateCartMinimum(cartItems, options);
  } catch (error) {
    console.error("❌ [Validation] Error:", error);
    // Fail open — allow checkout if validation crashes unexpectedly.
    return emptyResult(options.channel ?? "b2c");
  }
}

/** Re-export tracking helper so UI and API share required/needed fields. */
export { cartMinimumTrackingMeta, B2C_CART_MIN_BOTTLES };
