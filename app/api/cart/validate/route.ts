import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { isB2BHost } from "@/lib/b2b-site";
import type { CartMinimumChannel } from "@/lib/cart/cart-minimum";
import { validateSixBottleRule } from "@/lib/checkout-validation";
import { CartService } from "@/src/lib/cart-service";

// Simple in-memory cache for validation results
const validationCache = new Map<string, { result: any; timestamp: number }>();
const CACHE_DURATION = 5000; // 5 seconds cache

async function resolveChannel(): Promise<CartMinimumChannel> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    return isB2BHost(host, null) ? "b2b" : "b2c";
  } catch {
    return "b2c";
  }
}

function cacheKey(
  channel: CartMinimumChannel,
  lines: Array<{ id: string; quantity: number }>,
): string {
  return `${channel}:${JSON.stringify(lines)}`;
}

function pruneCache() {
  if (validationCache.size <= 50) return;
  const now = Date.now();
  for (const [key, value] of validationCache.entries()) {
    if (now - value.timestamp > CACHE_DURATION) {
      validationCache.delete(key);
    }
  }
}

/**
 * Validate current cart against channel minimum rules
 * (B2C: ≥6 bottles total; B2B: pack-sized lines).
 */
export async function GET() {
  try {
    const channel = await resolveChannel();
    const cart = await CartService.getCart();

    if (!cart || cart.lines.length === 0) {
      return NextResponse.json({
        isValid: true,
        channel,
        quantity: 0,
        requiredQuantity: channel === "b2c" ? 6 : 0,
        neededTotal: 0,
        producerValidations: [],
        errors: [],
      });
    }

    const key = cacheKey(
      channel,
      cart.lines.map((line) => ({
        id: line.merchandise.id,
        quantity: line.quantity,
      })),
    );

    const cached = validationCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.result);
    }

    const result = await validateSixBottleRule(cart.lines as any, { channel });

    validationCache.set(key, {
      result,
      timestamp: Date.now(),
    });
    pruneCache();

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ [Validate API] Error:", error);
    // Fail open - allow checkout if validation crashes
    return NextResponse.json({
      isValid: true,
      channel: "b2c",
      quantity: 0,
      requiredQuantity: 6,
      neededTotal: 0,
      producerValidations: [],
      errors: [],
    });
  }
}

/**
 * Validate provided cart against channel minimum rules.
 */
export async function POST(request: Request) {
  try {
    const channel = await resolveChannel();
    const body = await request.json();
    const { cart } = body;

    if (!cart || !cart.lines || cart.lines.length === 0) {
      return NextResponse.json({
        isValid: true,
        channel,
        quantity: 0,
        requiredQuantity: channel === "b2c" ? 6 : 0,
        neededTotal: 0,
        producerValidations: [],
        errors: [],
      });
    }

    const key = cacheKey(
      channel,
      cart.lines.map((line: any) => ({
        id: line.merchandise.id,
        quantity: line.quantity,
      })),
    );

    const cached = validationCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json(cached.result);
    }

    const result = await validateSixBottleRule(cart.lines as any, { channel });

    validationCache.set(key, {
      result,
      timestamp: Date.now(),
    });
    pruneCache();

    return NextResponse.json(result);
  } catch (error) {
    console.error("❌ [Validate API] POST Error:", error);
    // Fail open - allow checkout if validation crashes
    return NextResponse.json({
      isValid: true,
      channel: "b2c",
      quantity: 0,
      requiredQuantity: 6,
      neededTotal: 0,
      producerValidations: [],
      errors: [],
    });
  }
}
