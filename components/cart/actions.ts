"use server";

import { TAGS } from "@/lib/constants";
import { revalidateTag } from "next/cache";
import type { Cart } from "@/lib/shopify/types";
import { CartService } from "../../src/lib/cart-service";

export async function addItem(
  variantId: string | undefined,
): Promise<Cart | null> {
  if (!variantId) {
    console.error("addItem: No variantId provided");
    return null;
  }

  try {
    // Extract base ID from variant ID (remove -default suffix)
    const baseId = variantId.replace("-default", "");
    
    // Add item to cart
    const cart = await CartService.addItem(baseId, 1);
    
    // Note: We don't revalidateTag here because it causes unnecessary re-renders
    // The cart context will handle the UI update via setCart
    
    return cart;
  } catch (error) {
    console.error("addItem error:", error);
    return null;
  }
}

export async function updateItem({
  lineId,
  quantity,
}: {
  lineId: string;
  quantity: number;
}): Promise<Cart | null> {
  try {
    const cart = await CartService.updateItem(lineId, quantity);
    // Note: We don't revalidateTag here because it causes unnecessary re-renders
    // The cart context will handle the UI update via setCart
    return cart;
  } catch (error) {
    console.error("updateItem error:", error);
    return null;
  }
}

export async function createCartAndSetCookie() {
  try {
    const cart = await CartService.getCart();
    revalidateTag(TAGS.cart);
    return cart;
  } catch (error) {
    console.error("createCartAndSetCookie error:", error);
    return null;
  }
}

export async function getCart(): Promise<Cart | null> {
  try {
    return await CartService.getCart();
  } catch (error) {
    console.error("getCart error:", error);
    return null;
  }
}
