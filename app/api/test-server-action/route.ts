import { NextResponse } from "next/server";
import { CartService } from "@/src/lib/cart-service";

export async function POST(request: Request) {
  try {
    console.log("🧪 Test server action API called");
    
    const body = await request.json();
    const { wineId } = body;
    
    console.log("🧪 Wine ID:", wineId);
    
    // Test CartService directly
    console.log("🧪 Calling CartService.addItem...");
    const cart = await CartService.addItem(wineId, 1);
    console.log("🧪 CartService.addItem returned:", cart ? "success" : "null");
    
    if (cart) {
      console.log("🧪 Cart has", cart.lines.length, "items, total quantity:", cart.totalQuantity);
    }
    
    return NextResponse.json({ 
      success: true, 
      cart: cart,
      message: "Server action test completed"
    });
  } catch (error) {
    console.error("🧪 Test server action error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
