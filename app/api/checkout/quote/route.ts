import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { CartService } from "@/src/lib/cart-service";
import {
  allocatePactRedemptionPoints,
  calculateBoostAwareMaxRedemption,
} from "@/lib/membership/pact-points-redemption-math";
import { getRedeemableBalance } from "@/lib/membership/pact-points-engine";
import { computeExpectedAmountOre } from "@/lib/checkout/expected-amount";
import { buildCheckoutQuote } from "@/lib/checkout/checkout-quote";
import {
  normalizeCheckoutShippingCountry,
  resolveAndChargeCheckoutShipping,
} from "@/lib/checkout/resolve-checkout-shipping";
import { resolveActiveGeoZoneForUser } from "@/lib/market/resolve-active-geo-zone";
import { parseFulfillmentChannel } from "@/lib/commerce/fulfillment-channel";
import { gateDirectBoxCheckoutRequest } from "@/lib/commerce/fulfillment-channel-server-gates";

type RequestBody = {
  pallet_id?: string;
  /** Optional ISO country; must match active zone when set (same as confirm). */
  country_code?: string;
  pact_points_redeem?: number;
  promo_discount_sek?: number;
  voucher_discount_sek?: number;
  /** Mode-scoped shipping — required for direct_box; defaults shared_pallet. */
  fulfillment_channel?: string;
  fulfillmentChannel?: string;
};

/**
 * Authoritative checkout money breakdown for display.
 * Same mode-scoped math as /api/checkout/payment-intent + confirm.
 * direct_box NEVER returns pact/99 SEK shipping.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyUnknown: unknown = await request.json().catch(() => null);
    const body = bodyUnknown as Partial<RequestBody> | null;

    const pallet_id =
      typeof body?.pallet_id === "string" ? body.pallet_id.trim() : "";
    const pact_points_redeem =
      typeof body?.pact_points_redeem === "number" ? body.pact_points_redeem : 0;
    const promoDiscountSek =
      typeof body?.promo_discount_sek === "number" &&
      Number.isFinite(body.promo_discount_sek)
        ? Math.max(0, body.promo_discount_sek)
        : 0;
    const voucherDiscountSek =
      typeof body?.voucher_discount_sek === "number" &&
      Number.isFinite(body.voucher_discount_sek)
        ? Math.max(0, body.voucher_discount_sek)
        : 0;

    const clientChannelRaw =
      typeof body?.fulfillment_channel === "string"
        ? body.fulfillment_channel
        : typeof body?.fulfillmentChannel === "string"
          ? body.fulfillmentChannel
          : null;
    const fulfillmentChannel =
      parseFulfillmentChannel(clientChannelRaw) ?? "shared_pallet";

    const cart = await CartService.getCart();
    if (!cart || !cart.lines?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const bottleCount = cart.lines.reduce(
      (s, l) => s + (Number(l.quantity) || 0),
      0,
    );
    const subtotalSek =
      parseFloat(String(cart.cost.totalAmount.amount)) || 0;

    const activeZone = await resolveActiveGeoZoneForUser(user.id);
    const zoneCountry = normalizeCheckoutShippingCountry(
      activeZone.countryCode,
    );
    const bodyCountry = normalizeCheckoutShippingCountry(
      typeof body?.country_code === "string" ? body.country_code : null,
    );
    const countryCode =
      bodyCountry && zoneCountry && bodyCountry === zoneCountry
        ? bodyCountry
        : zoneCountry;

    let shippingSek = 0;
    let shippingPending = false;
    let rateChannel: "pact" | "direct_box" | null = null;

    if (fulfillmentChannel === "direct_box") {
      const auth = await gateDirectBoxCheckoutRequest({
        clientChannelRaw: clientChannelRaw ?? "direct_box",
        selectedPalletId: pallet_id || null,
        countryCode,
        bottleCount,
        productSubtotalSek: subtotalSek,
      });
      if (!auth.ok) {
        return NextResponse.json(
          { error: auth.message, code: auth.errorCode },
          { status: auth.httpStatus },
        );
      }
      shippingSek = auth.plan.shippingSek;
      shippingPending = false;
      rateChannel = "direct_box";
      // Never fall through to shared pallet / pact 99.
    } else if (pallet_id) {
      const sbAdmin = getSupabaseAdmin();
      const { data: palletRow, error: palletErr } = await sbAdmin
        .from("pallets")
        .select(
          "bottle_capacity, id, name, cost_cents, last_mile_cost_cents_per_bottle",
        )
        .eq("id", pallet_id)
        .maybeSingle();

      if (palletErr) {
        console.error("[checkout/quote] pallet load:", palletErr);
        return NextResponse.json(
          { error: "Failed to resolve pallet" },
          { status: 500 },
        );
      }
      if (!palletRow) {
        return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
      }

      const charge = await resolveAndChargeCheckoutShipping({
        bottleCount,
        productSubtotalSek: subtotalSek,
        countryCode,
        fulfillmentMode: "shared_pallet",
        pallet: palletRow,
      });
      shippingSek = charge.shippingSek;
      shippingPending = charge.shippingPending;
      rateChannel = charge.rateChannel === "direct_box" ? "direct_box" : "pact";
    } else {
      // Shared without pallet — pending shipping, no invented fee.
      shippingSek = 0;
      shippingPending = true;
      rateChannel = null;
    }

    let boostedLineTotal = 0;
    let nonBoostedLineTotal = 0;
    for (const line of cart.lines) {
      const amt = parseFloat(String(line.cost.totalAmount.amount)) || 0;
      if (line.merchandise.product.producerBoostActive === true) {
        boostedLineTotal += amt;
      } else {
        nonBoostedLineTotal += amt;
      }
    }

    const availablePoints = await getRedeemableBalance(user.id);
    const { maxPoints } = calculateBoostAwareMaxRedemption(
      boostedLineTotal,
      nonBoostedLineTotal,
      availablePoints,
    );
    const pointsToRedeem = Math.min(
      Math.max(0, Math.floor(pact_points_redeem)),
      maxPoints,
    );
    const alloc = allocatePactRedemptionPoints(
      pointsToRedeem,
      boostedLineTotal,
      nonBoostedLineTotal,
    );

    const { amountOre, components } = await computeExpectedAmountOre({
      userId: user.id,
      cartId: cart.id,
      shippingSek,
      voucherSek: voucherDiscountSek,
      pactPointsSek: alloc.sekDiscount,
      promoSek: promoDiscountSek,
      displayMultiplier: 1,
      cart,
    });

    const quote = buildCheckoutQuote({
      components,
      amountOre,
      pactPointsRedeem: pointsToRedeem,
      shippingPending,
      fulfillmentChannel,
      rateChannel,
    });

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("[checkout/quote]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
