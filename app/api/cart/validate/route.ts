import { NextResponse } from "next/server";
import { validateSixBottleRule } from "@/lib/checkout-validation";
import { CartService } from "@/src/lib/cart-service";

/**
 * Validate current cart against 6-bottle rule
 */
export async function GET() {
  try {
    const cart = await CartService.getCart();
    
    if (!cart || cart.lines.length === 0) {
      return NextResponse.json({
        isValid: true,
        producerValidations: [],
        errors: [],
      });
    }

    const result = await validateSixBottleRule(cart.lines as any);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ [Validate API] Error:", error);
    // Fail open - allow checkout if validation crashes
    return NextResponse.json({
      isValid: true,
      producerValidations: [],
      errors: [],
    });
  }
}

