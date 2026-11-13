/**
 * Checkout pallet fill status helpers (CRO-facing dual-offer block).
 *
 * Fill count policy: INCLUDE the customer's own cart bottles that will join
 * this shared pallet. Always show the count text (no "opened" prefix).
 * Progress bar: only when fillRatio >= PALLET_BAR_MIN_FILL (default 15%).
 *
 * Coverage-close (Axel 2026-11-11): pass `capacity` = bottles needed for the
 * CURRENT threshold (Y in "X av Y flaskor"), recomputed when the threshold
 * drops — never a countdown/deadline.
 */

export const CHECKOUT_PALLET_FILL_INCLUDES_CUSTOMER_CART = true as const;

/**
 * Below this fraction of capacity, hide the progress bar (count text still shown).
 * CRO: 0.15 — change in one place when A/B decides otherwise.
 */
export const PALLET_BAR_MIN_FILL = 0.15;

/** @deprecated Use PALLET_BAR_MIN_FILL — kept for import stability. */
export const CHECKOUT_PALLET_FILL_OPENED_THRESHOLD = PALLET_BAR_MIN_FILL;

export type CheckoutPalletFillInput = {
  palletId: string | null | undefined;
  /** Reserved bottles already on the pallet (excludes this cart). */
  reservedBottles: number | null | undefined;
  /** Physical capacity (denominator). */
  capacity: number | null | undefined;
  /** Bottles in the customer's cart that will join this pallet. */
  cartBottles: number | null | undefined;
  /**
   * When false, zone/fill aggregation failed or was skipped — hide the
   * component entirely (never invent a zero from a failed query).
   */
  fillAvailable?: boolean;
};

export type CheckoutPalletFillDisplay = {
  palletId: string;
  fillCount: number;
  capacity: number;
  /** 0–100 for the thin progress bar. */
  fillPercent: number;
  /** True when fillRatio >= PALLET_BAR_MIN_FILL. */
  showBar: boolean;
  /**
   * @deprecated Always false — opened prefix removed; count text is universal.
   */
  useOpenedCopy: boolean;
  includesCustomerCart: typeof CHECKOUT_PALLET_FILL_INCLUDES_CUSTOMER_CART;
};

/**
 * Returns null when fill data is missing/stale — caller must hide the UI.
 */
export function resolveCheckoutPalletFillDisplay(
  input: CheckoutPalletFillInput,
): CheckoutPalletFillDisplay | null {
  if (input.fillAvailable === false) return null;

  const palletId = String(input.palletId ?? "").trim();
  if (!palletId) return null;

  // null/undefined reserved = missing/stale (distinct from a real empty pallet = 0).
  if (input.reservedBottles == null) return null;
  if (input.capacity == null) return null;

  const reserved = Number(input.reservedBottles);
  const capacity = Number(input.capacity);
  const cartRaw = Number(input.cartBottles ?? 0);

  if (!Number.isFinite(reserved) || reserved < 0) return null;
  if (!Number.isFinite(capacity) || capacity <= 0) return null;
  if (!Number.isFinite(cartRaw) || cartRaw < 0) return null;

  const cartBottles = CHECKOUT_PALLET_FILL_INCLUDES_CUSTOMER_CART
    ? Math.round(cartRaw)
    : 0;
  const fillCount = Math.round(reserved) + cartBottles;
  const fillRatio = fillCount / capacity;
  const fillPercent = Math.max(
    0,
    Math.min(100, Math.round(fillRatio * 1000) / 10),
  );

  return {
    palletId,
    fillCount,
    capacity: Math.round(capacity),
    fillPercent,
    showBar: fillRatio >= PALLET_BAR_MIN_FILL,
    useOpenedCopy: false,
    includesCustomerCart: CHECKOUT_PALLET_FILL_INCLUDES_CUSTOMER_CART,
  };
}
