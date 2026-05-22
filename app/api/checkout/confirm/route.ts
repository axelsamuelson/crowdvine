import { NextResponse } from "next/server";
import { CartService } from "@/src/lib/cart-service";
import { supabaseServer, getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { determineZones } from "@/lib/zone-matching";
import {
  findOrCreatePalletForRegion,
  resolveShippingRegionForCart,
  updatePickupProducerForPallet,
  type CartLine,
} from "@/lib/pallet-auto-management";
import { isB2BHost } from "@/lib/b2b-site";
import { headers } from "next/headers";
import {
  awardPointsForOwnOrder,
  awardPointsForInviteSecondOrder,
  checkPalletMilestone,
  awardPointsForPalletMilestone,
  getBaseIPForBottles,
  normalizeMembershipLevel,
} from "@/lib/membership/points-engine";
import {
  awardPactPointsForInviteFirstOrder,
  awardPactPointsForOwnOrder,
  getRedeemableBalance,
  redeemPactPoints,
} from "@/lib/membership/pact-points-engine";
import {
  allocatePactRedemptionPoints,
  calculateBoostAwareMaxRedemption,
} from "@/lib/membership/pact-points-redemption-math";
import type { CartItem } from "@/lib/shopify/types";
import type { CartItem as SixBottleCartItem } from "@/lib/checkout-validation";
import {
  applyFoundingMemberDoubleIP,
  checkAndGrantFoundingMember,
} from "@/lib/membership/founding-member";
import {
  applyProgressionBuffs,
  checkAndAwardProgressionRewards,
} from "@/lib/membership/progression-rewards";
import { checkAndMintMilestoneVouchers } from "@/lib/membership/milestone-vouchers";
import { tryActivateReferralOnFirstOrder } from "@/lib/referral/activate-referral-on-first-order";
import { stripe } from "@/lib/stripe";
import { calculateCartShippingCost } from "@/lib/shipping-calculations";
import {
  CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
  US_CHARGE_BLOCKED_REASON,
  US_CONDITIONAL_TERMS_VERSION,
  getCountryMarketMode,
  isSupportedCheckoutCountry,
  isValidUsStateCode,
  normalizeProfileCountry,
} from "@/lib/countries";
import {
  legacyMarketModeFromResolved,
  resolveMarketForCountry,
} from "@/lib/market/resolve-market";
import { assertClientMarketDropIdAllowed } from "@/lib/market/resolve-market-drop";
import { resolveOrCreateMarketDropIdForCheckout } from "@/lib/market/get-or-create-market-drop";
import { resolveActiveGeoZoneForUser } from "@/lib/market/resolve-active-geo-zone";

type ProducerGroup = {
  producerId: string;
  lines: CartItem[];
  subtotalSek: number;
};

function sumLineAmountsSek(lines: readonly CartItem[]): number {
  return lines.reduce((sum, line) => {
    const v = parseFloat(String(line.cost.totalAmount.amount));
    return sum + (Number.isFinite(v) ? v : 0);
  }, 0);
}

/**
 * Allocate a discount pool in öre across producer groups.
 * Weight = each group's merchandise subtotal; denominator = sum(subtotals) + shipping (SEK → öre).
 * Each share is floored; remainder öre goes to the group with the largest subtotal (ties → lowest index).
 */
function splitDiscountPoolOreByCheckoutWeights(
  subtotalsSek: readonly number[],
  shippingSek: number,
  poolOre: number,
): number[] {
  const n = subtotalsSek.length;
  if (n === 0) return [];
  const grossOre = subtotalsSek.map((s) =>
    Math.max(0, Math.round((Number.isFinite(s) ? s : 0) * 100)),
  );
  const sumSub = subtotalsSek.reduce(
    (a, b) => a + (Number.isFinite(b) ? b : 0),
    0,
  );
  const ship = Number.isFinite(shippingSek) ? shippingSek : 0;
  const checkoutOre = Math.round((sumSub + ship) * 100);
  if (poolOre <= 0 || checkoutOre <= 0) return grossOre.map(() => 0);

  const floors = grossOre.map((g) => Math.floor((poolOre * g) / checkoutOre));
  const remainder = poolOre - floors.reduce((a, b) => a + b, 0);
  let idxMax = 0;
  for (let i = 1; i < n; i++) {
    if (grossOre[i] > grossOre[idxMax]) idxMax = i;
  }
  const out = [...floors];
  out[idxMax] += remainder;
  return out;
}

export async function POST(request: Request) {
  let voucherApplied = false;
  let voucherDiscountCents = 0;
  let pactPointsRedeemed = 0;
  let pactPointsRedeemedCents = 0;

  try {
    console.log("=== CHECKOUT CONFIRM START ===");

    // Handle both JSON and form data
    let body;
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      body = await request.json();
    } else {
      // Handle form data
      const formData = await request.formData();
      const voucherCodeField = formData.get("voucher_code");
      const pactPointsRedeemField = formData.get("pact_points_redeem");
      const stripeIntentIdField = formData.get("stripe_intent_id");
      const stripeIntentTypeField = formData.get("stripe_intent_type");
      const marketDropIdField = formData.get("market_drop_id");
      body = {
        address: {
          fullName: formData.get("fullName"),
          email: formData.get("email"),
          phone: formData.get("phone"),
          street: formData.get("street"),
          postcode: formData.get("postcode"),
          city: formData.get("city"),
          countryCode: formData.get("countryCode"),
          regionCode: formData.get("regionCode"),
        },
        selectedDeliveryZoneId: formData.get("selectedDeliveryZoneId"),
        selectedPalletId: formData.get("selectedPalletId"),
        shareBottles: formData.get("shareBottles"),
        voucher_code:
          typeof voucherCodeField === "string" ? voucherCodeField : undefined,
        pact_points_redeem:
          typeof pactPointsRedeemField === "string"
            ? Number(pactPointsRedeemField)
            : pactPointsRedeemField instanceof File
              ? undefined
              : pactPointsRedeemField != null
                ? Number(String(pactPointsRedeemField))
                : undefined,
        stripe_intent_id:
          typeof stripeIntentIdField === "string" ? stripeIntentIdField : undefined,
        stripe_intent_type:
          typeof stripeIntentTypeField === "string"
            ? stripeIntentTypeField
            : undefined,
        market_drop_id:
          typeof marketDropIdField === "string" && marketDropIdField.trim()
            ? marketDropIdField.trim()
            : undefined,
        // paymentMethodId removed - using new payment flow
      };
    }

    console.log("Checkout confirm body:", body);

    const { address } = body;

    if (!address) {
      console.error("Missing address in request body");
      return NextResponse.json(
        { error: "Missing address information" },
        { status: 400 },
      );
    }

    type Addr = typeof address & { regionCode?: unknown; region?: unknown };
    const addr = address as Addr;
    const rcForm =
      typeof addr.regionCode === "string"
        ? addr.regionCode.trim().toUpperCase()
        : typeof addr.region === "string"
          ? addr.region.trim().toUpperCase()
          : "";
    if (rcForm.length === 2) {
      (address as { regionCode: string }).regionCode = rcForm;
    }

    const rawCountryCode =
      typeof address.countryCode === "string" ? address.countryCode.trim() : "";
    const normalizedCountry = normalizeProfileCountry(rawCountryCode);
    if (!normalizedCountry || getCountryMarketMode(normalizedCountry) === "unsupported") {
      return NextResponse.json(
        { error: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE },
        { status: 422 },
      );
    }
    if (
      getCountryMarketMode(normalizedCountry) === "normal_checkout" &&
      !isSupportedCheckoutCountry(normalizedCountry)
    ) {
      return NextResponse.json(
        { error: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE },
        { status: 422 },
      );
    }
    address.countryCode = normalizedCountry;

    // Get current user to ensure we have an email address
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const activeCheckout = await resolveActiveGeoZoneForUser(user.id);
    if (normalizedCountry !== activeCheckout.countryCode) {
      return NextResponse.json(
        {
          error:
            "Delivery country does not match your active shopping zone. Switch wine zone or update delivery details.",
        },
        { status: 400 },
      );
    }

    // Ensure we have an email address - use authenticated user's email as fallback
    if (!address.email || address.email.trim() === "") {
      address.email = user.email;
      console.log("📧 Using authenticated user email as fallback:", user.email);
    }

    // Get current cart
    const cart = await CartService.getCart();
    if (!cart || cart.totalQuantity === 0) {
      console.error("Cart is empty");
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    console.log("Processing cart:", cart);

    // Optional: share bottles payload (friends + allocations per cart line)
    let sharePayload: null | {
      friendIds: string[];
      allocations: Record<string, Record<string, number>>;
    } = null;

    if (body?.shareBottles) {
      try {
        const raw =
          typeof body.shareBottles === "string"
            ? body.shareBottles
            : String(body.shareBottles);
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.friendIds) && parsed.allocations) {
          sharePayload = {
            friendIds: parsed.friendIds,
            allocations: parsed.allocations,
          };
        }
      } catch (e) {
        console.warn("[Checkout API] Ignoring invalid shareBottles payload");
        sharePayload = null;
      }
    }

    // SERVER-SIDE VALIDATION: 6-bottle rule
    console.log("🔍 [Checkout API] Validating 6-bottle rule...");
    const { validateSixBottleRule } = await import("@/lib/checkout-validation");
    const validation = await validateSixBottleRule(
      cart.lines as unknown as SixBottleCartItem[],
    );

    if (!validation.isValid) {
      console.error(
        "❌ [Checkout API] 6-bottle validation failed:",
        validation.errors,
      );
      return NextResponse.json(
        {
          error: "Order must contain bottles in multiples of 6 per producer",
          validationErrors: validation.errors,
          producerValidations: validation.producerValidations,
        },
        { status: 400 },
      );
    }
    console.log("✅ [Checkout API] 6-bottle validation passed");

    const sb = await supabaseServer();
    const sbAdmin = getSupabaseAdmin();

    const resolvedMarketConfirm = await resolveMarketForCountry({
      countryCode: activeCheckout.countryCode,
      regionCode: activeCheckout.regionCode,
    });
    const profileCityForMarketDrop =
      (typeof activeCheckout.city === "string" && activeCheckout.city.trim()
        ? activeCheckout.city.trim()
        : null) ||
      (typeof address.city === "string" && address.city.trim()
        ? address.city.trim()
        : null);
    const legacyMarketCompare = getCountryMarketMode(address.countryCode);
    if (
      legacyMarketModeFromResolved(resolvedMarketConfirm) !== legacyMarketCompare
    ) {
      console.warn("[checkout/confirm] Market resolver vs legacy mismatch", {
        countryCode: address.countryCode,
        legacy: legacyMarketCompare,
        derived: legacyMarketModeFromResolved(resolvedMarketConfirm),
        resolvedMarket: resolvedMarketConfirm,
      });
    }

    // Check if we're on B2B site (dirtywine.se)
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const isB2BSite = isB2BHost(host);

    if (
      !isB2BSite &&
      !resolvedMarketConfirm.isCheckoutEligible &&
      !resolvedMarketConfirm.isConditionalReservationEligible
    ) {
      return NextResponse.json(
        {
          error:
            resolvedMarketConfirm.reason?.trim() ||
            CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE,
        },
        { status: 422 },
      );
    }

    // Separate producer and warehouse items (only on B2B sites)
    // On B2C sites (pactwines.com), all items are treated as producer items
    const producerItems = isB2BSite ? (cart.lines || []).filter(
      (line: any) => line.source === "producer" || !line.source
    ) : (cart.lines || []);
    const warehouseItems = isB2BSite ? (cart.lines || []).filter(
      (line: any) => line.source === "warehouse"
    ) : [];
    const hasProducerItems = isB2BSite ? producerItems.length > 0 : cart.lines.length > 0;
    const hasWarehouseItems = isB2BSite && warehouseItems.length > 0;

    // Get payment method type (only for warehouse orders on B2B sites)
    const paymentMethodType = isB2BSite ? ((body.paymentMethodType as "card" | "invoice") || "card") : "card";

    // Producer grouping: B2B keeps single-producer validation; B2C can split checkout by producer.
    let producerIdForReservation: string | null = null;
    const producerGroupsForB2C: ProducerGroup[] = [];
    const wineProducerByWineId = new Map<string, string>();

    if (hasProducerItems) {
      const producerWineIds = Array.from(
        new Set(
          producerItems.map((l) => String(l?.merchandise?.id)).filter(Boolean),
        ),
      );

      const { data: cartWines, error: cartWinesError } = await sbAdmin
        .from("wines")
        .select("id, producer_id")
        .in("id", producerWineIds);

      if (cartWinesError) {
        console.error("[Checkout API] Failed to fetch wines for cart:", cartWinesError);
        return NextResponse.json(
          { error: "Failed to validate cart items" },
          { status: 500 },
        );
      }

      for (const w of cartWines || []) {
        const wid = w?.id != null ? String(w.id) : "";
        const pid = w?.producer_id != null ? String(w.producer_id) : "";
        if (wid && pid) wineProducerByWineId.set(wid, pid);
      }

      const uniqueProducerIds = Array.from(new Set(wineProducerByWineId.values()));

      if (isB2BSite) {
        if (uniqueProducerIds.length !== 1) {
          return NextResponse.json(
            {
              error:
                "Producer orders must contain wines from a single producer (producer approval required).",
            },
            { status: 400 },
          );
        }
        producerIdForReservation = uniqueProducerIds[0] ?? null;
      } else {
        if (uniqueProducerIds.length === 0) {
          return NextResponse.json(
            { error: "Cart wines must be linked to a producer" },
            { status: 400 },
          );
        }
        const sortedProducerIds = [...uniqueProducerIds].sort((a, b) =>
          a.localeCompare(b),
        );
        for (const producerId of sortedProducerIds) {
          const lines = producerItems.filter(
            (line) => wineProducerByWineId.get(String(line.merchandise.id)) === producerId,
          );
          if (lines.length === 0) continue;
          producerGroupsForB2C.push({
            producerId,
            lines,
            subtotalSek: sumLineAmountsSek(lines),
          });
        }
        if (producerGroupsForB2C.length === 0) {
          return NextResponse.json(
            { error: "Failed to group cart by producer" },
            { status: 400 },
          );
        }
        producerIdForReservation = producerGroupsForB2C[0]?.producerId ?? null;
      }
    }

    const b2cProducerCheckout =
      !isB2BSite && hasProducerItems && producerGroupsForB2C.length > 0;

    const usConditionalCheckout =
      !isB2BSite &&
      resolvedMarketConfirm.checkoutMode === "conditional_reservation" &&
      resolvedMarketConfirm.isConditionalReservationEligible;

    // Get current user if authenticated
    const currentUser = await getCurrentUser();
    console.log("Current user:", currentUser?.id || "Anonymous");

    // Determine pickup and delivery zones before persisting address / reservation
    console.log("Determining zones based on cart items and delivery address");
    let preferredDeliveryZoneId: string | null = null;
    if (currentUser?.id) {
      const activeGeo = await resolveActiveGeoZoneForUser(currentUser.id);
      preferredDeliveryZoneId = activeGeo.defaultDeliveryZoneId;
    }
    const zones = await determineZones(
      cart.lines,
      {
        postcode: address.postcode,
        city: address.city,
        countryCode: address.countryCode,
      },
      { preferredDeliveryZoneId },
    );

    console.log("Zones determined:", zones);

    if (zones.noDeliveryZone?.error === "UNSUPPORTED_COUNTRY") {
      return NextResponse.json(
        { error: CHECKOUT_UNSUPPORTED_COUNTRY_USER_MESSAGE },
        { status: 422 },
      );
    }

    if (usConditionalCheckout) {
      if (zones.noDeliveryZone?.error === "NO_DELIVERY_ZONE") {
        return NextResponse.json(
          {
            error:
              zones.noDeliveryZone.message?.trim() ||
              "No pallet is available for this conditional reservation.",
          },
          { status: 400 },
        );
      }
    } else if (!zones.deliveryZoneId) {
      return NextResponse.json(
        {
          error:
            zones.noDeliveryZone?.message?.trim() ||
            "No delivery zone matches your address.",
        },
        { status: 400 },
      );
    }

    // Save customer address
    console.log("Saving customer address:", address);
    const { data: savedAddress, error: addressError } = await sb
      .from("user_addresses")
      .insert({
        user_id: currentUser?.id || null,
        full_name: address.fullName,
        email: address.email,
        phone: address.phone,
        address_street: address.street,
        address_postcode: address.postcode,
        address_city: address.city,
        country_code: address.countryCode,
      })
      .select()
      .single();

    if (addressError) {
      console.error("Failed to save address:", addressError);
      return NextResponse.json(
        { error: "Failed to save address" },
        { status: 500 },
      );
    }

    console.log("Address saved:", savedAddress);

    // Use selected delivery zone if provided
    let finalDeliveryZoneId = zones.deliveryZoneId;
    if (body.selectedDeliveryZoneId) {
      finalDeliveryZoneId = body.selectedDeliveryZoneId;
      console.log("Using selected delivery zone:", finalDeliveryZoneId);
    }

    // Pallet: shipping-region automation first, then legacy zone-pair match (determineZones unchanged).
    let palletId: string | null = null;
    let reservationShippingRegionId: string | null = null;

    if (body.selectedPalletId) {
      palletId = body.selectedPalletId;
      console.log("Using selected pallet:", palletId);
    } else {
      const regionResult = await resolveShippingRegionForCart(
        cart.lines as CartLine[],
      );
      if (
        regionResult.shippingRegionId &&
        finalDeliveryZoneId &&
        !regionResult.hasMultipleRegions
      ) {
        const { palletId: regionPalletId, created } =
          await findOrCreatePalletForRegion(
            regionResult.shippingRegionId,
            finalDeliveryZoneId,
          );
        palletId = regionPalletId;
        reservationShippingRegionId = regionResult.shippingRegionId;
        console.log(
          "Using shipping-region pallet:",
          palletId,
          created ? "(created)" : "(existing)",
        );
      } else if (zones.pickupZoneId && finalDeliveryZoneId) {
        const { data: matchingPallets, error: palletsError } = await sbAdmin
          .from("pallets")
          .select("id")
          .eq("pickup_zone_id", zones.pickupZoneId)
          .eq("delivery_zone_id", finalDeliveryZoneId)
          .limit(1);

        if (!palletsError && matchingPallets && matchingPallets.length > 0) {
          palletId = matchingPallets[0].id as string;
          console.log("Found matching zone-pair pallet:", palletId);
        }
      }
    }

    if (usConditionalCheckout && palletId) {
      const { data: palletGeo, error: palletGeoErr } = await sbAdmin
        .from("pallets")
        .select("delivery_zone_id, pickup_zone_id")
        .eq("id", palletId)
        .maybeSingle();
      if (palletGeoErr) {
        console.error("[CHECKOUT] US conditional pallet load:", palletGeoErr);
      }
      const dzRaw = (palletGeo as { delivery_zone_id?: unknown } | null)
        ?.delivery_zone_id;
      const pzRaw = (palletGeo as { pickup_zone_id?: unknown } | null)
        ?.pickup_zone_id;
      const dzId =
        typeof dzRaw === "string" && dzRaw.trim() !== "" ? dzRaw.trim() : null;
      const pzId =
        typeof pzRaw === "string" && pzRaw.trim() !== "" ? pzRaw.trim() : null;
      if (dzId) finalDeliveryZoneId = dzId;
      if (pzId && !zones.pickupZoneId) zones.pickupZoneId = pzId;
      if (!finalDeliveryZoneId?.trim()) {
        return NextResponse.json(
          {
            error:
              "Selected pallet is missing a delivery zone; cannot place reservation.",
          },
          { status: 400 },
        );
      }
    }

    const clientMarketDropIdRaw =
      body && typeof body === "object" && "market_drop_id" in body
        ? (body as { market_drop_id?: unknown }).market_drop_id
        : undefined;
    const clientMarketDropId =
      typeof clientMarketDropIdRaw === "string" && clientMarketDropIdRaw.trim()
        ? clientMarketDropIdRaw.trim()
        : null;

    let serverMarketDropIdSingle: string | null = null;
    if (!isB2BSite && palletId) {
      serverMarketDropIdSingle = await resolveOrCreateMarketDropIdForCheckout({
        sourcePalletId: palletId,
        resolvedMarket: resolvedMarketConfirm,
        usConditionalCheckout,
        profileCity: profileCityForMarketDrop,
      });
      if (usConditionalCheckout && !serverMarketDropIdSingle) {
        return NextResponse.json(
          {
            error:
              "No market drop is available for this US location. Check your state or try again later.",
          },
          { status: 400 },
        );
      }
      const mdAssert = assertClientMarketDropIdAllowed({
        clientMarketDropId,
        serverMarketDropId: serverMarketDropIdSingle,
      });
      if (!mdAssert.ok) {
        return NextResponse.json({ error: mdAssert.message }, { status: 400 });
      }
    }

    // Extract discount inputs early so we can validate Stripe intent amounts server-side.
    const voucherCodeRaw =
      body && typeof body === "object" && "voucher_code" in body
        ? (body as { voucher_code?: unknown }).voucher_code
        : undefined;
    const voucher_code =
      typeof voucherCodeRaw === "string" && voucherCodeRaw.trim() !== ""
        ? voucherCodeRaw.trim()
        : undefined;

    const pactPointsRedeemRaw =
      body && typeof body === "object" && "pact_points_redeem" in body
        ? (body as { pact_points_redeem?: unknown }).pact_points_redeem
        : undefined;
    const pact_points_redeem =
      typeof pactPointsRedeemRaw === "number"
        ? pactPointsRedeemRaw
        : typeof pactPointsRedeemRaw === "string"
          ? Number(pactPointsRedeemRaw)
          : 0;

    // If voucher_code is present, validate/apply it before amount validation.
    // TODO: extend voucher ledger / use_discount_code to attribute redemption across all
    // order_reservations in checkout_group_id (today RPC is cart-total only; no reservation id).
    if (voucher_code && user?.id) {
      try {
        // List-price subtotal (pre member / early-bird) for voucher eligibility — matches milestone mint comment.
        const { data: listPriceRows, error: listPriceError } = await sbAdmin
          .from("cart_items")
          .select("quantity, wines ( base_price_cents )")
          .eq("cart_id", cart.id);

        let listPriceTotalCents = 0;
        if (!listPriceError && listPriceRows?.length) {
          for (const row of listPriceRows) {
            const winesUnknown = row.wines as unknown;
            const wine = Array.isArray(winesUnknown)
              ? (winesUnknown[0] as { base_price_cents: number | null } | undefined)
              : (winesUnknown as { base_price_cents: number | null } | null);
            const unit = wine?.base_price_cents;
            if (typeof unit === "number" && unit > 0) {
              listPriceTotalCents += unit * row.quantity;
            }
          }
        }
        if (listPriceTotalCents <= 0) {
          listPriceTotalCents = Math.round(
            parseFloat(String(cart.cost.totalAmount.amount)) * 100,
          );
        }

        const { data: rpcData, error: rpcError } = await sbAdmin.rpc(
          "use_discount_code",
          {
            p_code: voucher_code,
            p_user_id: user.id,
            p_order_amount_cents: listPriceTotalCents,
          },
        );

        if (rpcError) {
          console.error("[Checkout API] use_discount_code RPC error:", rpcError);
        } else {
          const rows = Array.isArray(rpcData)
            ? rpcData
            : rpcData != null
              ? [rpcData]
              : [];
          const row = rows[0] as
            | {
                success?: boolean;
                discount_amount_cents?: number;
                error_message?: string | null;
              }
            | undefined;

          if (row?.success === true) {
            voucherApplied = true;
            voucherDiscountCents = Number(row.discount_amount_cents) || 0;
            console.log(
              "[Checkout API] Voucher applied, discount cents:",
              voucherDiscountCents,
            );
          } else if (row && row.success === false && row.error_message) {
            console.log("[Checkout API] Voucher not applied:", row.error_message);
          }
        }
      } catch (voucherErr) {
        console.error("[Checkout API] use_discount_code failed:", voucherErr);
      }
    }

    // Phase 2.2.A: Attach Stripe intent to reservation
    const stripe_intent_id =
      body && typeof body === "object" && "stripe_intent_id" in body
        ? (body as { stripe_intent_id?: unknown }).stripe_intent_id
        : undefined;
    const stripe_intent_type =
      body && typeof body === "object" && "stripe_intent_type" in body
        ? (body as { stripe_intent_type?: unknown }).stripe_intent_type
        : undefined;

    const intentId =
      typeof stripe_intent_id === "string" && stripe_intent_id.trim() !== ""
        ? stripe_intent_id.trim()
        : null;
    const intentType =
      stripe_intent_type === "setup_intent" || stripe_intent_type === "payment_intent"
        ? stripe_intent_type
        : null;

    if (!intentId || !intentType) {
      return NextResponse.json(
        { error: "Missing stripe_intent_id or stripe_intent_type" },
        { status: 400 },
      );
    }

    if (!stripe) {
      console.error("[Checkout API] Stripe not configured");
      return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
    }

    let profileRegionUpper: string | null = null;
    if (usConditionalCheckout) {
      if (intentType !== "setup_intent") {
        return NextResponse.json(
          {
            error:
              "US conditional reservations require card verification only (SetupIntent).",
          },
          { status: 400 },
        );
      }
      if (!user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const ru =
        typeof (address as { regionCode?: string }).regionCode === "string"
          ? (address as { regionCode: string }).regionCode.trim().toUpperCase()
          : "";
      if (!isValidUsStateCode(ru)) {
        return NextResponse.json(
          {
            error:
              "Add a valid US state to your delivery details before completing checkout.",
          },
          { status: 400 },
        );
      }
      if (
        activeCheckout.regionCode &&
        activeCheckout.regionCode.trim().toUpperCase() !== ru
      ) {
        return NextResponse.json(
          {
            error:
              "US state on your delivery address must match your active wine zone.",
          },
          { status: 400 },
        );
      }
      profileRegionUpper = ru;
    }

    // ------------------------------------------------------------
    // Server-side amount validation (never trust client totals)
    // ------------------------------------------------------------
    // Expected amount is calculated from:
    // - cart-service totals (member + early-bird already applied)
    // + shipping (selected pallet)
    // - voucher discount (if applied above)
    // - PACT Points discount (boost-aware redemption math)
    const subtotalSek = parseFloat(String(cart.cost.totalAmount.amount)) || 0;

    let shippingSek = 0;
    try {
      if (palletId) {
        const { data: palletRow, error: palletErr } = await sbAdmin
          .from("pallets")
          .select("id, name, cost_cents, bottle_capacity")
          .eq("id", palletId)
          .maybeSingle();
        if (palletErr) throw palletErr;
        if (palletRow) {
          const shipping = calculateCartShippingCost(
            (cart.lines || []).map((l) => ({ quantity: l.quantity })),
            {
              id: String(palletRow.id),
              name: String(palletRow.name ?? ""),
              costCents: Number(palletRow.cost_cents) || 0,
              bottleCapacity: Number(palletRow.bottle_capacity) || 0,
              currentBottles: 0,
              remainingBottles: 0,
            },
          );
          shippingSek = shipping?.totalShippingCostSek ?? 0;
        }
      }
    } catch (shipErr) {
      console.error("[Checkout API] Failed to compute shipping for amount validation:", shipErr);
      return NextResponse.json(
        { error: "Failed to compute shipping" },
        { status: 500 },
      );
    }

    // Compute boost-aware PACT points discount (SEK) using current cart lines.
    let pactPointsSekOff = 0;
    try {
      if (currentUser?.id && Number.isFinite(pact_points_redeem) && pact_points_redeem > 0) {
        const lineAmount = (line: CartItem) =>
          parseFloat(String(line.cost.totalAmount.amount)) || 0;
        const isBoosted = (line: CartItem) =>
          line.merchandise.product.producerBoostActive === true;

        const boostedLineTotal = cart.lines
          .filter(isBoosted)
          .reduce((sum, line) => sum + lineAmount(line), 0);
        const nonBoostedLineTotal = cart.lines
          .filter((line) => !isBoosted(line))
          .reduce((sum, line) => sum + lineAmount(line), 0);

        const availablePoints = await getRedeemableBalance(currentUser.id);
        const { maxPoints: maxRedeemable } = calculateBoostAwareMaxRedemption(
          boostedLineTotal,
          nonBoostedLineTotal,
          availablePoints,
        );
        const requested = Math.floor(pact_points_redeem);
        const toRedeem = Math.min(requested, maxRedeemable);
        if (toRedeem > 0) {
          const alloc = allocatePactRedemptionPoints(
            toRedeem,
            boostedLineTotal,
            nonBoostedLineTotal,
          );
          pactPointsSekOff = alloc.sekDiscount;
        }
      }
    } catch (pactCalcErr) {
      console.error("[Checkout API] Failed to compute PACT points discount:", pactCalcErr);
      return NextResponse.json(
        { error: "Failed to compute PACT Points discount" },
        { status: 500 },
      );
    }

    const voucherSekOff = (Number(voucherDiscountCents) || 0) / 100;
    const expectedFinalSek = Math.max(
      0,
      subtotalSek + shippingSek - voucherSekOff - pactPointsSekOff,
    );
    const expectedAmountOre = Math.round(expectedFinalSek * 100);

    if (expectedAmountOre <= 0) {
      return NextResponse.json(
        { error: "Order total cannot be zero" },
        { status: 400 },
      );
    }

    // Keep in sync with /api/checkout/confirm-stripe-return (float / line-sum drift).
    const withinTolerance = (a: number, b: number) => Math.abs(a - b) <= 10;

    let stripePaymentMethodId: string | null = null;

    if (intentType === "setup_intent") {
      const setupIntent = await stripe.setupIntents.retrieve(intentId);
      console.log("[Checkout API] Retrieved SetupIntent:", {
        id: setupIntent.id,
        status: setupIntent.status,
        payment_method: setupIntent.payment_method,
      });

      if (setupIntent.status !== "succeeded") {
        return NextResponse.json(
          { error: "SetupIntent not succeeded" },
          { status: 400 },
        );
      }

      const expectedFromStripeRaw =
        setupIntent.metadata && typeof setupIntent.metadata.expected_amount_ore === "string"
          ? Number(setupIntent.metadata.expected_amount_ore)
          : NaN;
      if (!Number.isFinite(expectedFromStripeRaw)) {
        return NextResponse.json(
          { error: "SetupIntent missing expected_amount_ore metadata" },
          { status: 400 },
        );
      }
      if (!withinTolerance(expectedAmountOre, expectedFromStripeRaw)) {
        console.error("[Checkout API] Amount mismatch (setup_intent)", {
          expectedAmountOre,
          stripeExpectedAmountOre: expectedFromStripeRaw,
          diff: expectedAmountOre - expectedFromStripeRaw,
          subtotalSek,
          shippingSek,
          voucherDiscountCents,
          pactPointsSekOff,
        });
        return NextResponse.json(
          { error: "Amount mismatch" },
          { status: 400 },
        );
      }

      const paymentMethodId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : null;
      if (!paymentMethodId) {
        return NextResponse.json(
          { error: "SetupIntent missing payment_method" },
          { status: 400 },
        );
      }

      if (usConditionalCheckout) {
        const m = setupIntent.metadata ?? {};
        if (
          m.reservation_mode !== "conditional" ||
          m.market_code !== "US" ||
          m.country_code !== "US" ||
          m.age_21_confirmed !== "true" ||
          m.conditional_ack_confirmed !== "true" ||
          m.terms_version !== US_CONDITIONAL_TERMS_VERSION
        ) {
          return NextResponse.json(
            { error: "Invalid or incomplete US conditional payment setup." },
            { status: 400 },
          );
        }
        const metaRegion =
          typeof m.region === "string" ? m.region.trim().toUpperCase() : "";
        if (
          !profileRegionUpper ||
          metaRegion !== profileRegionUpper
        ) {
          return NextResponse.json(
            {
              error:
                "US state on your delivery details does not match card verification. Update delivery details and try again.",
            },
            { status: 400 },
          );
        }
      }

      stripePaymentMethodId = paymentMethodId;
    } else {
      if (usConditionalCheckout) {
        return NextResponse.json(
          {
            error:
              "US conditional reservations cannot use immediate card charges.",
          },
          { status: 400 },
        );
      }
      const paymentIntent = await stripe.paymentIntents.retrieve(intentId);
      console.log("[Checkout API] Retrieved PaymentIntent:", {
        id: paymentIntent.id,
        status: paymentIntent.status,
        payment_method: paymentIntent.payment_method,
      });

      if (paymentIntent.status !== "succeeded") {
        return NextResponse.json(
          { error: "PaymentIntent not succeeded" },
          { status: 400 },
        );
      }

      const stripeAmountOre = Number(paymentIntent.amount) || 0;
      if (!withinTolerance(expectedAmountOre, stripeAmountOre)) {
        console.error("[Checkout API] Amount mismatch (payment_intent)", {
          expectedAmountOre,
          stripeAmountOre,
          diff: expectedAmountOre - stripeAmountOre,
          subtotalSek,
          shippingSek,
          voucherDiscountCents,
          pactPointsSekOff,
        });
        return NextResponse.json(
          { error: "Amount mismatch" },
          { status: 400 },
        );
      }

      const paymentMethodId =
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : null;
      if (!paymentMethodId) {
        return NextResponse.json(
          { error: "PaymentIntent missing payment_method" },
          { status: 400 },
        );
      }
      stripePaymentMethodId = paymentMethodId;
    }

    const checkoutGroupId = b2cProducerCheckout ? crypto.randomUUID() : null;

    const rollbackCheckoutGroup = async () => {
      if (!checkoutGroupId) return;
      const { error: delErr } = await sbAdmin
        .from("order_reservations")
        .delete()
        .eq("checkout_group_id", checkoutGroupId);
      if (delErr) {
        console.error("[CHECKOUT] Failed to roll back checkout group:", delErr);
      }
    };

    type CreatedReservationRow = {
      id: string;
      producerId: string;
      palletId: string | null;
      amountSek: number;
    };

    let reservation: { id: string };
    let createdReservations: CreatedReservationRow[] = [];
    let reservationIdsForPayment: string[] = [];

    // TODO(before first US charge): legal/logistics must confirm allowed state, license, carrier,
    // adult signature, tax/duties, and terms — not implemented here.
    const usReservationExtra = usConditionalCheckout
      ? {
          status: "conditional_pending" as const,
          market_code: "US",
          country_code: "US",
          region: profileRegionUpper ?? undefined,
          is_conditional: true,
          charge_blocked_reason: US_CHARGE_BLOCKED_REASON,
          payment_method_type: "card" as const,
        }
      : { status: "pending_producer_approval" as const };

    if (b2cProducerCheckout) {
      const voucherPoolOre = Math.round(Number(voucherDiscountCents) || 0);
      const pactPoolOre = Math.round(pactPointsSekOff * 100);
      const subtotals = producerGroupsForB2C.map((g) => g.subtotalSek);
      const voucherOrePerGroup = splitDiscountPoolOreByCheckoutWeights(
        subtotals,
        shippingSek,
        voucherPoolOre,
      );
      const pactOrePerGroup = splitDiscountPoolOreByCheckoutWeights(
        subtotals,
        shippingSek,
        pactPoolOre,
      );

      for (let gi = 0; gi < producerGroupsForB2C.length; gi++) {
        const group = producerGroupsForB2C[gi]!;
        let groupPalletId: string | null = null;
        let groupShippingRegionId: string | null = null;

        if (body.selectedPalletId && typeof body.selectedPalletId === "string") {
          groupPalletId = body.selectedPalletId;
        } else {
          const regionResult = await resolveShippingRegionForCart(
            group.lines as CartLine[],
          );
          if (
            regionResult.shippingRegionId &&
            finalDeliveryZoneId &&
            !regionResult.hasMultipleRegions
          ) {
            const { palletId: regionPalletId } = await findOrCreatePalletForRegion(
              regionResult.shippingRegionId,
              finalDeliveryZoneId,
            );
            groupPalletId = regionPalletId;
            groupShippingRegionId = regionResult.shippingRegionId;
          } else {
            groupPalletId = palletId;
            groupShippingRegionId = reservationShippingRegionId;
          }
        }

        const groupVoucherSek = (voucherOrePerGroup[gi] ?? 0) / 100;
        const groupPactSek = (pactOrePerGroup[gi] ?? 0) / 100;
        const amountSek = Math.max(
          0,
          group.subtotalSek - groupVoucherSek - groupPactSek,
        );

        const groupMarketDropId =
          !isB2BSite && groupPalletId
            ? await resolveOrCreateMarketDropIdForCheckout({
                sourcePalletId: groupPalletId,
                resolvedMarket: resolvedMarketConfirm,
                usConditionalCheckout,
                profileCity: profileCityForMarketDrop,
              })
            : null;
        if (usConditionalCheckout && !groupMarketDropId) {
          await rollbackCheckoutGroup();
          return NextResponse.json(
            {
              error:
                "No market drop is available for this US location. Check your state or try again later.",
            },
            { status: 400 },
          );
        }

        const { data: row, error: insErr } = await sbAdmin
          .from("order_reservations")
          .insert({
            user_id: currentUser?.id || null,
            cart_id: cart.id,
            address_id: savedAddress.id,
            pickup_zone_id: zones.pickupZoneId,
            delivery_zone_id: finalDeliveryZoneId,
            pallet_id: groupPalletId,
            shipping_region_id: groupShippingRegionId,
            producer_id: group.producerId,
            checkout_group_id: checkoutGroupId,
            market_drop_id: groupMarketDropId,
            ...usReservationExtra,
          })
          .select("id")
          .single();

        if (insErr || !row?.id) {
          console.error("[CHECKOUT] Reservation insert failed:", insErr);
          await rollbackCheckoutGroup();
          return NextResponse.json(
            { error: "Failed to create reservation" },
            { status: 500 },
          );
        }

        const rid = String(row.id);
        console.log(
          `[CHECKOUT] Created reservation ${rid} for producer ${group.producerId} on pallet ${groupPalletId}`,
        );

        const itemRows = group.lines.map((line) => ({
          reservation_id: rid,
          item_id: line.merchandise.id,
          quantity: line.quantity,
          price_band: "market" as const,
        }));
        const { error: itemsInsErr } = await sb
          .from("order_reservation_items")
          .insert(itemRows);
        if (itemsInsErr) {
          console.error("[CHECKOUT] Reservation items failed:", itemsInsErr);
          await rollbackCheckoutGroup();
          return NextResponse.json(
            { error: "Failed to create reservation items" },
            { status: 500 },
          );
        }

        if (groupPalletId) {
          await updatePickupProducerForPallet(groupPalletId);
        }

        createdReservations.push({
          id: rid,
          producerId: group.producerId,
          palletId: groupPalletId,
          amountSek,
        });
        reservationIdsForPayment.push(rid);
      }

      reservation = { id: createdReservations[0]!.id };
    } else {
      console.log("Creating order reservation");
      const { data: resRow, error: reservationError } = await sbAdmin
        .from("order_reservations")
        .insert({
          user_id: currentUser?.id || null,
          cart_id: cart.id,
          address_id: savedAddress.id,
          pickup_zone_id: zones.pickupZoneId,
          delivery_zone_id: finalDeliveryZoneId,
          pallet_id: palletId,
          shipping_region_id: reservationShippingRegionId,
          producer_id: producerIdForReservation,
          market_drop_id: serverMarketDropIdSingle,
          ...usReservationExtra,
        })
        .select("id")
        .single();

      if (reservationError || !resRow?.id) {
        console.error("Failed to create reservation:", reservationError);
        return NextResponse.json(
          { error: "Failed to create reservation" },
          { status: 500 },
        );
      }

      reservation = { id: String(resRow.id) };
      reservationIdsForPayment = [reservation.id];
      console.log("Reservation created:", reservation);
    }

    if (checkoutGroupId && stripe) {
      try {
        if (intentType === "setup_intent") {
          const si = await stripe.setupIntents.retrieve(intentId);
          await stripe.setupIntents.update(intentId, {
            metadata: {
              ...(si.metadata ?? {}),
              checkout_group_id: checkoutGroupId,
            },
          });
        } else {
          const pi = await stripe.paymentIntents.retrieve(intentId);
          await stripe.paymentIntents.update(intentId, {
            metadata: {
              ...(pi.metadata ?? {}),
              checkout_group_id: checkoutGroupId,
            },
          });
        }
      } catch (metaErr) {
        console.warn("[CHECKOUT] Stripe metadata update (checkout_group_id):", metaErr);
      }
    }

    // Unique partial indexes (migration 138) allow each setup_intent_id / payment_intent_id
    // on at most one row. Multi-producer B2C checkout creates one reservation per producer but
    // a single Stripe intent for the whole cart — attach intent id only to the primary row;
    // siblings share payment_method_id + mode + status (auto-charge recomputes amount per row).
    const payIds = reservationIdsForPayment.filter(
      (id): id is string => typeof id === "string" && id.trim().length > 0,
    );
    if (payIds.length === 0) {
      console.error("[Checkout API] reservationIdsForPayment empty before Stripe attach");
      if (b2cProducerCheckout) await rollbackCheckoutGroup();
      else if (reservation?.id) {
        await sbAdmin.from("order_reservations").delete().eq("id", reservation.id);
      }
      return NextResponse.json(
        { error: "Failed to attach Stripe intent" },
        { status: 500 },
      );
    }
    const [primaryReservationId, ...siblingPayIds] = payIds;

    const siblingPayUpdate =
      intentType === "setup_intent"
        ? {
            payment_method_id: stripePaymentMethodId,
            payment_mode: "setup_intent" as const,
            payment_status: "pending" as const,
          }
        : {
            payment_method_id: stripePaymentMethodId,
            payment_mode: "payment_intent" as const,
            payment_status: "paid" as const,
          };

    const primaryPayUpdate =
      intentType === "setup_intent"
        ? { ...siblingPayUpdate, setup_intent_id: intentId }
        : { ...siblingPayUpdate, payment_intent_id: intentId };

    if (siblingPayIds.length > 0) {
      const { error: siblingPayErr } = await sbAdmin
        .from("order_reservations")
        .update(siblingPayUpdate)
        .in("id", siblingPayIds);
      if (siblingPayErr) {
        console.error(
          "[Checkout API] Failed to update sibling reservation payment fields:",
          siblingPayErr,
        );
        if (b2cProducerCheckout) {
          await rollbackCheckoutGroup();
        } else {
          await sbAdmin.from("order_reservations").delete().eq("id", reservation.id);
        }
        return NextResponse.json(
          { error: "Failed to attach Stripe intent" },
          { status: 500 },
        );
      }
    }

    const { error: payAttachErr } = await sbAdmin
      .from("order_reservations")
      .update(primaryPayUpdate)
      .eq("id", primaryReservationId);

    if (payAttachErr) {
      console.error("[Checkout API] Failed to update reservation payment fields:", payAttachErr);
      if (b2cProducerCheckout) {
        await rollbackCheckoutGroup();
      } else {
        await sbAdmin.from("order_reservations").delete().eq("id", reservation.id);
      }
      return NextResponse.json(
        { error: "Failed to attach Stripe intent" },
        { status: 500 },
      );
    }

    if (usConditionalCheckout && user?.id && profileRegionUpper) {
      const hdrs = await headers();
      const fwd = hdrs.get("x-forwarded-for");
      const ip =
        (typeof fwd === "string" ? fwd.split(",")[0]?.trim() : null) ||
        hdrs.get("x-real-ip") ||
        null;
      const ua = hdrs.get("user-agent") || null;
      for (const rid of reservationIdsForPayment) {
        const { error: termsErr } = await sbAdmin
          .from("market_terms_acceptances")
          .insert({
            user_id: user.id,
            market_code: "US",
            country_code: "US",
            region: profileRegionUpper,
            terms_version: US_CONDITIONAL_TERMS_VERSION,
            ip_address: ip,
            user_agent: ua,
            metadata: {
              order_reservation_id: rid,
              age_21_confirmed: true,
              conditional_reservation_ack: true,
              setup_intent_id: intentId,
            },
          });
        if (termsErr) {
          console.error("[Checkout API] market_terms_acceptances insert:", termsErr);
        }
      }
    }

    const reservationIdForWineId = (wineId: string): string => {
      if (!b2cProducerCheckout) return reservation.id;
      const pid = wineProducerByWineId.get(wineId);
      if (!pid) return reservation.id;
      return (
        createdReservations.find((c) => c.producerId === pid)?.id ?? reservation.id
      );
    };

    // Create reservation items (use all items, or filter by source if needed)
    if (!b2cProducerCheckout) {
      console.log("Creating reservation items");
      const itemsToAdd =
        hasWarehouseItems && !hasProducerItems
          ? warehouseItems
          : hasProducerItems && !hasWarehouseItems
            ? producerItems
            : cart.lines;

      const reservationItems = itemsToAdd.map((line) => ({
        reservation_id: reservation.id,
        item_id: line.merchandise.id,
        quantity: line.quantity,
        price_band: "market",
      }));

      const { error: itemsError } = await sb
        .from("order_reservation_items")
        .insert(reservationItems);

      if (itemsError) {
        console.error("Failed to create reservation items:", itemsError);
        return NextResponse.json(
          { error: "Failed to create reservation items" },
          { status: 500 },
        );
      }

      console.log("Reservation items created");

      if (palletId) {
        await updatePickupProducerForPallet(palletId);
      }
    }

    // Optional: persist share allocations (assign bottles to friends you follow)
    if (sharePayload && currentUser?.id) {
      const uuidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      const friendIds = (sharePayload.friendIds || [])
        .map((id) => String(id))
        .filter((id) => uuidRe.test(id) && id !== currentUser.id);

      if (friendIds.length > 0) {
        // Verify these are actually people the user follows
        const { data: followingRows, error: followingError } = await sbAdmin
          .from("followers")
          .select("following_id")
          .eq("follower_id", currentUser.id)
          .in("following_id", friendIds);

        if (followingError) {
          console.error("[Checkout API] Failed to verify following list:", followingError);
          return NextResponse.json(
            { error: "Failed to validate share recipients" },
            { status: 500 },
          );
        }

        const allowedFriendIds = new Set(
          (followingRows || []).map((r: any) => r.following_id),
        );
        const finalFriendIds = friendIds.filter((id) => allowedFriendIds.has(id));

        if (finalFriendIds.length > 0) {
          // Map cartLineId -> { wineId, quantity }
          const cartLineById = new Map<
            string,
            { wineId: string; quantity: number }
          >();
          for (const line of cart.lines || []) {
            cartLineById.set(String(line.id), {
              wineId: String(line.merchandise.id),
              quantity: Number(line.quantity) || 0,
            });
          }

          // Validate totals per cart line
          const totalsPerLine: Record<string, number> = {};
          for (const friendId of finalFriendIds) {
            const perLine = sharePayload.allocations?.[friendId] || {};
            for (const [lineIdRaw, qtyRaw] of Object.entries(perLine)) {
              const lineId = String(lineIdRaw);
              const qty = Math.floor(Number(qtyRaw) || 0);
              if (qty <= 0) continue;
              if (!cartLineById.has(lineId)) {
                return NextResponse.json(
                  { error: "Invalid share allocation" },
                  { status: 400 },
                );
              }
              totalsPerLine[lineId] = (totalsPerLine[lineId] || 0) + qty;
            }
          }

          for (const [lineId, totalQty] of Object.entries(totalsPerLine)) {
            const line = cartLineById.get(lineId);
            if (!line || totalQty > line.quantity) {
              return NextResponse.json(
                { error: "Share allocation exceeds reserved quantity" },
                { status: 400 },
              );
            }
          }

          // Build rows
          const shareRows: Array<{
            reservation_id: string;
            from_user_id: string;
            to_user_id: string;
            wine_id: string;
            quantity: number;
          }> = [];

          for (const friendId of finalFriendIds) {
            const perLine = sharePayload.allocations?.[friendId] || {};
            for (const [lineIdRaw, qtyRaw] of Object.entries(perLine)) {
              const lineId = String(lineIdRaw);
              const qty = Math.floor(Number(qtyRaw) || 0);
              if (qty <= 0) continue;
              const line = cartLineById.get(lineId);
              if (!line) continue;
              shareRows.push({
                reservation_id: reservationIdForWineId(line.wineId),
                from_user_id: currentUser.id,
                to_user_id: friendId,
                wine_id: line.wineId,
                quantity: qty,
              });
            }
          }

          if (shareRows.length > 0) {
            const { error: shareError } = await sbAdmin
              .from("reservation_shared_items")
              .insert(shareRows);
            if (shareError) {
              console.error("[Checkout API] Failed to save share allocations:", shareError);
              return NextResponse.json(
                {
                  error: "Failed to save share allocations",
                  ...(process.env.NODE_ENV !== "production"
                    ? {
                        debug: {
                          message: shareError.message,
                          code: (shareError as any).code,
                          details: (shareError as any).details,
                          hint: (shareError as any).hint,
                        },
                      }
                    : {}),
                },
                { status: 500 },
              );
            }
          }
        }
      }
    }

    // DEPRECATED: bookings table is being phased out in favor of
    // order_reservation_items which is the single source of truth
    // for pallet fill counts. The bookings insert is disabled to
    // prevent data divergence. The admin bookings page will be
    // migrated separately. See lib/pallet-fill-count.ts for the
    // canonical fill counting logic.
    //
    // // Convert cart items to bookings (per-line pallet when B2C split by producer)
    // console.log("Converting cart items to bookings with pallet:", palletId);
    //
    // const bookings = cart.lines.map((line) => {
    //   const wid = String(line.merchandise.id);
    //   let assignPallet = palletId;
    //   if (b2cProducerCheckout) {
    //     const pid = wineProducerByWineId.get(wid);
    //     const cr = pid
    //       ? createdReservations.find((c) => c.producerId === pid)
    //       : undefined;
    //     if (cr?.palletId) assignPallet = cr.palletId;
    //   }
    //   return {
    //     user_id: currentUser?.id || null,
    //     item_id: line.merchandise.id,
    //     quantity: line.quantity,
    //     band: "market",
    //     status: "reserved",
    //     pallet_id: assignPallet,
    //   };
    // });
    //
    // const { error: bookingsError } = await sb.from("bookings").insert(bookings);
    //
    // if (bookingsError) {
    //   console.error("Failed to create bookings:", bookingsError);
    //   return NextResponse.json(
    //     { error: "Failed to create bookings" },
    //     { status: 500 },
    //   );
    // }
    //
    // console.log("Bookings created");

    // Optional: redeem PACT Points (new system). Never block checkout on failure.
    if (currentUser?.id && Number.isFinite(pact_points_redeem) && pact_points_redeem > 0) {
      try {
        const lineAmount = (line: CartItem) =>
          parseFloat(String(line.cost.totalAmount.amount)) || 0;
        const isBoosted = (line: CartItem) =>
          line.merchandise.product.producerBoostActive === true;

        const boostedLineTotal = cart.lines
          .filter(isBoosted)
          .reduce((sum, line) => sum + lineAmount(line), 0);
        const nonBoostedLineTotal = cart.lines
          .filter((line) => !isBoosted(line))
          .reduce((sum, line) => sum + lineAmount(line), 0);

        const availablePoints = await getRedeemableBalance(currentUser.id);
        const { maxPoints: maxRedeemable } = calculateBoostAwareMaxRedemption(
          boostedLineTotal,
          nonBoostedLineTotal,
          availablePoints,
        );
        const requested = Math.floor(pact_points_redeem);
        const toRedeem = Math.min(requested, maxRedeemable);

        if (toRedeem > 0) {
          const alloc = allocatePactRedemptionPoints(
            toRedeem,
            boostedLineTotal,
            nonBoostedLineTotal,
          );
          const totalPointsUsed = alloc.pointsBoosted + alloc.pointsNonBoosted;
          const totalSekDiscount = alloc.sekDiscount;

          // related_order_id uses first reservation in checkout group; TODO: persist checkout_group_id on ledger rows.
          const redeemResult = await redeemPactPoints(
            currentUser.id,
            totalPointsUsed,
            reservation.id,
            intentType === "setup_intent",
          );

          if (redeemResult.success) {
            pactPointsRedeemed = totalPointsUsed;
            pactPointsRedeemedCents = Math.round(totalSekDiscount * 100);
            voucherApplied = true;
            voucherDiscountCents += pactPointsRedeemedCents;
            console.log(
              `✅ [PACT] Redeemed ${totalPointsUsed} PACT Points (${totalSekDiscount} SEK off). New balance: ${redeemResult.newBalance}`,
            );
          } else {
            console.error("[PACT] redeemPactPoints failed:", redeemResult.error);
          }
        }
      } catch (pactRedeemErr) {
        console.error("[PACT] redeem flow error:", pactRedeemErr);
      }
    }

    // Update reservation(s) with zone information
    if (zones.pickupZoneId || finalDeliveryZoneId) {
      const { error: updateError } = await sb
        .from("order_reservations")
        .update({
          pickup_zone_id: zones.pickupZoneId,
          delivery_zone_id: finalDeliveryZoneId,
        })
        .in("id", reservationIdsForPayment);

      if (updateError) {
        console.error("Failed to update reservation with zones:", updateError);
      } else {
        console.log("Reservation updated with zone information");
      }
    }

    // Create reservation tracking record(s) — unique tracking_code per reservation
    console.log("Creating reservation tracking record(s)");

    for (const rid of reservationIdsForPayment) {
      const { data: trackingCodeResult, error: trackingCodeError } = await sb.rpc(
        "generate_tracking_code",
      );
      if (trackingCodeError) {
        console.error("Failed to generate tracking code:", trackingCodeError);
      }

      const trackingCode =
        trackingCodeResult?.data || Math.random().toString().slice(2, 10);

      const { data: trackingRecord, error: trackingError } = await sb
        .from("reservation_tracking")
        .insert({
          reservation_id: rid,
          customer_email: address.email,
          customer_name: address.fullName,
          tracking_code: trackingCode,
        })
        .select()
        .single();

      if (trackingError) {
        console.error("Failed to create tracking record:", trackingError);
      } else {
        console.log("Tracking record created:", trackingRecord);
      }
    }

    // Send order confirmation email immediately
    try {
      console.log("📧 Sending order confirmation email...");
      console.log("📧 Address data:", {
        email: address.email,
        fullName: address.fullName,
        street: address.street,
        city: address.city,
        postcode: address.postcode,
        countryCode: address.countryCode,
      });
      console.log("📧 Cart data:", {
        linesCount: cart.lines.length,
        totalAmount: cart.cost.totalAmount.amount,
        currency: cart.cost.totalAmount.currencyCode,
      });
      console.log("📧 Reservation ID:", reservation.id);

      const { sendGridService } = await import("@/lib/sendgrid-service");

      const emailData = {
        customerEmail: address.email,
        customerName: address.fullName,
        orderId: reservation.id,
        orderDate: new Date().toLocaleDateString(),
        items: cart.lines.map((line) => ({
          name: `${line.merchandise.product.title}`,
          quantity: line.quantity,
          price: parseFloat(
            line.merchandise.product.priceRange.minVariantPrice.amount,
          ),
          image: undefined,
        })),
        subtotal: parseFloat(cart.cost.totalAmount.amount),
        tax: 0,
        shipping: 0, // Will be calculated based on zones
        total: parseFloat(cart.cost.totalAmount.amount),
        shippingAddress: {
          name: address.fullName,
          street: address.street,
          city: address.city,
          postalCode: address.postcode,
          country: address.countryCode,
        },
      };

      console.log("📧 Prepared email data:", emailData);

      const emailSent = await sendGridService.sendOrderConfirmation(emailData);

      if (emailSent) {
        console.log(
          "📧 Order confirmation email sent successfully to:",
          address.email,
        );
      } else {
        console.error(
          "📧 Failed to send order confirmation email to:",
          address.email,
        );
      }
    } catch (emailError) {
      console.error("📧 Error sending order confirmation email:", emailError);
      console.error("📧 Error details:", emailError);
      // Email failure should not break the checkout process
    }

    // ============================================================
    // v2: PROGRESSION BUFFS & IP AWARDS
    // ============================================================

    if (currentUser) {
      try {
        console.log(
          "💎 [PROGRESSION] Processing progression buffs and IP awards for user:",
          currentUser.id,
        );

        try {
          const foundingMemberResult = await checkAndGrantFoundingMember(
            currentUser.id,
            reservation.id,
          );
          if (foundingMemberResult.granted) {
            console.log(
              `🏆 [FOUNDING] Granted Founding Member to ${currentUser.id}. Spots remaining: ${foundingMemberResult.spotsRemaining}`,
            );
          }
        } catch (fmErr) {
          console.error("[FOUNDING] checkAndGrantFoundingMember:", fmErr);
        }

        let currentLevel = "basic";
        try {
          const { data: levelRow } = await sbAdmin
            .from("user_memberships")
            .select("level")
            .eq("user_id", currentUser.id)
            .maybeSingle();
          if (levelRow?.level) {
            currentLevel = levelRow.level;
          }
        } catch (lvlErr) {
          console.error("[FOUNDING] reload membership level:", lvlErr);
        }

        // 1. Apply and mark progression buffs as used (before clearing cart)
        const buffResult = await applyProgressionBuffs(
          currentUser.id,
          reservation.id,
        );
        if (buffResult.success && buffResult.buffCount > 0) {
          console.log(
            `✅ [PROGRESSION] Applied ${buffResult.buffCount} buff(s) (${buffResult.appliedPercentage}%) to order`,
          );
        }

        // 2. Calculate total bottle count from cart
        const totalBottles = cart.lines.reduce(
          (sum, line) => sum + line.quantity,
          0,
        );
        console.log(`🍾 [PROGRESSION] Total bottles in order: ${totalBottles}`);

        const referralActivation = await tryActivateReferralOnFirstOrder({
          sb: sbAdmin,
          userId: currentUser.id,
          reservationId: reservation.id,
          totalBottles,
        });
        if (referralActivation.activated) {
          console.log(
            "✅ [REFERRAL] Activated personal-link referral (first qualifying order in window)",
          );
        }

        // 3. Award PACT Points for own order (tier multiplier handled in pact-points-engine)
        const ownOrderResult = await awardPactPointsForOwnOrder(
          currentUser.id,
          totalBottles,
          reservation.id,
          normalizeMembershipLevel(currentLevel),
        );
        if (ownOrderResult.success && ownOrderResult.pointsAwarded > 0) {
          console.log(
            `✅ [PACT] Awarded ${ownOrderResult.pointsAwarded} PACT Points. New balance: ${ownOrderResult.newBalance}`,
          );
        }

        try {
          if (normalizeMembershipLevel(currentLevel) === "founding_member") {
            const { data: fmRow, error: fmReadErr } = await sbAdmin
              .from("user_memberships")
              .select("founding_member_bottles_h1, founding_member_bottles_h2")
              .eq("user_id", currentUser.id)
              .single();
            if (fmReadErr) throw fmReadErr;
            const now = new Date();
            const isH1 = now.getMonth() < 6;
            const h1 = Number(fmRow?.founding_member_bottles_h1 ?? 0);
            const h2 = Number(fmRow?.founding_member_bottles_h2 ?? 0);
            if (isH1) {
              const { error: upErr } = await sbAdmin
                .from("user_memberships")
                .update({ founding_member_bottles_h1: h1 + totalBottles })
                .eq("user_id", currentUser.id);
              if (upErr) throw upErr;
            } else {
              const { error: upErr } = await sbAdmin
                .from("user_memberships")
                .update({ founding_member_bottles_h2: h2 + totalBottles })
                .eq("user_id", currentUser.id);
              if (upErr) throw upErr;
            }
          }
        } catch (bottleTrackErr) {
          console.error("[FOUNDING] bottle half-year counter:", bottleTrackErr);
        }

        // 5. Check if user was invited and this is their first qualifying order
        const { data: inviterInfo } = await sbAdmin
          .from("user_memberships")
          .select("invited_by")
          .eq("user_id", currentUser.id)
          .single();

        if (inviterInfo?.invited_by) {
          try {
            const qualifyingStatuses = [
              "pending_producer_approval",
              "approved",
              "partly_approved",
              "confirmed",
            ] as const;

            let priorOrdersQuery = sbAdmin
              .from("order_reservations")
              .select("id", { count: "exact", head: true })
              .eq("user_id", currentUser.id)
              .in("status", [...qualifyingStatuses]);
            for (const rid of reservationIdsForPayment) {
              priorOrdersQuery = priorOrdersQuery.neq("id", rid);
            }
            const { count: priorOrdersRaw, error: priorOrdersError } =
              await priorOrdersQuery;

            if (priorOrdersError) {
              console.error("[PACT] inviter first-order check:", priorOrdersError);
            } else {
              const priorOrders = priorOrdersRaw ?? 0;
              if (priorOrders === 0) {
                const inviterReward = await awardPactPointsForInviteFirstOrder(
                  inviterInfo.invited_by,
                  currentUser.id,
                  reservation.id,
                );
                if (inviterReward.success) {
                  console.log(
                    `✅ [PACT] Awarded inviter PACT Points for invitee's first order. New balance: ${inviterReward.newBalance}`,
                  );
                } else {
                  console.error(
                    "[PACT] awardPactPointsForInviteFirstOrder:",
                    inviterReward.error,
                  );
                }
              }
            }
          } catch (inviterPactErr) {
            console.error("[PACT] inviter reward flow:", inviterPactErr);
          }
        }
      } catch (progressionError) {
        console.error(
          "❌ [PROGRESSION] Error processing progression rewards:",
          progressionError,
        );
        // Don't fail the order if progression logic fails
      }
    }

    // Clear cart
    console.log("Clearing cart");
    await CartService.clearCart();

    // Check if pallet(s) are now complete
    console.log("Checking if pallet completion after new reservation");
    const palletIdsToFinalize = new Set<string>();
    if (b2cProducerCheckout) {
      for (const c of createdReservations) {
        if (c.palletId) palletIdsToFinalize.add(c.palletId);
      }
    } else if (palletId) {
      palletIdsToFinalize.add(palletId);
    }

    try {
      const { checkPalletCompletion } = await import("@/lib/pallet-completion");
      for (const pid of palletIdsToFinalize) {
        const isComplete = await checkPalletCompletion(pid);
        if (isComplete) {
          console.log(
            `🎉 Pallet ${pid} is now complete! Payment notifications triggered.`,
          );
        }
      }
    } catch (error) {
      console.error("Error checking pallet completion:", error);
    }

    // Auto status: once a pallet has at least one reservation, mark it as consolidating (unless already beyond).
    try {
      for (const pid of palletIdsToFinalize) {
        const { data: palletRow } = await sbAdmin
          .from("pallets")
          .select("id, status, status_mode")
          .eq("id", pid)
          .maybeSingle();
        const mode = (palletRow as { status_mode?: string } | null)?.status_mode || "auto";
        const status = String(
          (palletRow as { status?: string } | null)?.status || "open",
        ).toLowerCase();
        if (mode === "auto" && (status === "open" || status === "")) {
          await sbAdmin
            .from("pallets")
            .update({ status: "consolidating", updated_at: new Date().toISOString() })
            .eq("id", pid);
        }
      }
    } catch (e) {
      console.warn("[Checkout API] Failed to auto-set pallet status to consolidating");
    }

    console.log("=== CHECKOUT CONFIRM END ===");

    // IMPORTANT:
    // Do NOT redirect from an API route. `fetch()` will follow a 307 as a POST to the new URL,
    // which can break (and in dev may surface as HTML error pages). Return JSON and let the client navigate.
    const reservationsForResponse =
      b2cProducerCheckout && createdReservations.length > 0
        ? createdReservations
        : [
            {
              id: reservation.id,
              producerId: String(producerIdForReservation ?? ""),
              palletId,
              amountSek: Math.max(
                0,
                subtotalSek - voucherSekOff - pactPointsSekOff,
              ),
            },
          ];

    const checkoutGroupQuery = checkoutGroupId
      ? `&checkoutGroupId=${encodeURIComponent(checkoutGroupId)}`
      : "";
    const successMessage = usConditionalCheckout
      ? "Conditional reservation placed — your card was verified. You will not be charged until the drop is approved for your state."
      : "Reservation placed successfully";
    const successUrl = `/checkout/success?success=true&reservationId=${reservation.id}${checkoutGroupQuery}&message=${encodeURIComponent(
      successMessage,
    )}`;

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      checkoutGroupId: checkoutGroupId ?? undefined,
      reservations: reservationsForResponse,
      reservation: reservationsForResponse[0],
      redirectUrl: successUrl,
      voucherApplied,
      ...(voucherApplied ? { voucherDiscountCents } : {}),
      ...(pactPointsRedeemed > 0
        ? { pactPointsRedeemed, pactPointsRedeemedCents }
        : {}),
    });
  } catch (error) {
    console.error("=== CHECKOUT CONFIRM ERROR ===");
    console.error("Checkout confirm error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
