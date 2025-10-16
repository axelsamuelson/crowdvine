import { NextResponse } from "next/server";
import { validateSixBottleRule } from "@/lib/checkout-validation";
import { CartService } from "@/src/lib/cart-service";

// Simple in-memory cache for validation results
const validationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache

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

    // Create cache key based on cart contents
    const cacheKey = JSON.stringify(cart.lines.map(line => ({
      id: line.merchandise.id,
      quantity: line.quantity
    })));

    // Check cache first
    const cached = validationCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log("🚀 [Validate API] Using cached result");
      return NextResponse.json(cached.result);
    }

    console.log("🔍 [Validate API] Running validation");
    const result = await validateSixBottleRule(cart.lines as any);
    
    // Cache the result
    validationCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });

    // Clean up old cache entries
    if (validationCache.size > 50) {
      const now = Date.now();
      for (const [key, value] of validationCache.entries()) {
        if ((now - value.timestamp) > CACHE_DURATION) {
          validationCache.delete(key);
        }
      }
    }
    
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

