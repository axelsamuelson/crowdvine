import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { CartService } from "@/src/lib/cart-service";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import {
  allocatePactRedemptionPoints,
  calculateBoostAwareMaxRedemption,
} from "@/lib/membership/pact-points-redemption-math";
import { getRedeemableBalance } from "@/lib/membership/pact-points-engine";
import { determineZones } from "@/lib/zone-matching";
import {
  CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
  US_CONDITIONAL_TERMS_VERSION,
  getCountryMarketMode,
  isValidUsStateCode,
} from "@/lib/countries";
import {
  legacyMarketModeFromResolved,
  resolveMarketForCountry,
} from "@/lib/market/resolve-market";
import { resolveActiveGeoZoneForUser } from "@/lib/market/resolve-active-geo-zone";
import {
  isZoneDeliveryCompleteForActiveGeo,
  userZoneRowToDeliveryLines,
  type UserZoneAddressTemplate,
} from "@/lib/checkout/user-zone-delivery-template";

type PaymentMode = "setup_intent" | "payment_intent";

/** Pallet is past deferred-card-save phase → checkout collects with PaymentIntent. */
const PALLET_DIRECT_CHARGE_STATUSES = new Set([
  "shipping_ordered",
  "complete",
  "awaiting_pickup",
  "picked_up",
  "in_transit",
  "out_for_delivery",
  "shipped",
  "delivered",
]);

function palletUsesPaymentIntent(status: string | null | undefined): boolean {
  return PALLET_DIRECT_CHARGE_STATUSES.has(
    String(status ?? "").toLowerCase().trim(),
  );
}

/**
 * Contract: `cart_total_sek` must represent the server-calculable order total BEFORE PACT Points:
 *
 *   Subtotal (early-bird + member discounts already applied)
 * + Shipping
 * - Voucher discount (if active)
 * = cart_total_sek
 *
 * PACT Points are NOT subtracted at this point. This endpoint subtracts them based on `pact_points_redeem`.
 *
 * The server will re-calculate and validate the final amount during /api/checkout/confirm.
 */
type RequestBody = {
  pallet_id: string;
  cart_total_sek: number;
  pact_points_redeem?: number;
  /** US conditional checkout: required when profile country is US */
  us_age_21_confirmed?: boolean;
  us_conditional_ack?: boolean;
};

export async function POST(request: Request) {
  const PALLET_THRESHOLD = 300;

  try {
    console.log("=== CHECKOUT PAYMENT INTENT START ===");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!stripe) {
      console.error("[payment-intent] Stripe not configured");
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    // Helpful guard: prevent confusing client errors when keys are mixed (pk_test + sk_live, etc.)
    const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
    const sk = process.env.STRIPE_SECRET_KEY ?? "";
    const pkMode = pk.startsWith("pk_live_")
      ? "live"
      : pk.startsWith("pk_test_")
        ? "test"
        : "unknown";
    const skMode = sk.startsWith("sk_live_")
      ? "live"
      : sk.startsWith("sk_test_")
        ? "test"
        : "unknown";
    if (pkMode !== "unknown" && skMode !== "unknown" && pkMode !== skMode) {
      console.error("[payment-intent] Stripe key mode mismatch:", {
        pkMode,
        skMode,
      });
      return NextResponse.json(
        {
          error:
            "Stripe keys are misconfigured (publishable key mode does not match secret key mode).",
        },
        { status: 503 },
      );
    }

    const bodyUnknown: unknown = await request.json().catch(() => null);
    const body = bodyUnknown as Partial<RequestBody> | null;

    const pallet_id = typeof body?.pallet_id === "string" ? body.pallet_id : "";
    const cart_total_sek =
      typeof body?.cart_total_sek === "number" ? body.cart_total_sek : NaN;
    const pact_points_redeem =
      typeof body?.pact_points_redeem === "number" ? body.pact_points_redeem : 0;

    if (!pallet_id) {
      return NextResponse.json({ error: "Missing pallet_id" }, { status: 400 });
    }

    if (!Number.isFinite(cart_total_sek) || cart_total_sek <= 0) {
      return NextResponse.json(
        { error: "cart_total_sek must be > 0" },
        { status: 400 },
      );
    }

    const sbAdmin = getSupabaseAdmin();

    const { data: palletRow, error: palletErr } = await sbAdmin
      .from("pallets")
      .select("bottle_capacity, status")
      .eq("id", pallet_id)
      .maybeSingle();

    if (palletErr) {
      console.error("[payment-intent] Failed to load pallet:", palletErr);
      return NextResponse.json(
        { error: "Failed to resolve pallet" },
        { status: 500 },
      );
    }
    if (!palletRow) {
      return NextResponse.json({ error: "Pallet not found" }, { status: 404 });
    }

    const bottlesFilled = await sumReservedBottlesOnPallet(pallet_id);
    const palletStatusStr =
      typeof palletRow.status === "string" ? palletRow.status : "";
    const palletStatusResponse = palletStatusStr || null;

    // Compute boost-aware max redemption using current cart lines.
    const cart = await CartService.getCart();
    if (!cart || !cart.lines?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const active = await resolveActiveGeoZoneForUser(user.id);
    let zoneTemplate: UserZoneAddressTemplate | null = null;
    if (active.geoZoneId) {
      const { data: zr, error: zrErr } = await sbAdmin
        .from("user_zone_addresses")
        .select("*")
        .eq("user_id", user.id)
        .eq("geo_zone_id", active.geoZoneId)
        .maybeSingle();
      if (zrErr) {
        console.error("[payment-intent] zone address load:", zrErr.message);
        return NextResponse.json(
          { error: "Failed to load delivery details for your wine zone" },
          { status: 500 },
        );
      }
      zoneTemplate = zr as UserZoneAddressTemplate | null;
    }

    const delivery = userZoneRowToDeliveryLines(zoneTemplate);
    if (!isZoneDeliveryCompleteForActiveGeo(active, delivery)) {
      return NextResponse.json(
        {
          error: `Add delivery details for ${active.displayName} before paying.`,
        },
        { status: 400 },
      );
    }

    const street = delivery!.street;
    const city = delivery!.city;
    const postal = delivery!.postal;
    const countryCode = delivery!.countryCode;

    const marketMode = getCountryMarketMode(countryCode);
    if (marketMode === "unsupported") {
      return NextResponse.json(
        { error: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE },
        { status: 422 },
      );
    }

    const resolvedMarket = await resolveMarketForCountry({
      countryCode: active.countryCode,
      regionCode: active.regionCode,
    });
    const derivedMarketMode = legacyMarketModeFromResolved(resolvedMarket);
    if (derivedMarketMode !== marketMode) {
      console.warn("[payment-intent] Market resolver vs getCountryMarketMode mismatch", {
        countryCode,
        legacy: marketMode,
        derived: derivedMarketMode,
        resolvedMarket,
      });
    }

    if (
      !resolvedMarket.isCheckoutEligible &&
      !resolvedMarket.isConditionalReservationEligible
    ) {
      return NextResponse.json(
        {
          error:
            resolvedMarket.reason?.trim() ||
            CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
        },
        { status: 422 },
      );
    }

    const usConditional =
      resolvedMarket.checkoutMode === "conditional_reservation" &&
      resolvedMarket.isConditionalReservationEligible;
    let usStateUpper: string | null = null;

    if (usConditional) {
      usStateUpper = delivery!.regionCode?.trim().toUpperCase() ?? null;
      if (!usStateUpper || !isValidUsStateCode(usStateUpper)) {
        return NextResponse.json(
          {
            error:
              "Add a valid two-letter US state or territory to your zone delivery details before continuing.",
          },
          { status: 400 },
        );
      }
      if (
        body?.us_age_21_confirmed !== true ||
        body?.us_conditional_ack !== true
      ) {
        return NextResponse.json(
          {
            error:
              "Confirm that you are 21 or older and that you understand this is a conditional reservation.",
          },
          { status: 400 },
        );
      }
    }

    const paymentMode: PaymentMode = usConditional
      ? "setup_intent"
      : palletUsesPaymentIntent(palletStatusStr)
        ? "payment_intent"
        : "setup_intent";

    console.log("[payment-intent] Mode decision:", {
      pallet_id,
      bottlesFilled,
      palletThreshold: PALLET_THRESHOLD,
      paymentMode,
      palletStatus: palletRow.status,
      palletCapacity: palletRow.bottle_capacity,
      usConditional,
    });

    const zones = await determineZones(cart.lines as never, {
      postcode: postal,
      city,
      countryCode,
    });

    if (zones.noDeliveryZone?.error === "UNSUPPORTED_COUNTRY") {
      return NextResponse.json(
        { error: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE },
        { status: 422 },
      );
    }

    if (usConditional) {
      if (zones.noDeliveryZone?.error === "NO_DELIVERY_ZONE") {
        return NextResponse.json(
          {
            error:
              zones.noDeliveryZone.message?.trim() ||
              "No pallet is available for this conditional reservation.",
          },
          { status: 422 },
        );
      }
    } else {
      if (!zones.deliveryZoneId) {
        return NextResponse.json(
          {
            error:
              zones.noDeliveryZone?.message?.trim() ||
              "No delivery zone matches your address.",
          },
          { status: 422 },
        );
      }
    }

    let palletAllowed = zones.pallets?.some((p) => p.id === pallet_id) ?? false;
    if (!palletAllowed && zones.deliveryZoneId) {
      const { data: pRow } = await sbAdmin
        .from("pallets")
        .select("id, delivery_zone_id")
        .eq("id", pallet_id)
        .maybeSingle();
      const dz =
        pRow && typeof pRow === "object"
          ? (pRow as { delivery_zone_id?: string | null }).delivery_zone_id
          : null;
      palletAllowed = typeof dz === "string" && dz === zones.deliveryZoneId;
    }
    if (!palletAllowed) {
      return NextResponse.json(
        {
          error:
            "This pallet is not available for your delivery address. Refresh checkout or choose another address.",
        },
        { status: 422 },
      );
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

    const requested = Math.max(0, Math.floor(pact_points_redeem));
    const pointsToRedeem = Math.min(requested, maxPoints);

    const alloc = allocatePactRedemptionPoints(
      pointsToRedeem,
      boostedLineTotal,
      nonBoostedLineTotal,
    );

    const finalAmountSek = Math.max(0, cart_total_sek - alloc.sekDiscount);
    const amountInOre = Math.round(finalAmountSek * 100);

    if (amountInOre <= 0) {
      return NextResponse.json(
        { error: "Order total cannot be zero" },
        { status: 400 },
      );
    }

    const customerId = await getOrCreateStripeCustomer(user.id);

    if (paymentMode === "setup_intent") {
      const existingIntents = await stripe.setupIntents.list({
        customer: customerId,
        limit: 8,
      });

      const existing = existingIntents.data.find((si) => {
        const meta = si.metadata ?? {};
        const isConditional = meta.reservation_mode === "conditional";
        if (usConditional !== isConditional) return false;
        if (
          usConditional &&
          (meta.region !== usStateUpper ||
            meta.country_code !== "US" ||
            meta.market_code !== "US")
        ) {
          return false;
        }
        return (
          meta.pallet_id === pallet_id &&
          meta.expected_amount_ore === String(amountInOre) &&
          si.status === "requires_payment_method"
        );
      });

      if (existing?.client_secret) {
        console.log("[payment-intent] Reusing open SetupIntent:", existing.id);
        return NextResponse.json({
          paymentMode,
          clientSecret: existing.client_secret,
          intentId: existing.id,
          amountInOre,
          bottlesFilled,
          palletStatus: palletStatusResponse,
          palletThreshold: PALLET_THRESHOLD,
        });
      }

      const metadata: Record<string, string> = {
        user_id: user.id,
        pallet_id,
        pact_points_redeem: String(pointsToRedeem),
        expected_amount_ore: String(amountInOre),
      };
      if (usConditional && usStateUpper) {
        metadata.country_code = "US";
        metadata.region = usStateUpper;
        metadata.market_code = "US";
        metadata.reservation_mode = "conditional";
        metadata.age_21_confirmed = "true";
        metadata.conditional_ack_confirmed = "true";
        metadata.terms_version = US_CONDITIONAL_TERMS_VERSION;
      }

      const intent = await stripe.setupIntents.create({
        customer: customerId,
        ...(usConditional
          ? { payment_method_types: ["card"] }
          : { automatic_payment_methods: { enabled: true } }),
        usage: "off_session",
        metadata,
      });

      console.log("[payment-intent] Created SetupIntent:", intent.id);

      return NextResponse.json({
        paymentMode,
        clientSecret: intent.client_secret,
        intentId: intent.id,
        amountInOre,
        bottlesFilled,
        palletStatus: palletStatusResponse,
        palletThreshold: PALLET_THRESHOLD,
      });
    }

    if (usConditional) {
      return NextResponse.json(
        { error: "US reservations require card verification only (no immediate charge)." },
        { status: 400 },
      );
    }

    const intent = await stripe.paymentIntents.create({
      customer: customerId,
      amount: amountInOre,
      currency: "sek",
      automatic_payment_methods: { enabled: true },
      capture_method: "automatic",
      metadata: {
        user_id: user.id,
        pallet_id,
        pact_points_redeem: String(pointsToRedeem),
      },
    });

    console.log("[payment-intent] Created PaymentIntent:", intent.id);

    return NextResponse.json({
      paymentMode,
      clientSecret: intent.client_secret,
      intentId: intent.id,
      amountInOre,
      bottlesFilled,
      palletStatus: palletStatusResponse,
      palletThreshold: PALLET_THRESHOLD,
    });
  } catch (error) {
    console.error("=== CHECKOUT PAYMENT INTENT ERROR ===");
    console.error(error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

