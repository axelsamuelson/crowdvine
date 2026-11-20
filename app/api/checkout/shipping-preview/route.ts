import { NextResponse } from "next/server";
import { loadCustomerShippingRates } from "@/lib/customer-shipping-quote-server";
import { buildShippingPreview } from "@/lib/checkout/shipping-preview";
import { normalizeCheckoutShippingCountry } from "@/lib/checkout/resolve-checkout-shipping";
import { isDirectBoxCheckoutEnabled } from "@/lib/commerce/fulfillment-channel";

/**
 * Public shipping display amounts for checkout step 1 (postal known).
 * No auth — guests have no session until after address (B1).
 * Authoritative /api/checkout/quote still locks purchase.
 */
export async function POST(request: Request) {
  try {
    const bodyUnknown: unknown = await request.json().catch(() => null);
    const body = (bodyUnknown ?? {}) as {
      country_code?: string;
      bottle_count?: number;
      product_subtotal_sek?: number;
    };

    const countryCode = normalizeCheckoutShippingCountry(body.country_code);
    if (!countryCode) {
      return NextResponse.json(
        { error: "country_code_required" },
        { status: 400 },
      );
    }

    const bottleCount = Math.max(0, Math.floor(Number(body.bottle_count) || 0));
    if (bottleCount <= 0) {
      return NextResponse.json(
        { error: "bottle_count_required" },
        { status: 400 },
      );
    }

    const productSubtotalSek = Math.max(
      0,
      Number(body.product_subtotal_sek) || 0,
    );
    const rates = await loadCustomerShippingRates();
    const preview = buildShippingPreview({
      countryCode,
      bottleCount,
      productSubtotalSek,
      rates,
      directBoxEnabled: isDirectBoxCheckoutEnabled(),
    });

    return NextResponse.json({ preview });
  } catch (err) {
    console.error("[shipping-preview]", err);
    return NextResponse.json({ error: "preview_failed" }, { status: 500 });
  }
}
