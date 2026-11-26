import { NextResponse } from "next/server";
import { alignCartCookieToDbId } from "@/lib/cart/align-cart-cookie";
import { CartService } from "@/src/lib/cart-service";

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lineId = searchParams.get("lineId");

    if (!lineId) {
      return NextResponse.json({ error: "Missing lineId" }, { status: 400 });
    }

    await CartService.removeItem(lineId);
    const cart = await CartService.getCart();
    if (cart?.id) await alignCartCookieToDbId(cart.id);
    return NextResponse.json(cart);
  } catch (error) {
    console.error("DELETE /api/crowdvine/cart/lines/remove error:", error);
    return NextResponse.json(
      { error: "Failed to remove cart item" },
      { status: 500 },
    );
  }
}
