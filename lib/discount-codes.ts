export type PromoDiscountType = "percent" | "sek";
export type PromoDiscountAppliesTo = "order" | "item";

export type PromoDiscountCartItem = {
  wine_id: string;
  quantity: number;
  unit_price: number;
};

export type PromoDiscountCodeRow = {
  id: string;
  code: string;
  type: PromoDiscountType;
  value: number;
  applies_to: PromoDiscountAppliesTo;
};

/**
 * Calculate SEK deduction for a promo code.
 * - percent/order: floor(cart_value * value / 100)
 * - sek/order: min(value, cart_value)
 * - percent/item: sum floor(unit_price * qty * value / 100)
 * - sek/item: min(value, unit_price) * qty per line (cap per unit, not line total)
 */
export function calculatePromoDiscountAmountSek(params: {
  type: PromoDiscountType;
  value: number;
  applies_to: PromoDiscountAppliesTo;
  cart_value_sek: number;
  items: PromoDiscountCartItem[];
}): number {
  const { type, value, applies_to, cart_value_sek, items } = params;
  const cart = Math.max(0, Number(cart_value_sek) || 0);
  const v = Number(value) || 0;
  if (v <= 0 || cart <= 0) return 0;

  if (applies_to === "order") {
    if (type === "percent") {
      return Math.floor((cart * v) / 100);
    }
    return Math.min(v, cart);
  }

  // applies_to === "item"
  let sum = 0;
  for (const item of items) {
    const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
    const unit = Math.max(0, Number(item.unit_price) || 0);
    if (qty <= 0 || unit <= 0) continue;
    if (type === "percent") {
      sum += Math.floor((unit * qty * v) / 100);
    } else {
      sum += Math.min(v, unit) * qty;
    }
  }
  return Math.min(sum, cart);
}
