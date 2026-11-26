import { NextResponse } from "next/server";
import { alignCartCookieToDbId } from "@/lib/cart/align-cart-cookie";
import { CartService } from "@/src/lib/cart-service";

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { lineId, quantity } = body;

    if (!lineId || quantity === undefined) {
      return NextResponse.json(
        { error: "Missing lineId or quantity" },
        { status: 400 },
      );
    }

    if (quantity <= 0) {
      // Remove item if quantity is 0 or negative
      await CartService.removeItem(lineId);
    } else {
      await CartService.updateItem(lineId, quantity);
    }

    const cart = await CartService.getCart();
    if (cart?.id) await alignCartCookieToDbId(cart.id);
    return NextResponse.json(cart);
  } catch (error) {
    console.error("PUT /api/crowdvine/cart/lines/update error:", error);
    return NextResponse.json(
      { error: "Failed to update cart item" },
      { status: 500 },
    );
  }
}
