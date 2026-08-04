import { CartService } from "@/src/lib/cart-service";
import type { Cart } from "@/lib/shopify/types";

export type ExpectedAmountComponents = {
  subtotal: number;
  shippingSek: number;
  voucherSek: number;
  pactPointsSek: number;
  promoSek: number;
  displayMultiplier: number;
  finalMajor: number;
};

export type ExpectedAmountResult = {
  amountOre: number;
  components: ExpectedAmountComponents;
  cart: Cart;
};

/**
 * Single source of truth for Stripe expected_amount_ore / confirm validation.
 *
 * Order (exact):
 *   subtotal (CartService.getCart — member + early-bird already included)
 *   + shipping
 *   − voucher
 *   − pactPoints
 *   − promo
 *   × displayMultiplier
 *   → round to minor units (öre / cents)
 *
 * CartService amounts are already converted to the active display/charge currency,
 * so callers should pass displayMultiplier = 1 unless they intentionally use raw SEK.
 */
export async function computeExpectedAmountOre(args: {
  /** Reserved for logging / future cart lookup; CartService uses session cookies today. */
  cartId?: string | null;
  userId: string;
  shippingSek: number;
  voucherSek: number;
  pactPointsSek: number;
  promoSek: number;
  /** Default 1 — cart totals are already in Stripe charge currency major units. */
  displayMultiplier?: number;
  /** Optional preloaded cart to avoid a second getCart() in the same request. */
  cart?: Cart | null;
}): Promise<ExpectedAmountResult> {
  const cart = args.cart ?? (await CartService.getCart());
  if (!cart || !cart.lines?.length) {
    throw new Error("Cart is empty");
  }

  const subtotal = parseFloat(String(cart.cost.totalAmount.amount)) || 0;
  const shippingSek = Math.max(0, Number(args.shippingSek) || 0);
  const voucherSek = Math.max(0, Number(args.voucherSek) || 0);
  const pactPointsSek = Math.max(0, Number(args.pactPointsSek) || 0);
  const promoSek = Math.max(0, Number(args.promoSek) || 0);
  const displayMultiplier =
    Number.isFinite(args.displayMultiplier) && (args.displayMultiplier as number) > 0
      ? (args.displayMultiplier as number)
      : 1;

  const finalMajor = Math.max(
    0,
    subtotal + shippingSek - voucherSek - pactPointsSek - promoSek,
  );
  const amountOre = Math.round(finalMajor * displayMultiplier * 100);

  return {
    amountOre,
    cart,
    components: {
      subtotal,
      shippingSek,
      voucherSek,
      pactPointsSek,
      promoSek,
      displayMultiplier,
      finalMajor,
    },
  };
}

/** Compare two öre amounts within ±10 öre (same tolerance as confirm). */
export function amountsWithinTolerance(a: number, b: number, tol = 10): boolean {
  return Math.abs(a - b) <= tol;
}

/** Client major-unit total → öre for sanity checks (no FX). */
export function majorToOre(major: number): number {
  return Math.round((Number(major) || 0) * 100);
}
