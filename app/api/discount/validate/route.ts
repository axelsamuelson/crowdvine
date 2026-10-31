import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { validatePromoDiscountCode } from "@/lib/promo-discount-validate";
import { CartService } from "@/src/lib/cart-service";

const bodySchema = z.object({
  code: z.string().min(1),
  cart_value_sek: z.number().finite().nonnegative(),
  items: z
    .array(
      z.object({
        wine_id: z.string().min(1),
        quantity: z.number().finite().positive(),
        unit_price: z.number().finite().nonnegative(),
      }),
    )
    .default([]),
  /** Optional; used for exit-code stacking checks at apply-time. */
  pact_points_redeem: z.number().finite().nonnegative().optional(),
  voucher_sek: z.number().finite().nonnegative().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Du måste vara inloggad." }, { status: 401 });
    }

    const raw = await request.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "Ogiltig begäran." }, { status: 400 });
    }

    // Load cart so exit rules can see member/early-bird already baked into line prices.
    let cart = null;
    try {
      cart = await CartService.getCart();
    } catch (cartErr) {
      console.warn("[discount/validate] cart load failed:", cartErr);
    }

    const result = await validatePromoDiscountCode({
      sb: getSupabaseAdmin(),
      userId: user.id,
      userEmail: user.email ?? null,
      code: parsed.data.code,
      cart_value_sek: parsed.data.cart_value_sek,
      items: parsed.data.items,
      exitContext: {
        cart,
        voucherSek: parsed.data.voucher_sek ?? 0,
        pactPointsRedeem: parsed.data.pact_points_redeem ?? 0,
        palletId: null,
        fulfillmentChannel: null,
      },
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      discount_code_id: result.discount_code_id,
      code: result.code,
      type: result.type,
      value: result.value,
      applies_to: result.applies_to,
      purpose: result.purpose,
      discount_amount_sek: result.discount_amount_sek,
      final_total_sek: result.final_total_sek,
      is_exit_discount: result.is_exit_discount === true,
    });
  } catch (err) {
    console.error("[discount/validate] unexpected:", err);
    return NextResponse.json(
      { error: "Ett oväntat fel uppstod." },
      { status: 500 },
    );
  }
}
