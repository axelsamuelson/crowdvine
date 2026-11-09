/**
 * Dual-offer compare quotes — OFF by default.
 * Requires CHECKOUT_DUAL_OFFER_COMPARE=true. Never enables live direct checkout
 * (DIRECT_BOX_CHECKOUT_ENABLED stays independent and default OFF).
 * Synthetic direct pricing is explicitly labeled when live direct rates unavailable.
 */
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
import {
  isDirectBoxCheckoutEnabled,
} from "@/lib/commerce/fulfillment-channel";
import { gateDirectBoxCheckoutRequest } from "@/lib/commerce/fulfillment-channel-server-gates";
import {
  buildDualOfferQuoteSet,
  buildOfferQuote,
  buildUnavailableOfferQuote,
  type OfferLineSnapshot,
} from "@/lib/checkout/offer-quote";
import { isDualOfferCheckoutSurfaceAllowed } from "@/lib/checkout/dual-offer-surface-gate";
import { previewVisibleMethods } from "@/lib/checkout/offer-payment-methods";
import { computeSharedPalletChargeDeadlineIso } from "@/lib/checkout/shared-pallet-deadline";

export const dynamic = "force-dynamic";

type Body = {
  pallet_id?: string;
  country_code?: string;
  pact_points_redeem?: number;
  promo_discount_sek?: number;
  voucher_discount_sek?: number;
  /** When true, build synthetic direct compare if live direct cannot quote. */
  allow_synthetic_direct?: boolean;
};

export async function POST(request: Request) {
  try {
    // Flag OFF by default; production (non-preview) denied even if flag set.
    if (!isDualOfferCheckoutSurfaceAllowed()) {
      return NextResponse.json(
        { error: "not_found", code: "dual_offer_compare_disabled" },
        { status: 404 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyUnknown: unknown = await request.json().catch(() => null);
    const body = bodyUnknown as Partial<Body> | null;
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
    // Legacy body flag ignored: customer checkout never invents synthetic direct.
    void body?.allow_synthetic_direct;

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

    const wine_lines: OfferLineSnapshot[] = cart.lines.map((line) => {
      const qty = Number(line.quantity) || 0;
      const lineTotal = parseFloat(String(line.cost.totalAmount.amount)) || 0;
      const unit = qty > 0 ? Math.round((lineTotal / qty) * 100) / 100 : 0;
      return {
        wine_id: String(line.merchandise?.product?.id ?? line.id ?? "unknown"),
        quantity: qty,
        unit_price_sek: unit,
        line_total_sek: lineTotal,
      };
    });

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

    // --- shared_pallet offer ---
    let shared = buildUnavailableOfferQuote({
      offer: "shared_pallet",
      reason: "pallet_required",
      destination_country: countryCode,
      user_id: user.id,
      cart_id: String(cart.id),
    });

    if (pallet_id) {
      const sbAdmin = getSupabaseAdmin();
      const { data: palletRow, error: palletErr } = await sbAdmin
        .from("pallets")
        .select(
          "bottle_capacity, id, name, cost_cents, last_mile_cost_cents_per_bottle, created_at",
        )
        .eq("id", pallet_id)
        .maybeSingle();

      if (!palletErr && palletRow) {
        const charge = await resolveAndChargeCheckoutShipping({
          bottleCount,
          productSubtotalSek: subtotalSek,
          countryCode,
          fulfillmentMode: "shared_pallet",
          pallet: palletRow,
        });
        const { amountOre, components } = await computeExpectedAmountOre({
          userId: user.id,
          cartId: cart.id,
          shippingSek: charge.shippingSek,
          voucherSek: voucherDiscountSek,
          pactPointsSek: alloc.sekDiscount,
          promoSek: promoDiscountSek,
          displayMultiplier: 1,
          cart,
        });
        const money = buildCheckoutQuote({
          components,
          amountOre,
          pactPointsRedeem: pointsToRedeem,
          shippingPending: charge.shippingPending,
          fulfillmentChannel: "shared_pallet",
          rateChannel:
            charge.rateChannel === "direct_box" ? "direct_box" : "pact",
        });
        const palletCreatedAt =
          palletRow &&
          typeof (palletRow as { created_at?: unknown }).created_at === "string"
            ? (palletRow as { created_at: string }).created_at
            : null;
        shared = buildOfferQuote({
          offer: "shared_pallet",
          money,
          wine_lines,
          destination_country: countryCode,
          pricing_source: "live_catalog",
          user_id: user.id,
          cart_id: String(cart.id),
          unavailable_reason: charge.shippingPending
            ? "shipping_pending"
            : null,
          charge_deadline_at:
            computeSharedPalletChargeDeadlineIso(palletCreatedAt),
        });
      } else {
        shared = buildUnavailableOfferQuote({
          offer: "shared_pallet",
          reason: palletErr ? "pallet_load_failed" : "pallet_not_found",
          destination_country: countryCode,
          user_id: user.id,
          cart_id: String(cart.id),
        });
      }
    }

    // --- direct_box offer ---
    let direct = buildUnavailableOfferQuote({
      offer: "direct_box",
      reason: "direct_box_disabled",
      destination_country: countryCode,
      user_id: user.id,
      cart_id: String(cart.id),
    });

    if (isDirectBoxCheckoutEnabled()) {
      const auth = await gateDirectBoxCheckoutRequest({
        clientChannelRaw: "direct_box",
        selectedPalletId: null,
        countryCode,
        bottleCount,
        productSubtotalSek: subtotalSek,
      });
      if (auth.ok) {
        const { amountOre, components } = await computeExpectedAmountOre({
          userId: user.id,
          cartId: cart.id,
          shippingSek: auth.plan.shippingSek,
          voucherSek: voucherDiscountSek,
          pactPointsSek: alloc.sekDiscount,
          promoSek: promoDiscountSek,
          displayMultiplier: 1,
          cart,
        });
        const money = buildCheckoutQuote({
          components,
          amountOre,
          pactPointsRedeem: pointsToRedeem,
          shippingPending: false,
          fulfillmentChannel: "direct_box",
          rateChannel: "direct_box",
        });
        // Live catalog bottle prices today — relative uplift is NOT applied
        // until product sets absolute/relative pricing. Same wine rows as shared
        // for compare honesty when flag is on but rates exist for shipping only.
        direct = buildOfferQuote({
          offer: "direct_box",
          money,
          wine_lines,
          destination_country: countryCode,
          pricing_source: "live_catalog",
          user_id: user.id,
          cart_id: String(cart.id),
        });
      } else {
        direct = buildUnavailableOfferQuote({
          offer: "direct_box",
          reason: auth.errorCode || "direct_box_gate_failed",
          destination_country: countryCode,
          user_id: user.id,
          cart_id: String(cart.id),
        });
      }
    }
    // Customer checkout: never invent synthetic direct when the flag is OFF.
    // /dev review uses in-process fixtures, not this route's synthetic branch.

    const dual = buildDualOfferQuoteSet({
      cart_id: String(cart.id),
      shared_pallet: shared,
      // Omit direct from the compare set entirely when the flag is OFF.
      direct_box: isDirectBoxCheckoutEnabled() ? direct : null,
      destination_country: countryCode,
    });

    return NextResponse.json({
      dual,
      method_preview: {
        shared_pallet: previewVisibleMethods("shared_pallet"),
        direct_box: isDirectBoxCheckoutEnabled()
          ? previewVisibleMethods("direct_box")
          : [],
      },
      flags: {
        dual_offer_compare: true,
        direct_box_checkout_enabled: isDirectBoxCheckoutEnabled(),
        synthetic_direct_used: false,
      },
      notice: null,
    });
  } catch (error) {
    console.error("[checkout/offer-quotes]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
