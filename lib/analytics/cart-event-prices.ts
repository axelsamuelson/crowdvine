import type { Cart, CartItem, Product } from "@/lib/shopify/types";
import { getProductListPriceSek } from "@/lib/price-breakdown";

/** Actual pay-per-bottle from a cart line (member + early-bird already in line total). */
export function unitPriceFromCartLine(line: CartItem): number {
  const qty = Math.max(1, Number(line.quantity) || 1);
  return (parseFloat(String(line.cost.totalAmount.amount)) || 0) / qty;
}

/** Catalog list price before member/early-bird (SEK). */
export function listPriceFromCartLine(line: CartItem): number {
  const original = line.merchandise?.product?.originalUnitPriceSek;
  if (typeof original === "number" && Number.isFinite(original) && original > 0) {
    return original;
  }
  return unitPriceFromCartLine(line);
}

function findLineForProduct(
  cart: Cart | null | undefined,
  productId: string,
): CartItem | undefined {
  if (!cart?.lines?.length) return undefined;
  const baseId = productId.replace(/-default$/, "");
  return cart.lines.find((line) => {
    const merchId = String(line.merchandise?.id ?? "");
    const prodId = String(line.merchandise?.product?.id ?? "");
    return (
      merchId === productId ||
      prodId === productId ||
      merchId === baseId ||
      prodId === baseId
    );
  });
}

/**
 * Prefer unit_price from CartService response after add; list_price from cart
 * catalog field (or product list price fallback).
 */
export function pricesFromCartAfterAdd(
  cart: Cart | null | undefined,
  productId: string,
  product?: Product | null,
): { list_price: number; unit_price: number } {
  const fallbackList =
    (product ? getProductListPriceSek(product) : null) ??
    (product
      ? parseFloat(String(product.priceRange?.minVariantPrice?.amount ?? "0")) ||
        0
      : 0);

  const line = findLineForProduct(cart, productId);
  if (!line) {
    return { list_price: fallbackList, unit_price: fallbackList };
  }

  const list_price = listPriceFromCartLine(line) || fallbackList;
  const unit_price = unitPriceFromCartLine(line);
  return { list_price, unit_price };
}

/** First-line list/unit for checkout_started (same currency as cart totals). */
export function pricesFromCheckoutCart(cart: Cart | null | undefined): {
  list_price: number;
  unit_price: number;
} {
  const line = cart?.lines?.[0];
  if (!line) return { list_price: 0, unit_price: 0 };
  return {
    list_price: listPriceFromCartLine(line),
    unit_price: unitPriceFromCartLine(line),
  };
}
