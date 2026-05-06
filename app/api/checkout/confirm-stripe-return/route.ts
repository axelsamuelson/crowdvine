import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { CartService } from "@/src/lib/cart-service";
import { determineZones, type DeliveryAddress } from "@/lib/zone-matching";
import { calculateCartShippingCost } from "@/lib/shipping-calculations";
import {
  allocatePactRedemptionPoints,
  calculateBoostAwareMaxRedemption,
} from "@/lib/membership/pact-points-redemption-math";
import { getRedeemableBalance } from "@/lib/membership/pact-points-engine";
import {
  CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
  US_CONDITIONAL_TERMS_VERSION,
  getCountryCodeFromProfileCountry,
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

type IntentType = "setup_intent" | "payment_intent";

function envStripeMode(): "live" | "test" | "unknown" {
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  if (sk.startsWith("sk_live_")) return "live";
  if (sk.startsWith("sk_test_")) return "test";
  return "unknown";
}

function retryableMessage(): string {
  return "Your payment method could not be verified. Please try again or use another card.";
}

export async function POST(request: Request) {
  try {
    if (!stripe) {
      return NextResponse.json({ success: false, error: "Stripe not configured" }, { status: 503 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const bodyUnknown: unknown = await request.json().catch(() => null);
    const body =
      bodyUnknown && typeof bodyUnknown === "object"
        ? (bodyUnknown as { intentId?: unknown; intentType?: unknown })
        : null;

    const intentId =
      typeof body?.intentId === "string" && body.intentId.trim() ? body.intentId.trim() : "";
    const intentType: IntentType | null =
      body?.intentType === "setup_intent" || body?.intentType === "payment_intent"
        ? body.intentType
        : null;

    if (!intentId || !intentType) {
      return NextResponse.json(
        { success: false, error: "Missing intentId/intentType" },
        { status: 400 },
      );
    }

    const sbAdmin = getSupabaseAdmin();

    // Idempotency: if reservation already exists for this intent, return it.
    if (intentType === "setup_intent") {
      const { data: existing } = await sbAdmin
        .from("order_reservations")
        .select("id")
        .eq("setup_intent_id", intentId)
        .maybeSingle();
      if (existing?.id) {
        return NextResponse.json({
          success: true,
          redirectUrl: `/checkout/success?success=true&reservationId=${encodeURIComponent(String(existing.id))}&message=${encodeURIComponent(
            "Reservation placed successfully",
          )}`,
        });
      }
    } else {
      const { data: existing } = await sbAdmin
        .from("order_reservations")
        .select("id, user_id")
        .eq("payment_intent_id", intentId)
        .maybeSingle();
      if (existing?.id) {
        const ownerId =
          typeof existing.user_id === "string" ? existing.user_id.trim() : "";
        if (!ownerId || ownerId !== user.id) {
          return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
        const piEarly = await stripe.paymentIntents.retrieve(intentId);
        if (
          piEarly.status === "succeeded" ||
          piEarly.status === "processing"
        ) {
          return NextResponse.json({
            success: true,
            redirectUrl: `/checkout/success?success=true&reservationId=${encodeURIComponent(String(existing.id))}&message=${encodeURIComponent(
              "Reservation placed successfully",
            )}`,
          });
        }
        return NextResponse.json(
          { success: false, error: retryableMessage() },
          { status: 400 },
        );
      }
    }

    // Retrieve intent from Stripe (never trust client_secret or redirect_status).
    const intent =
      intentType === "setup_intent"
        ? await stripe.setupIntents.retrieve(intentId)
        : await stripe.paymentIntents.retrieve(intentId);

    const mode = envStripeMode();
    if (mode !== "unknown") {
      const expectedLive = mode === "live";
      if (Boolean((intent as { livemode?: unknown }).livemode) !== expectedLive) {
        return NextResponse.json(
          { success: false, error: "Stripe intent mode mismatch" },
          { status: 400 },
        );
      }
    }

    const meta = (intent as { metadata?: Stripe.Metadata }).metadata ?? {};
    const metaUserId = typeof meta.user_id === "string" ? meta.user_id.trim() : "";
    if (!metaUserId || metaUserId !== user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const palletId = typeof meta.pallet_id === "string" ? meta.pallet_id.trim() : "";
    if (!palletId) {
      return NextResponse.json(
        { success: false, error: "Stripe intent missing pallet_id metadata" },
        { status: 400 },
      );
    }

    // Load profile + wine-zone delivery lines (must match /api/checkout/payment-intent).
    const { data: profile } = await sbAdmin
      .from("profiles")
      .select("email, full_name, phone, address, city, postal_code, country, region")
      .eq("id", user.id)
      .maybeSingle<{
        email: string | null;
        full_name: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        country: string | null;
        region: string | null;
      }>();

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
        console.error("[confirm-stripe-return] zone address load:", zrErr.message);
        return NextResponse.json(
          {
            success: false,
            error: "Failed to load delivery details for your wine zone",
          },
          { status: 500 },
        );
      }
      zoneTemplate = zr as UserZoneAddressTemplate | null;
    }

    const delivery = userZoneRowToDeliveryLines(zoneTemplate);
    const useZoneAddress =
      delivery != null && isZoneDeliveryCompleteForActiveGeo(active, delivery);

    const email =
      useZoneAddress && delivery?.email && delivery.email.includes("@")
        ? delivery.email.trim()
        : typeof profile?.email === "string" && profile.email.includes("@")
          ? profile.email.trim()
          : user.email;
    const fullName =
      useZoneAddress && delivery?.fullName
        ? delivery.fullName
        : typeof profile?.full_name === "string"
          ? profile.full_name.trim()
          : "";
    const phone =
      useZoneAddress && delivery?.phone
        ? delivery.phone.trim()
        : typeof profile?.phone === "string"
          ? profile.phone.trim()
          : "";

    let street: string;
    let postcode: string;
    let city: string;
    let countryCode: string | null;

    if (useZoneAddress && delivery) {
      street = delivery.street;
      city = delivery.city;
      postcode = delivery.postal;
      countryCode = delivery.countryCode;
    } else {
      street = typeof profile?.address === "string" ? profile.address.trim() : "";
      postcode =
        typeof profile?.postal_code === "string" ? profile.postal_code.trim() : "";
      city = typeof profile?.city === "string" ? profile.city.trim() : "";
      countryCode = getCountryCodeFromProfileCountry(profile?.country ?? null);
    }

    if (!countryCode || getCountryMarketMode(countryCode) === "unsupported") {
      return NextResponse.json(
        { success: false, error: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE },
        { status: 400 },
      );
    }

    if (!email || !street || !postcode || !city) {
      return NextResponse.json(
        { success: false, error: "Missing profile address details; please return to checkout" },
        { status: 400 },
      );
    }

    const resolvedStripeReturn = useZoneAddress
      ? await resolveMarketForCountry({
          countryCode: active.countryCode,
          regionCode: active.regionCode,
        })
      : await resolveMarketForCountry({
          countryCode,
          regionCode: typeof profile?.region === "string" ? profile.region : null,
        });
    const legacyStripeModes = getCountryMarketMode(countryCode);
    if (
      legacyMarketModeFromResolved(resolvedStripeReturn) !== legacyStripeModes
    ) {
      console.warn("[confirm-stripe-return] Market resolver vs legacy mismatch", {
        countryCode,
        legacy: legacyStripeModes,
        derived: legacyMarketModeFromResolved(resolvedStripeReturn),
        resolvedMarket: resolvedStripeReturn,
      });
    }

    const usConditional =
      resolvedStripeReturn.checkoutMode === "conditional_reservation" &&
      resolvedStripeReturn.isConditionalReservationEligible;

    if (
      !resolvedStripeReturn.isCheckoutEligible &&
      !resolvedStripeReturn.isConditionalReservationEligible
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            resolvedStripeReturn.reason?.trim() ||
            CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
        },
        { status: 400 },
      );
    }

    if (
      intentType === "setup_intent" &&
      getCountryMarketMode(countryCode) === "conditional_reservation" &&
      !usConditional
    ) {
      const si = intent as Stripe.SetupIntent;
      if (si.metadata?.reservation_mode === "conditional") {
        return NextResponse.json(
          {
            success: false,
            error:
              "US conditional reservations are not enabled in this environment.",
          },
          { status: 400 },
        );
      }
    }
    const profileRegionUpper =
      useZoneAddress && delivery?.regionCode
        ? delivery.regionCode
        : typeof profile?.region === "string"
          ? profile.region.trim().toUpperCase()
          : "";
    if (usConditional) {
      if (!isValidUsStateCode(profileRegionUpper)) {
        return NextResponse.json(
          {
            success: false,
            error: "Add a valid US state to your profile before completing checkout.",
          },
          { status: 400 },
        );
      }
    }

    // Recompute expected amount (server-side) for metadata validation.
    const cart = await CartService.getCart();
    if (!cart?.lines?.length) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
    }

    let selectedDeliveryZoneId: string;

    if (usConditional) {
      const { data: palletRow } = await sbAdmin
        .from("pallets")
        .select("delivery_zone_id")
        .eq("id", palletId)
        .maybeSingle();
      const dz = (palletRow as { delivery_zone_id?: string | null } | null)?.delivery_zone_id;
      if (typeof dz !== "string" || !dz.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: "Pallet has no delivery zone; please return to checkout",
          },
          { status: 400 },
        );
      }
      selectedDeliveryZoneId = dz.trim();
    } else {
      const deliveryAddress: DeliveryAddress = {
        postcode,
        city,
        countryCode,
      };
      const zones = await determineZones(cart.lines as any, deliveryAddress);
      if (zones.noDeliveryZone?.error === "UNSUPPORTED_COUNTRY") {
        return NextResponse.json(
          { success: false, error: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE },
          { status: 400 },
        );
      }
      if (!zones.deliveryZoneId) {
        return NextResponse.json(
          { success: false, error: "No delivery zone matched; please return to checkout" },
          { status: 400 },
        );
      }
      selectedDeliveryZoneId = String(zones.deliveryZoneId);
    }

    // Shipping cost uses pallet attributes.
    const { data: palletRow } = await sbAdmin
      .from("pallets")
      .select("id, name, cost_cents, bottle_capacity")
      .eq("id", palletId)
      .maybeSingle();
    if (!palletRow) {
      return NextResponse.json(
        { success: false, error: "Pallet not found" },
        { status: 400 },
      );
    }

    const shipping = calculateCartShippingCost(
      cart.lines.map((l: any) => ({ quantity: Number(l?.quantity) || 0 })),
      {
        id: String(palletRow.id),
        name: String(palletRow.name ?? ""),
        costCents: Number(palletRow.cost_cents) || 0,
        bottleCapacity: Number(palletRow.bottle_capacity) || 0,
        currentBottles: 0,
        remainingBottles: 0,
      },
    );
    const shippingSek = shipping?.totalShippingCostSek ?? 0;

    const subtotalSek = cart.lines.reduce((sum: number, line: any) => {
      const v = parseFloat(String(line?.cost?.totalAmount?.amount));
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    let boostedLineTotal = 0;
    let nonBoostedLineTotal = 0;
    for (const line of cart.lines as any[]) {
      const amt = parseFloat(String(line?.cost?.totalAmount?.amount)) || 0;
      if (line?.merchandise?.product?.producerBoostActive === true) boostedLineTotal += amt;
      else nonBoostedLineTotal += amt;
    }

    const availablePoints = await getRedeemableBalance(user.id);
    const { maxPoints } = calculateBoostAwareMaxRedemption(
      boostedLineTotal,
      nonBoostedLineTotal,
      availablePoints,
    );

    const rawPoints =
      typeof meta.pact_points_redeem === "string" ? Math.floor(Number(meta.pact_points_redeem)) : 0;
    const pointsToRedeem = Math.min(Math.max(0, rawPoints), maxPoints);
    const pactAlloc = allocatePactRedemptionPoints(
      pointsToRedeem,
      boostedLineTotal,
      nonBoostedLineTotal,
    );
    const pactPointsSekOff = pactAlloc.sekDiscount;

    const expectedFinalSek = Math.max(0, subtotalSek + shippingSek - pactPointsSekOff);
    const expectedAmountOre = Math.round(expectedFinalSek * 100);
    if (expectedAmountOre <= 0) {
      return NextResponse.json(
        { success: false, error: "Order total cannot be zero" },
        { status: 400 },
      );
    }

    if (intentType === "setup_intent") {
      const si = intent as Stripe.SetupIntent;
      if (si.status !== "succeeded") {
        return NextResponse.json({ success: false, error: retryableMessage() }, { status: 400 });
      }
      const expectedFromMeta =
        typeof si.metadata?.expected_amount_ore === "string"
          ? Number(si.metadata.expected_amount_ore)
          : NaN;
      // Allow small drift vs payment-intent metadata (float/line-sum vs cart.total, rounding).
      const amountDriftOre = Math.abs(expectedFromMeta - expectedAmountOre);
      if (!Number.isFinite(expectedFromMeta) || amountDriftOre > 10) {
        console.error("[confirm-stripe-return] setup amount mismatch", {
          expectedFromMeta,
          expectedAmountOre,
          driftOre: amountDriftOre,
        });
        return NextResponse.json(
          { success: false, error: "Amount mismatch" },
          { status: 400 },
        );
      }
      if (typeof si.payment_method !== "string" || !si.payment_method.trim()) {
        return NextResponse.json(
          { success: false, error: retryableMessage() },
          { status: 400 },
        );
      }
      if (usConditional) {
        const m = si.metadata ?? {};
        if (
          m.reservation_mode !== "conditional" ||
          m.market_code !== "US" ||
          m.country_code !== "US" ||
          m.age_21_confirmed !== "true" ||
          m.conditional_ack_confirmed !== "true" ||
          m.terms_version !== US_CONDITIONAL_TERMS_VERSION
        ) {
          return NextResponse.json(
            { success: false, error: "Invalid US conditional payment setup." },
            { status: 400 },
          );
        }
        const metaRegion =
          typeof m.region === "string" ? m.region.trim().toUpperCase() : "";
        if (metaRegion !== profileRegionUpper) {
          return NextResponse.json(
            {
              success: false,
              error:
                "US state on file does not match card verification. Update your profile.",
            },
            { status: 400 },
          );
        }
      }
    } else {
      if (usConditional) {
        return NextResponse.json(
          {
            success: false,
            error: "US conditional checkout cannot use immediate charges.",
          },
          { status: 400 },
        );
      }
      const pi = intent as Stripe.PaymentIntent;
      if (pi.status !== "succeeded") {
        return NextResponse.json({ success: false, error: retryableMessage() }, { status: 400 });
      }
      const piAmountOre = Number(pi.amount) || 0;
      if (Math.abs(piAmountOre - expectedAmountOre) > 10) {
        console.error("[confirm-stripe-return] payment_intent amount mismatch", {
          piAmountOre,
          expectedAmountOre,
        });
        return NextResponse.json(
          { success: false, error: "Amount mismatch" },
          { status: 400 },
        );
      }
      if (typeof pi.payment_method !== "string" || !pi.payment_method.trim()) {
        return NextResponse.json(
          { success: false, error: retryableMessage() },
          { status: 400 },
        );
      }
    }

    // Delegate actual reservation creation to the existing /api/checkout/confirm route.
    // This avoids duplicating the (large) reservation creation logic for P0.
    const form = new FormData();
    form.append("fullName", fullName);
    form.append("email", email);
    form.append("phone", phone);
    form.append("street", street);
    form.append("postcode", postcode);
    form.append("city", city);
    form.append("countryCode", countryCode);
    if (usConditional && profileRegionUpper) {
      form.append("regionCode", profileRegionUpper);
    }
    form.append("selectedDeliveryZoneId", selectedDeliveryZoneId);
    form.append("selectedPalletId", palletId);
    if (pointsToRedeem > 0) {
      form.append("pact_points_redeem", String(pointsToRedeem));
    }
    form.append("stripe_intent_id", intentId);
    form.append("stripe_intent_type", intentType);

    const confirmUrl = new URL("/api/checkout/confirm", request.url);
    const cookie = request.headers.get("cookie") ?? "";
    const confirmRes = await fetch(confirmUrl, {
      method: "POST",
      headers: cookie ? { cookie } : undefined,
      body: form,
    });
    const confirmText = await confirmRes.text();
    let confirmData: unknown = null;
    try {
      confirmData = confirmText ? JSON.parse(confirmText) : null;
    } catch {
      confirmData = null;
    }
    const parsed =
      confirmData && typeof confirmData === "object"
        ? (confirmData as { redirectUrl?: unknown; error?: unknown })
        : null;

    if (!confirmRes.ok || !parsed) {
      console.error("[confirm-stripe-return] checkout/confirm failed", {
        status: confirmRes.status,
        snippet: confirmText.slice(0, 800),
      });
      const errMsg =
        typeof parsed?.error === "string" && parsed.error.trim()
          ? parsed.error.trim()
          : "Failed to finalize reservation";
      const outStatus =
        confirmRes.status >= 400 && confirmRes.status < 600 ? confirmRes.status : 500;
      return NextResponse.json({ success: false, error: errMsg }, { status: outStatus });
    }

    const redirectUrl =
      typeof parsed.redirectUrl === "string" ? parsed.redirectUrl : null;
    if (!redirectUrl) {
      const errMsg =
        typeof parsed.error === "string" && parsed.error.trim()
          ? parsed.error.trim()
          : "Failed to finalize reservation";
      console.error("[confirm-stripe-return] checkout/confirm missing redirectUrl", {
        keys: Object.keys(parsed),
      });
      return NextResponse.json({ success: false, error: errMsg }, { status: 500 });
    }

    return NextResponse.json({ success: true, redirectUrl });
  } catch (e) {
    console.error("[confirm-stripe-return] error:", e);
    return NextResponse.json(
      { success: false, error: retryableMessage() },
      { status: 500 },
    );
  }
}

