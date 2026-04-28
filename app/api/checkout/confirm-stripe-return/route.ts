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

type IntentType = "setup_intent" | "payment_intent";

function envStripeMode(): "live" | "test" | "unknown" {
  const sk = process.env.STRIPE_SECRET_KEY ?? "";
  if (sk.startsWith("sk_live_")) return "live";
  if (sk.startsWith("sk_test_")) return "test";
  return "unknown";
}

function countryCodeFromProfileCountry(country: string | null): string {
  const c = (country ?? "").trim().toLowerCase();
  if (c === "sweden") return "SE";
  if (c === "norway") return "NO";
  if (c === "denmark") return "DK";
  if (c === "finland") return "FI";
  if (c === "germany") return "DE";
  if (c === "france") return "FR";
  if (c === "united kingdom") return "GB";
  // Best effort: default to SE for PACT B2C.
  return "SE";
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
        .select("id")
        .eq("payment_intent_id", intentId)
        .maybeSingle();
      if (existing?.id) {
        return NextResponse.json({
          success: true,
          redirectUrl: `/checkout/success?success=true&reservationId=${encodeURIComponent(String(existing.id))}&message=${encodeURIComponent(
            "Reservation placed successfully",
          )}`,
        });
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

    // Load profile to reconstruct address for /api/checkout/confirm.
    const { data: profile } = await sbAdmin
      .from("profiles")
      .select("email, full_name, phone, address, city, postal_code, country")
      .eq("id", user.id)
      .maybeSingle<{
        email: string | null;
        full_name: string | null;
        phone: string | null;
        address: string | null;
        city: string | null;
        postal_code: string | null;
        country: string | null;
      }>();

    const email =
      typeof profile?.email === "string" && profile.email.includes("@")
        ? profile.email.trim()
        : user.email;
    const fullName =
      typeof profile?.full_name === "string" ? profile.full_name.trim() : "";
    const phone = typeof profile?.phone === "string" ? profile.phone.trim() : "";
    const street = typeof profile?.address === "string" ? profile.address.trim() : "";
    const postcode =
      typeof profile?.postal_code === "string" ? profile.postal_code.trim() : "";
    const city = typeof profile?.city === "string" ? profile.city.trim() : "";
    const countryCode = countryCodeFromProfileCountry(profile?.country ?? null);

    if (!email || !street || !postcode || !city) {
      return NextResponse.json(
        { success: false, error: "Missing profile address details; please return to checkout" },
        { status: 400 },
      );
    }

    // Recompute expected amount (server-side) for metadata validation.
    const cart = await CartService.getCart();
    if (!cart?.lines?.length) {
      return NextResponse.json({ success: false, error: "Cart is empty" }, { status: 400 });
    }

    // Determine zones to get selectedDeliveryZoneId.
    const deliveryAddress: DeliveryAddress = {
      postcode,
      city,
      countryCode,
    };
    const zones = await determineZones(cart.lines as any, deliveryAddress);
    if (!zones.deliveryZoneId) {
      return NextResponse.json(
        { success: false, error: "No delivery zone matched; please return to checkout" },
        { status: 400 },
      );
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
      if (!Number.isFinite(expectedFromMeta) || Math.abs(expectedFromMeta - expectedAmountOre) > 1) {
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
    } else {
      const pi = intent as Stripe.PaymentIntent;
      if (pi.status !== "succeeded") {
        return NextResponse.json({ success: false, error: retryableMessage() }, { status: 400 });
      }
      if (Math.abs((Number(pi.amount) || 0) - expectedAmountOre) > 1) {
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
    form.append("selectedDeliveryZoneId", String(zones.deliveryZoneId));
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
    const confirmData = await confirmRes.json().catch(() => null);
    if (!confirmRes.ok || !confirmData || typeof confirmData !== "object") {
      return NextResponse.json(
        { success: false, error: "Failed to finalize reservation" },
        { status: 500 },
      );
    }
    const d = confirmData as { redirectUrl?: unknown; error?: unknown };
    const redirectUrl = typeof d.redirectUrl === "string" ? d.redirectUrl : null;
    if (!redirectUrl) {
      return NextResponse.json(
        { success: false, error: typeof d.error === "string" ? d.error : "Failed to finalize reservation" },
        { status: 500 },
      );
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

