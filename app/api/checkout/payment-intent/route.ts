import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { LOCALE_COOKIE } from "@/lib/i18n/locale";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";
import { getOrCreateStripeCustomer } from "@/lib/stripe/customer";
import { CartService } from "@/src/lib/cart-service";
import { sumReservedBottlesOnPallet } from "@/lib/pallet-fill-count";
import { isB2BHost } from "@/lib/b2b-site";
import type { CartItem as SixBottleCartItem } from "@/lib/checkout-validation";
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
  resolveShoppingContext,
  stripeCurrencyFromContext,
} from "@/lib/shopping-context/resolve";
import {
  isZoneDeliveryCompleteForActiveGeo,
  userZoneRowToDeliveryLines,
  type UserZoneAddressTemplate,
} from "@/lib/checkout/user-zone-delivery-template";
import { computeExpectedAmountOre } from "@/lib/checkout/expected-amount";
import { buildCheckoutQuote } from "@/lib/checkout/checkout-quote";
import { resolveAndChargeCheckoutShipping } from "@/lib/checkout/resolve-checkout-shipping";
import {
  buildSharedPalletIntentMetadata,
  buildSharedPalletStripeIdempotencyKey,
  createSharedPalletIntentWithFreshRetrieve,
  findBlockingSharedPalletIntent,
  findReusableSharedPalletIntent,
  SharedPalletIntentUnusableError,
  sharedPalletIntentFlightKey,
  withSharedPalletIntentSingleFlight,
  type SharedPalletIntentContext,
  type StripeIntentLike,
} from "@/lib/checkout/shared-pallet-intent-idempotency";
import { resolveMarketAgeMinimum } from "@/lib/age-limits";
import {
  evaluateLegalGate,
  legalGateInputSchema,
  legalGateStripeMetadata,
  parseIsoDateOnly,
  calculateAge,
  MINIMUM_AGE,
} from "@/lib/legal/age-check";

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
 * Reject SetupIntent / PaymentIntent create when the cart fails the channel
 * minimum (B2C ≥ 6 bottles). Mirrors /api/checkout/confirm so blocked carts
 * never get a confirmable Stripe intent.
 */
async function rejectIfCartBelowMinimum(
  cart: { lines?: ReadonlyArray<{ quantity?: number }> | null },
  request: Request,
): Promise<NextResponse | null> {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const minimumChannel = isB2BHost(host) ? "b2b" : "b2c";
  const { validateSixBottleRule } = await import("@/lib/checkout-validation");
  const validation = await validateSixBottleRule(
    (cart.lines ?? []) as unknown as SixBottleCartItem[],
    { channel: minimumChannel },
  );
  if (validation.isValid) return null;
  return NextResponse.json(
    {
      error:
        minimumChannel === "b2b"
          ? "Each order line must have at least 1 bottle"
          : "Order must contain at least 6 bottles (any wines)",
      code: "cart_minimum_not_met",
      validationErrors: validation.errors,
      requiredQuantity: validation.requiredQuantity,
      neededTotal: validation.neededTotal,
      channel: validation.channel,
    },
    { status: 400 },
  );
}

/**
 * Charged amount is always derived server-side via {@link computeExpectedAmountOre}
 * from CartService.getCart + shipping − promo − voucher − PACT points.
 * Client must not send a total.
 */
type RequestBody = {
  pallet_id: string;
  /** Optional; server re-authorizes. Spoofed direct_box rejected when flag OFF. */
  fulfillment_channel?: string;
  pact_points_redeem?: number;
  promo_discount_sek?: number;
  voucher_discount_sek?: number;
  /** US conditional checkout: required when profile country is US */
  us_conditional_ack?: boolean;
  dateOfBirth?: string;
  acceptedTermsVersion?: string;
};

function evaluateAgeOnlyGate(
  dateOfBirth: string | undefined,
  now: Date = new Date(),
  minimumAge: number = MINIMUM_AGE,
):
  | { ok: true; dateOfBirth: string; verifiedAt: Date }
  | { ok: false; reason: "validation_error" | "age_requirement_not_met" } {
  const parsedDob = legalGateInputSchema.shape.dateOfBirth.safeParse(dateOfBirth);
  if (!parsedDob.success) {
    return { ok: false, reason: "validation_error" };
  }
  const dob = parseIsoDateOnly(parsedDob.data);
  if (!dob) {
    return { ok: false, reason: "validation_error" };
  }
  const required =
    Number.isFinite(minimumAge) && minimumAge > 0
      ? Math.floor(minimumAge)
      : MINIMUM_AGE;
  if (calculateAge(dob, now) < required) {
    return { ok: false, reason: "age_requirement_not_met" };
  }
  return { ok: true, dateOfBirth: parsedDob.data, verifiedAt: now };
}

export async function POST(request: Request) {
  const PALLET_THRESHOLD = 300;

  try {
    console.log("=== CHECKOUT PAYMENT INTENT START ===");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const shoppingCtx = await resolveShoppingContext({
      userId: user.id,
      host: request.headers.get("host"),
      cookieLocale: cookieStore.get(LOCALE_COOKIE)?.value ?? null,
      acceptLanguage: request.headers.get("accept-language"),
    });
    const stripeCurrency = stripeCurrencyFromContext(shoppingCtx);

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

    const { parseFulfillmentChannel } = await import(
      "@/lib/commerce/fulfillment-channel"
    );
    const { gateDirectBoxCheckoutRequest } = await import(
      "@/lib/commerce/fulfillment-channel-server-gates"
    );
    const {
      assertDirectBoxRejectsDeferredPipeline,
      buildDirectBoxPaymentIntentMetadata,
      shouldReuseOpenDirectBoxPaymentIntent,
      DIRECT_BOX_PAYMENT_MODE,
    } = await import("@/lib/commerce/direct-box-payment-contract");
    const clientChannel = parseFulfillmentChannel(body?.fulfillment_channel);

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

    // -------------------------------------------------------------------------
    // direct_box PaymentIntent amount path (no pallet / no deferred SetupIntent)
    // Fail closed BEFORE any Stripe PI create when carrier/rate missing.
    // NEVER fall through into shared-pallet pallet_id + pact/99 SEK path.
    // -------------------------------------------------------------------------
    if (clientChannel === "direct_box") {
      // Spoof reject first (no zone/cart/Stripe work when flag OFF).
      const spoofGate = await gateDirectBoxCheckoutRequest({
        clientChannelRaw: body?.fulfillment_channel,
        selectedPalletId: null,
        countryCode: "SE",
        bottleCount: 0,
        productSubtotalSek: 0,
      });
      if (
        !spoofGate.ok &&
        spoofGate.errorCode === "channel_spoof_rejected"
      ) {
        return NextResponse.json(
          { error: spoofGate.message, code: spoofGate.errorCode },
          { status: spoofGate.httpStatus },
        );
      }

      const cart = await CartService.getCart();
      if (!cart || !cart.lines?.length) {
        return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
      }
      const cartMinDirect = await rejectIfCartBelowMinimum(cart, request);
      if (cartMinDirect) return cartMinDirect;

      const sbAdminDirect = getSupabaseAdmin();
      const activeDirect = await resolveActiveGeoZoneForUser(user.id);
      let zoneTemplateDirect: UserZoneAddressTemplate | null = null;
      if (activeDirect.geoZoneId) {
        const { data: zr, error: zrErr } = await sbAdminDirect
          .from("user_zone_addresses")
          .select("*")
          .eq("user_id", user.id)
          .eq("geo_zone_id", activeDirect.geoZoneId)
          .maybeSingle();
        if (zrErr) {
          console.error("[payment-intent] direct zone address load:", zrErr.message);
          return NextResponse.json(
            { error: "Failed to load delivery details for your wine zone" },
            { status: 500 },
          );
        }
        zoneTemplateDirect = zr as UserZoneAddressTemplate | null;
      }
      const deliveryDirect = userZoneRowToDeliveryLines(zoneTemplateDirect);
      if (!isZoneDeliveryCompleteForActiveGeo(activeDirect, deliveryDirect)) {
        return NextResponse.json(
          {
            error: `Add delivery details for ${activeDirect.displayName} before paying.`,
          },
          { status: 400 },
        );
      }
      const countryCodeDirect = deliveryDirect!.countryCode;

      const bottleCountDirect = cart.lines.reduce(
        (s, l) => s + (Number(l.quantity) || 0),
        0,
      );
      const subtotalDirect =
        parseFloat(String(cart.cost.totalAmount.amount)) || 0;

      // Full gate (carrier / mode-scoped rate) — before any PI creation.
      const authDirect = await gateDirectBoxCheckoutRequest({
        clientChannelRaw: body?.fulfillment_channel,
        selectedPalletId: null,
        countryCode: countryCodeDirect,
        bottleCount: bottleCountDirect,
        productSubtotalSek: subtotalDirect,
      });
      if (!authDirect.ok) {
        return NextResponse.json(
          { error: authDirect.message, code: authDirect.errorCode },
          { status: authDirect.httpStatus },
        );
      }

      // Client may still send a leftover pallet_id from UI state — strip it.
      // Never bind pallet or enter deferred SetupIntent pipeline.
      const deferredGuard = assertDirectBoxRejectsDeferredPipeline({
        paymentMode: DIRECT_BOX_PAYMENT_MODE,
        palletId: null,
      });
      if (!deferredGuard.ok) {
        return NextResponse.json(
          { error: deferredGuard.message, code: deferredGuard.code },
          { status: 400 },
        );
      }

      const resolvedMarketDirect = await resolveMarketForCountry({
        countryCode: activeDirect.countryCode,
        regionCode: activeDirect.regionCode,
      });
      if (resolvedMarketDirect.checkoutMode === "conditional_reservation") {
        return NextResponse.json(
          {
            error:
              "direct_box does not support conditional/deferred reservation checkout",
            code: "direct_box_rejects_deferred_setup",
          },
          { status: 400 },
        );
      }

      const {
        getDirectBoxPriceMarkupPercent,
        directBoxUnitPriceSek,
      } = await import("@/lib/commerce/direct-box-pricing");
      const markupPct = getDirectBoxPriceMarkupPercent();
      let boostedLineTotal = 0;
      let nonBoostedLineTotal = 0;
      let directSubtotalSek = 0;
      for (const line of cart.lines) {
        const qty = Math.max(0, Math.floor(Number(line.quantity) || 0));
        const catalogUnit =
          qty > 0
            ? (parseFloat(String(line.cost.totalAmount.amount)) || 0) / qty
            : 0;
        const directUnit = directBoxUnitPriceSek(catalogUnit, markupPct);
        const amt = directUnit * qty;
        directSubtotalSek += amt;
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

      // Server quote uses authorize plan shipping (mode-scoped) — never pact/99.
      const shippingSek = authDirect.plan.shippingSek;
      const { amountOre: amountInOre, components } =
        await computeExpectedAmountOre({
          userId: user.id,
          cartId: cart.id,
          shippingSek,
          voucherSek: voucherDiscountSek,
          pactPointsSek: alloc.sekDiscount,
          promoSek: promoDiscountSek,
          displayMultiplier: 1,
          cart,
          subtotalOverrideSek: directSubtotalSek,
        });
      const quote = buildCheckoutQuote({
        components,
        amountOre: amountInOre,
        pactPointsRedeem: pointsToRedeem,
        shippingPending: false,
        fulfillmentChannel: "direct_box",
        rateChannel: "direct_box",
      });
      if (amountInOre <= 0) {
        return NextResponse.json(
          { error: "Order total cannot be zero" },
          { status: 400 },
        );
      }

      const legalNow = new Date();
      const requiredAge = resolveMarketAgeMinimum({
        countryCode: resolvedMarketDirect.countryCode || countryCodeDirect,
        ageMinimum: resolvedMarketDirect.ageMinimum,
      });
      const legalGate = evaluateLegalGate(
        {
          dateOfBirth: body?.dateOfBirth,
          acceptedTermsVersion: body?.acceptedTermsVersion,
        },
        legalNow,
        requiredAge,
      );
      if (!legalGate.ok) {
        if (legalGate.reason === "validation_error") {
          return NextResponse.json({ error: "Invalid request" }, { status: 400 });
        }
        if (legalGate.reason === "age_requirement_not_met") {
          return NextResponse.json(
            { error: "age_requirement_not_met" },
            { status: 403 },
          );
        }
        return NextResponse.json(
          {
            error: "terms_version_stale",
            currentVersion: legalGate.currentVersion,
          },
          { status: 409 },
        );
      }

      const { error: profileDobErr } = await sbAdminDirect
        .from("profiles")
        .update({
          date_of_birth: legalGate.dateOfBirth,
          updated_at: legalNow.toISOString(),
        })
        .eq("id", user.id);
      if (profileDobErr) {
        console.error(
          "[payment-intent] direct Failed to save date_of_birth:",
          profileDobErr,
        );
        return NextResponse.json(
          { error: "Failed to save age verification" },
          { status: 500 },
        );
      }

      const carrier = authDirect.plan.carrier;
      if (carrier.status !== "eligible") {
        return NextResponse.json(
          {
            error: "direct_box carrier not eligible",
            code: "direct_box_carrier_unconfigured",
          },
          { status: 400 },
        );
      }

      const customerId = await getOrCreateStripeCustomer(user.id);
      const purchaseLegalMetadata = legalGateStripeMetadata(legalGate);
      const metadata = buildDirectBoxPaymentIntentMetadata({
        userId: user.id,
        cartId: cart.id,
        stripeCustomerId: customerId,
        amountOre: amountInOre,
        shippingSek,
        carrierId: carrier.carrierId,
        carrierProduct: carrier.productCode,
        pactPointsRedeem: pointsToRedeem,
        voucherDiscountSek,
        promoDiscountSek,
        legalMetadata: purchaseLegalMetadata,
      });

      // Idempotent reuse: same user + cart + customer + amount + channel.
      // Same amount alone is insufficient (stale open PI across carts).
      const existingList = await stripe.paymentIntents.list({
        customer: customerId,
        limit: 8,
      });
      const existing = existingList.data.find((pi) =>
        shouldReuseOpenDirectBoxPaymentIntent({
          metadata: pi.metadata ?? {},
          status: pi.status,
          sessionUserId: user.id,
          serverCartId: cart.id,
          expectedAmountOre: amountInOre,
          expectedStripeCustomerId: customerId,
        }),
      );
      if (existing?.client_secret) {
        console.log(
          "[payment-intent] Reusing open direct_box PaymentIntent:",
          existing.id,
        );
        return NextResponse.json({
          paymentMode: DIRECT_BOX_PAYMENT_MODE,
          clientSecret: existing.client_secret,
          intentId: existing.id,
          amountInOre,
          quote,
          fulfillment_channel: "direct_box",
          bottlesFilled: 0,
          palletStatus: null,
          palletThreshold: PALLET_THRESHOLD,
        });
      }

      // Axel 01:24: direct_box is card-only — no Klarna / APM.
      const intent = await stripe.paymentIntents.create({
        customer: customerId,
        amount: amountInOre,
        currency: stripeCurrency,
        payment_method_types: ["card"],
        capture_method: "automatic",
        metadata,
      });

      console.log("[payment-intent] Created direct_box PaymentIntent:", intent.id);

      return NextResponse.json({
        paymentMode: DIRECT_BOX_PAYMENT_MODE,
        clientSecret: intent.client_secret,
        intentId: intent.id,
        amountInOre,
        quote,
        fulfillment_channel: "direct_box",
        bottlesFilled: 0,
        palletStatus: null,
        palletThreshold: PALLET_THRESHOLD,
      });
    }

    const pallet_id = typeof body?.pallet_id === "string" ? body.pallet_id : "";

    if (!pallet_id) {
      return NextResponse.json({ error: "Missing pallet_id" }, { status: 400 });
    }

    const sbAdmin = getSupabaseAdmin();

    const { data: palletRow, error: palletErr } = await sbAdmin
      .from("pallets")
      .select(
        "bottle_capacity, status, id, name, cost_cents, last_mile_cost_cents_per_bottle",
      )
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
    const cartMinShared = await rejectIfCartBelowMinimum(cart, request);
    if (cartMinShared) return cartMinShared;

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
      if (body?.us_conditional_ack !== true) {
        return NextResponse.json(
          {
            error:
              "Confirm that you understand this is a conditional reservation.",
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

    const zones = await determineZones(
      cart.lines as never,
      {
        postcode: postal,
        city,
        countryCode,
      },
      { preferredDeliveryZoneId: active.defaultDeliveryZoneId },
    );

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

    const bottleCount = cart.lines.reduce(
      (s, l) => s + (Number(l.quantity) || 0),
      0,
    );
    const subtotalSek =
      parseFloat(String(cart.cost.totalAmount.amount)) || 0;
    const shippingCharge = await resolveAndChargeCheckoutShipping({
      bottleCount,
      productSubtotalSek: subtotalSek,
      deliveryCountry: countryCode,
      activeZoneCountry: active.countryCode,
      fulfillmentMode: "shared_pallet",
      pallet: palletRow,
    });
    const shippingSek = shippingCharge.shippingSek;

    // CartService totals are already in charge/display currency → multiplier 1.
    const { amountOre: amountInOre, components } = await computeExpectedAmountOre(
      {
        userId: user.id,
        cartId: cart.id,
        shippingSek,
        voucherSek: voucherDiscountSek,
        pactPointsSek: alloc.sekDiscount,
        promoSek: promoDiscountSek,
        displayMultiplier: 1,
        cart,
      },
    );
    const quote = buildCheckoutQuote({
      components,
      amountOre: amountInOre,
      pactPointsRedeem: pointsToRedeem,
      shippingPending: shippingCharge.shippingPending,
      fulfillmentChannel: "shared_pallet",
      rateChannel:
        shippingCharge.rateChannel === "direct_box" ? "direct_box" : "pact",
    });

    if (amountInOre <= 0) {
      return NextResponse.json(
        { error: "Order total cannot be zero" },
        { status: 400 },
      );
    }

    const legalNow = new Date();
    const requiredAge = resolveMarketAgeMinimum({
      countryCode: resolvedMarket.countryCode || countryCode,
      ageMinimum: resolvedMarket.ageMinimum,
    });
    const legalGate = usConditional
      ? evaluateAgeOnlyGate(
          typeof body?.dateOfBirth === "string" ? body.dateOfBirth : undefined,
          legalNow,
          requiredAge,
        )
      : evaluateLegalGate(
          {
            dateOfBirth: body?.dateOfBirth,
            acceptedTermsVersion: body?.acceptedTermsVersion,
          },
          legalNow,
          requiredAge,
        );

    if (!legalGate.ok) {
      if (legalGate.reason === "validation_error") {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
      }
      if (legalGate.reason === "age_requirement_not_met") {
        console.warn("[payment-intent] Age gate rejected:", {
          at: legalNow.toISOString(),
          user_id: user.id,
          reason: legalGate.reason,
        });
        return NextResponse.json(
          { error: "age_requirement_not_met" },
          { status: 403 },
        );
      }
      console.warn("[payment-intent] Terms version stale:", {
        at: legalNow.toISOString(),
        user_id: user.id,
        reason: legalGate.reason,
      });
      return NextResponse.json(
        {
          error: "terms_version_stale",
          currentVersion: legalGate.currentVersion,
        },
        { status: 409 },
      );
    }

    const { error: profileDobErr } = await sbAdmin
      .from("profiles")
      .update({
        date_of_birth: legalGate.dateOfBirth,
        updated_at: legalNow.toISOString(),
      })
      .eq("id", user.id);

    if (profileDobErr) {
      console.error("[payment-intent] Failed to save date_of_birth:", profileDobErr);
      return NextResponse.json(
        { error: "Failed to save age verification" },
        { status: 500 },
      );
    }

    const purchaseLegalMetadata = usConditional
      ? {
          age_verified_dob: legalGate.dateOfBirth,
          age_verification_method: "self_declared_dob",
        }
      : legalGateStripeMetadata(legalGate);

    console.log("[payment-intent] Server amount:", {
      amountInOre,
      components,
      pointsToRedeem,
    });

    const customerId = await getOrCreateStripeCustomer(user.id);

    // Generation = completed reservations for this user. Rises after each
    // successful confirm so an identical cart does not replay a consumed SI.
    let checkoutGeneration = 0;
    try {
      const { count: reservationCount, error: genErr } = await sbAdmin
        .from("order_reservations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .is("archived_at", null);
      if (genErr) {
        console.warn("[payment-intent] checkoutGeneration count failed:", genErr);
      } else {
        checkoutGeneration = Math.max(0, Number(reservationCount) || 0);
      }
    } catch (genEx) {
      console.warn("[payment-intent] checkoutGeneration lookup failed:", genEx);
    }

    const sharedIntentContext: SharedPalletIntentContext = {
      sessionUserId: user.id,
      cartId: String(cart.id),
      palletId: pallet_id,
      expectedAmountOre: amountInOre,
      currency: stripeCurrency,
      stripeCustomerId: customerId,
      pactPointsRedeem: pointsToRedeem,
      promoDiscountSek,
      voucherDiscountSek,
      ageVerifiedDob: purchaseLegalMetadata.age_verified_dob,
      ageVerificationMethod: purchaseLegalMetadata.age_verification_method,
      purchaseTermsVersion: usConditional
        ? null
        : (purchaseLegalMetadata.purchase_terms_version ?? null),
      usConditional,
      usRegion: usConditional ? usStateUpper : null,
      usConditionalTermsVersion: usConditional
        ? US_CONDITIONAL_TERMS_VERSION
        : null,
      checkoutGeneration,
    };

    const toStripeIntentLike = (raw: {
      id: string;
      status: string;
      client_secret?: string | null;
      amount?: number | null;
      currency?: string | null;
      customer?: string | { id?: string } | null;
      payment_method?: string | { id?: string } | null;
      metadata?: Record<string, string> | null;
    }): StripeIntentLike => ({
      id: raw.id,
      status: raw.status,
      client_secret: raw.client_secret,
      amount: raw.amount,
      currency: raw.currency,
      customer:
        typeof raw.customer === "string"
          ? raw.customer
          : raw.customer?.id ?? null,
      payment_method:
        typeof raw.payment_method === "string"
          ? raw.payment_method
          : raw.payment_method?.id ?? null,
      metadata: (raw.metadata ?? undefined) as Record<string, string> | null,
    });

    if (paymentMode === "setup_intent") {
      const idempotencyKey = buildSharedPalletStripeIdempotencyKey({
        intentKind: "setup_intent",
        context: sharedIntentContext,
      });
      const flightKey = sharedPalletIntentFlightKey(idempotencyKey);

      // List + create inside one flight. Create/replay body is NOT trusted —
      // retrieve authoritative state. Same-context non-handoffable priors
      // fail closed (no sibling create).
      const intent = await withSharedPalletIntentSingleFlight(
        flightKey,
        async () => {
          const existingIntents = await stripe!.setupIntents.list({
            customer: customerId,
            limit: 8,
          });
          const listed = existingIntents.data.map((si) =>
            toStripeIntentLike(si),
          );

          const reusable = findReusableSharedPalletIntent({
            intents: listed,
            context: sharedIntentContext,
            intentKind: "setup_intent",
          });
          if (reusable) {
            const full = existingIntents.data.find((s) => s.id === reusable.id);
            if (full) return full;
          }

          const blocking = findBlockingSharedPalletIntent({
            intents: listed,
            context: sharedIntentContext,
            intentKind: "setup_intent",
          });
          if (blocking) {
            throw new SharedPalletIntentUnusableError({
              code: "prior_intent_not_handoffable",
              message:
                "A prior SetupIntent for this checkout snapshot is not handoffable; refusing to create a sibling.",
              intentId: blocking.id,
              intentStatus: blocking.status,
            });
          }

          const metadata = buildSharedPalletIntentMetadata(
            sharedIntentContext,
            usConditional && usStateUpper
              ? {
                  country_code: "US",
                  region: usStateUpper,
                  market_code: "US",
                  reservation_mode: "conditional",
                  conditional_ack_confirmed: "true",
                  terms_version: US_CONDITIONAL_TERMS_VERSION,
                }
              : {},
          );

          const created = await createSharedPalletIntentWithFreshRetrieve({
            intentKind: "setup_intent",
            context: sharedIntentContext,
            toLike: toStripeIntentLike,
            create: (key) =>
              stripe!.setupIntents.create(
                {
                  customer: customerId,
                  // Shared pallet: card only (save now, charge at close).
                  // Never enable Klarna/Swish/etc. via automatic_payment_methods.
                  payment_method_types: ["card"],
                  usage: "off_session",
                  metadata,
                },
                { idempotencyKey: key },
              ),
            retrieve: (id) => stripe!.setupIntents.retrieve(id),
          });
          return created.intent;
        },
      );

      if (intent.client_secret) {
        console.log(
          "[payment-intent] SetupIntent ready:",
          intent.id,
          "(reuse or create)",
        );
        return NextResponse.json({
          paymentMode,
          clientSecret: intent.client_secret,
          intentId: intent.id,
          amountInOre,
          quote,
          bottlesFilled,
          palletStatus: palletStatusResponse,
          palletThreshold: PALLET_THRESHOLD,
        });
      }
      return NextResponse.json(
        { error: "SetupIntent missing client_secret", code: "missing_client_secret" },
        { status: 500 },
      );
    }

    if (usConditional) {
      return NextResponse.json(
        { error: "US reservations require card verification only (no immediate charge)." },
        { status: 400 },
      );
    }

    const piIdempotencyKey = buildSharedPalletStripeIdempotencyKey({
      intentKind: "payment_intent",
      context: sharedIntentContext,
    });
    const piFlightKey = sharedPalletIntentFlightKey(piIdempotencyKey);

    const intent = await withSharedPalletIntentSingleFlight(
      piFlightKey,
      async () => {
        const existingPiList = await stripe!.paymentIntents.list({
          customer: customerId,
          limit: 8,
        });
        const listed = existingPiList.data.map((pi) => toStripeIntentLike(pi));

        const reusablePi = findReusableSharedPalletIntent({
          intents: listed,
          context: sharedIntentContext,
          intentKind: "payment_intent",
        });
        if (reusablePi) {
          const full = existingPiList.data.find((p) => p.id === reusablePi.id);
          if (full) return full;
        }

        const blocking = findBlockingSharedPalletIntent({
          intents: listed,
          context: sharedIntentContext,
          intentKind: "payment_intent",
        });
        if (blocking) {
          throw new SharedPalletIntentUnusableError({
            code: "prior_intent_not_handoffable",
            message:
              "A prior PaymentIntent for this checkout snapshot is not handoffable; refusing to create a sibling.",
            intentId: blocking.id,
            intentStatus: blocking.status,
          });
        }

        const piMetadata = buildSharedPalletIntentMetadata(sharedIntentContext);
        const created = await createSharedPalletIntentWithFreshRetrieve({
          intentKind: "payment_intent",
          context: sharedIntentContext,
          toLike: toStripeIntentLike,
          create: (key) =>
            stripe!.paymentIntents.create(
              {
                customer: customerId,
                amount: amountInOre,
                currency: stripeCurrency,
                automatic_payment_methods: { enabled: true },
                capture_method: "automatic",
                metadata: piMetadata,
              },
              { idempotencyKey: key },
            ),
          retrieve: (id) => stripe!.paymentIntents.retrieve(id),
        });
        return created.intent;
      },
    );

    if (!intent.client_secret) {
      return NextResponse.json(
        {
          error: "PaymentIntent missing client_secret",
          code: "missing_client_secret",
        },
        { status: 500 },
      );
    }

    console.log(
      "[payment-intent] PaymentIntent ready:",
      intent.id,
      "(reuse or create)",
    );

    return NextResponse.json({
      paymentMode,
      clientSecret: intent.client_secret,
      intentId: intent.id,
      amountInOre,
      quote,
      bottlesFilled,
      palletStatus: palletStatusResponse,
      palletThreshold: PALLET_THRESHOLD,
    });
  } catch (error) {
    console.error("=== CHECKOUT PAYMENT INTENT ERROR ===");
    console.error(error);
    if (error instanceof SharedPalletIntentUnusableError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          intentId: error.intentId,
          intentStatus: error.intentStatus,
        },
        { status: 409 },
      );
    }
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

