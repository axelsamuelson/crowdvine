import type { Cart } from "@/lib/shopify/types";
import { isPalletBasedReservation } from "@/lib/commerce/is-pallet-based-reservation";
import type { ExitDiscountScope } from "@/lib/exit-discount/config";

/**
 * Member + early-bird are already included in cart.cost (CartService).
 * Any line with hasDiscount / discountLabel means those prices are active.
 */
export function cartHasMemberOrEarlyBirdDiscount(
  cart: Cart | null | undefined,
): boolean {
  if (!cart?.lines?.length) return false;
  for (const line of cart.lines) {
    if (line.discountLabel && String(line.discountLabel).trim().length > 0) {
      return true;
    }
    if (line.merchandise?.product?.hasDiscount === true) {
      return true;
    }
    const original = Number(line.merchandise?.product?.originalUnitPriceSek);
    const qty = Number(line.quantity) || 0;
    const lineTotal = parseFloat(String(line.cost?.totalAmount?.amount)) || 0;
    if (
      Number.isFinite(original) &&
      original > 0 &&
      qty > 0 &&
      lineTotal + 0.01 < original * qty
    ) {
      return true;
    }
  }
  return false;
}

export function isExitDiscountOrderInScope(opts: {
  scope: ExitDiscountScope;
  palletId?: string | null;
  fulfillmentChannel?: string | null;
}): boolean {
  if (opts.scope === "all") return true;
  return isPalletBasedReservation({
    pallet_id: opts.palletId,
    fulfillment_channel: opts.fulfillmentChannel,
  });
}

export function normalizeEmail(email: string | null | undefined): string {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/** Statuses that count as a prior order for "första beställning". */
export const EXIT_DISCOUNT_PRIOR_ORDER_STATUSES = [
  "pending_payment",
  "pending_producer_approval",
  "placed",
  "approved",
  "partly_approved",
  "confirmed",
] as const;
