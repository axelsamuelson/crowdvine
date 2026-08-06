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
  calculateCartShippingCost,
  resolveLastMileCostCentsPerBottle,
} from "@/lib/shipping-calculations";

type RequestBody = {
  pallet_id?: string;
  pact_points_redeem?: number;
  promo_discount_sek?: number;
  voucher_discount_sek?: number;
};

/**
 * Authoritative checkout money breakdown for display.
 * Same math as /api/checkout/payment-intent (cart + shipping − promo − voucher − points).
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

    const cart = await CartService.getCart();
    if (!cart || !cart.lines?.length) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    let shippingSek = 0;
    if (pallet_id) {
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

      const shipping = calculateCartShippingCost(
        cart.lines.map((l) => ({ quantity: l.quantity })),
        {
          id: String(palletRow.id),
          name: String(palletRow.name ?? ""),
          costCents: Number(palletRow.cost_cents) || 0,
          bottleCapacity: Number(palletRow.bottle_capacity) || 0,
          currentBottles: 0,
          remainingBottles: 0,
          lastMileCostCentsPerBottle: resolveLastMileCostCentsPerBottle(
            Number(palletRow.last_mile_cost_cents_per_bottle) || 0,
          ),
        },
      );
      shippingSek = shipping?.totalShippingCostSek ?? 0;
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
    });

    return NextResponse.json({ quote });
  } catch (error) {
    console.error("[checkout/quote]", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
