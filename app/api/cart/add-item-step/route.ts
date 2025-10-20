import { NextResponse } from "next/server";
import { CartService } from "@/src/lib/cart-service";

export async function POST(request: Request) {
  try {
    console.log("🔧 Step-by-step API addItem called");

    // Step 1: Parse request
    console.log("🔧 Step 1: Parsing request...");
    const body = await request.json();
    const { variantId } = body;
    console.log("🔧 Step 1: Variant ID:", variantId);

    if (!variantId) {
      console.error("🔧 Step 1: No variantId provided");
      return NextResponse.json(
        { error: "No variantId provided" },
        { status: 400 },
      );
    }

    // Step 2: Extract base ID
    console.log("🔧 Step 2: Extracting base ID...");
    const baseId = variantId.replace("-default", "");
    console.log("🔧 Step 2: Base ID:", baseId);

    // Step 3: Test CartService import
    console.log("🔧 Step 3: Testing CartService import...");
    console.log("🔧 Step 3: CartService:", typeof CartService);

    // Step 4: Test ensureCart
    console.log("🔧 Step 4: Testing ensureCart...");
    try {
      const cartId = await CartService.ensureCart();
      console.log("🔧 Step 4: Cart ID:", cartId);
    } catch (ensureError) {
      console.error("🔧 Step 4: ensureCart error:", ensureError);
      return NextResponse.json({ error: "ensureCart failed" }, { status: 500 });
    }

    // Step 5: Test getCart
    console.log("🔧 Step 5: Testing getCart...");
    try {
      const currentCart = await CartService.getCart();
      console.log("🔧 Step 5: Current cart:", currentCart ? "exists" : "null");
      if (currentCart) {
        console.log("🔧 Step 5: Cart items:", currentCart.lines.length);
      }
    } catch (getCartError) {
      console.error("🔧 Step 5: getCart error:", getCartError);
      return NextResponse.json({ error: "getCart failed" }, { status: 500 });
    }

    // Step 6: Test addItem
    console.log("🔧 Step 6: Testing addItem...");
    try {
      const cart = await CartService.addItem(baseId, 1);
      console.log("🔧 Step 6: addItem result:", cart ? "success" : "null");

      if (cart) {
        console.log(
          "🔧 Step 6: Cart has",
          cart.lines.length,
          "items, total quantity:",
          cart.totalQuantity,
        );
      }

      if (!cart) {
        return NextResponse.json(
          { error: "addItem returned null" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        cart: cart,
        steps: "All steps completed successfully",
      });
    } catch (addItemError) {
      console.error("🔧 Step 6: addItem error:", addItemError);
      return NextResponse.json({ error: "addItem failed" }, { status: 500 });
    }
  } catch (error) {
    console.error("🔧 Step-by-step API error:", error);
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
