import { NextResponse } from "next/server";
import { alignCartCookieToDbId } from "@/lib/cart/align-cart-cookie";
import { CartService } from "@/src/lib/cart-service";

export async function POST(request: Request) {
  try {
    console.log("🔧 API addItem called");

    const body = await request.json();
    const { variantId } = body;

    console.log("🔧 Variant ID:", variantId);

    if (!variantId) {
      console.error("addItem: No variantId provided");
      return NextResponse.json(
        { error: "No variantId provided" },
        { status: 400 },
      );
    }

    // Extract base ID from variant ID (remove -default suffix)
    const baseId = variantId.replace("-default", "");
    console.log("🔧 Extracted baseId:", baseId);

    // Add item to cart
    console.log("🔧 Calling CartService.addItem...");
    const cart = await CartService.addItem(baseId, 1);
    console.log("🔧 CartService.addItem returned:", cart ? "success" : "null");

    if (cart) {
      console.log(
        "🔧 Cart has",
        cart.lines.length,
        "items, total quantity:",
        cart.totalQuantity,
      );
    }

    if (!cart) {
      return NextResponse.json(
        { error: "Failed to add item to cart" },
        { status: 500 },
      );
    }

    await alignCartCookieToDbId(cart.id);

    return NextResponse.json({
      success: true,
      cart: cart,
    });
  } catch (error) {
    console.error("🔧 API addItem error:", error);
    console.error(
      "🔧 Error stack:",
      error instanceof Error ? error.stack : "No stack trace",
    );
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
