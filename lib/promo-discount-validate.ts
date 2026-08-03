import {
  calculatePromoDiscountAmountSek,
  type PromoDiscountAppliesTo,
  type PromoDiscountCartItem,
  type PromoDiscountType,
} from "@/lib/discount-codes";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PromoDiscountPurpose = "normal" | "testkop";

export type PromoValidationSuccess = {
  ok: true;
  discount_code_id: string;
  code: string;
  type: PromoDiscountType;
  value: number;
  applies_to: PromoDiscountAppliesTo;
  purpose: PromoDiscountPurpose;
  discount_amount_sek: number;
  final_total_sek: number;
};

export type PromoValidationFailure = {
  ok: false;
  error: string;
};

/**
 * Server-side promo validation (same rules as POST /api/discount/validate).
 */
export async function validatePromoDiscountCode(params: {
  sb: SupabaseClient;
  userId: string;
  code: string;
  cart_value_sek: number;
  items: PromoDiscountCartItem[];
}): Promise<PromoValidationSuccess | PromoValidationFailure> {
  const normalizedCode = params.code.trim().toUpperCase();
  if (!normalizedCode) {
    return { ok: false, error: "Koden finns inte eller är inaktiv." };
  }

  const { data: row, error } = await params.sb
    .from("promo_discount_codes")
    .select(
      "id, code, type, value, applies_to, purpose, max_uses, max_uses_per_user, user_id, valid_from, valid_until, active",
    )
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error) {
    console.error("[promo] lookup error:", error);
    return { ok: false, error: "Kunde inte validera koden." };
  }

  if (!row || row.active !== true) {
    return { ok: false, error: "Koden finns inte eller är inaktiv." };
  }

  const now = Date.now();
  const validFrom = row.valid_from ? new Date(row.valid_from).getTime() : 0;
  const validUntil = row.valid_until
    ? new Date(row.valid_until).getTime()
    : null;

  if (validFrom > now || (validUntil != null && now > validUntil)) {
    return { ok: false, error: "Koden har gått ut." };
  }

  if (row.user_id && row.user_id !== params.userId) {
    return {
      ok: false,
      error: "Den här koden är inte giltig för ditt konto.",
    };
  }

  if (row.max_uses != null) {
    const { count, error: countErr } = await params.sb
      .from("promo_discount_code_uses")
      .select("id", { count: "exact", head: true })
      .eq("discount_code_id", row.id);
    if (countErr) {
      return { ok: false, error: "Kunde inte validera koden." };
    }
    if ((count ?? 0) >= row.max_uses) {
      return {
        ok: false,
        error: "Koden har nått sitt maximala antal användningar.",
      };
    }
  }

  if (row.max_uses_per_user != null) {
    const { count, error: countErr } = await params.sb
      .from("promo_discount_code_uses")
      .select("id", { count: "exact", head: true })
      .eq("discount_code_id", row.id)
      .eq("user_id", params.userId);
    if (countErr) {
      return { ok: false, error: "Kunde inte validera koden." };
    }
    if ((count ?? 0) >= row.max_uses_per_user) {
      return { ok: false, error: "Du har redan använt den här koden." };
    }
  }

  const type = row.type as PromoDiscountType;
  const applies_to = row.applies_to as PromoDiscountAppliesTo;
  const purpose: PromoDiscountPurpose =
    row.purpose === "testkop" ? "testkop" : "normal";
  const value = Number(row.value);
  const discount_amount_sek = calculatePromoDiscountAmountSek({
    type,
    value,
    applies_to,
    cart_value_sek: params.cart_value_sek,
    items: params.items,
  });
  const final_total_sek = Math.max(
    0,
    params.cart_value_sek - discount_amount_sek,
  );

  return {
    ok: true,
    discount_code_id: row.id,
    code: String(row.code).toUpperCase(),
    type,
    value,
    applies_to,
    purpose,
    discount_amount_sek,
    final_total_sek,
  };
}
