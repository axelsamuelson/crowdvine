"use server";

import { TAGS } from "@/lib/constants";
import { revalidateTag } from "next/cache";
import type { Cart } from "@/lib/shopify/types";
import { CartService } from "../../src/lib/cart-service";

export async function addItem(
  variantId: string | undefined,
): Promise<Cart | null> {
  console.log("=== ADD ITEM SERVER ACTION START ===");
  console.log("addItem server action called with variantId:", variantId);

  if (!variantId) {
    console.error("addItem: No variantId provided");
    return null;
  }

  try {
    // Extract base ID from variant ID (remove -default suffix)
    const baseId = variantId.replace("-default", "");
    console.log("Extracted base ID from variant ID:", { variantId, baseId });

    console.log("Calling CartService.addItem...");
    const cart = await CartService.addItem(baseId, 1);
    console.log("CartService.addItem completed with result:", cart);

    console.log("Calling revalidateTag...");
    revalidateTag(TAGS.cart);
    console.log("revalidateTag completed");

    // Invalidate localStorage cache
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cart-cache");
        localStorage.removeItem("cart-cache-time");
      } catch (error) {
        console.warn("Failed to clear cart cache:", error);
      }
    }

    console.log("=== ADD ITEM SERVER ACTION END ===");
    return cart;
  } catch (error) {
    console.error("=== ADD ITEM SERVER ACTION ERROR ===");
    console.error("addItem error:", error);
    console.error(
      "Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    console.error("=== ADD ITEM SERVER ACTION ERROR END ===");
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
    revalidateTag(TAGS.cart);

    // Invalidate localStorage cache
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("cart-cache");
        localStorage.removeItem("cart-cache-time");
      } catch (error) {
        console.warn("Failed to clear cart cache:", error);
      }
    }

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
