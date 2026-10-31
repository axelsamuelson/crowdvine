import type { SupabaseClient } from "@supabase/supabase-js";
import { calculatePromoDiscountAmountSek } from "@/lib/discount-codes";
import type { PromoDiscountCartItem } from "@/lib/discount-codes";
import type { Cart } from "@/lib/shopify/types";
import { exitDiscountScope } from "@/lib/exit-discount/config";
import {
  cartHasMemberOrEarlyBirdDiscount,
  EXIT_DISCOUNT_PRIOR_ORDER_STATUSES,
  isExitDiscountOrderInScope,
  normalizeEmail,
} from "@/lib/exit-discount/eligibility";
import {
  filterExitDiscountEligibleItems,
  loadExitDiscountExcludedWineIds,
  sumPromoItemsSek,
} from "@/lib/exit-discount/exclusions";
import { EXIT_DISCOUNT_ERRORS } from "@/lib/exit-discount/messages";

export type ExitDiscountLeadRow = {
  id: string;
  email: string;
  code: string;
  promo_discount_code_id: string | null;
  expires_at: string;
  redeemed_at: string | null;
};

export type ExitDiscountCheckoutContext = {
  cart?: Cart | null;
  voucherSek?: number;
  pactPointsRedeem?: number;
  palletId?: string | null;
  fulfillmentChannel?: string | null;
  /** Reservation ids to ignore when checking first order (current checkout). */
  excludeReservationIds?: string[];
};

export async function lookupExitDiscountLead(opts: {
  sb: SupabaseClient;
  promoDiscountCodeId?: string | null;
  code?: string | null;
}): Promise<ExitDiscountLeadRow | null> {
  if (opts.promoDiscountCodeId) {
    const { data, error } = await opts.sb
      .from("exit_discount_codes")
      .select(
        "id, email, code, promo_discount_code_id, expires_at, redeemed_at",
      )
      .eq("promo_discount_code_id", opts.promoDiscountCodeId)
      .maybeSingle();
    if (error) {
      console.error("[exit-discount] lead lookup by promo failed:", error);
      return null;
    }
    if (data) return data as ExitDiscountLeadRow;
  }

  const code = String(opts.code || "")
    .trim()
    .toUpperCase();
  if (!code) return null;

  const { data, error } = await opts.sb
    .from("exit_discount_codes")
    .select("id, email, code, promo_discount_code_id, expires_at, redeemed_at")
    .eq("code", code)
    .maybeSingle();
  if (error) {
    console.error("[exit-discount] lead lookup by code failed:", error);
    return null;
  }
  return (data as ExitDiscountLeadRow | null) ?? null;
}

async function userHasPriorOrder(
  sb: SupabaseClient,
  userId: string,
  excludeReservationIds: string[] = [],
): Promise<boolean> {
  const statuses = EXIT_DISCOUNT_PRIOR_ORDER_STATUSES.join(",");
  let q = sb
    .from("order_reservations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .or(
      `status.in.(${statuses}),and(status.eq.archived,status_before_archive.in.(${statuses}))`,
    );
  for (const rid of excludeReservationIds) {
    if (rid) q = q.neq("id", rid);
  }
  const { count, error } = await q;
  if (error) {
    console.error("[exit-discount] prior-order check failed:", error);
    // Fail closed: treat as prior order so we do not grant first-order discount
    // when we cannot verify.
    return true;
  }
  return (count ?? 0) > 0;
}

export type ExitDiscountRulesResult =
  | {
      ok: true;
      exitDiscountId: string;
      eligibleItems: PromoDiscountCartItem[];
      cartValueSek: number;
      discountAmountSek: number;
    }
  | { ok: false; error: string };

/**
 * Exit-specific rules after a promo_discount_codes row has already been found.
 * Recomputes amount on wine lines only (no shipping), excluding configured boxes.
 */
export async function applyExitDiscountRules(opts: {
  sb: SupabaseClient;
  userId: string;
  userEmail: string | null | undefined;
  lead: ExitDiscountLeadRow;
  promo: {
    type: "percent" | "sek";
    value: number;
  };
  items: PromoDiscountCartItem[];
  context?: ExitDiscountCheckoutContext | null;
}): Promise<ExitDiscountRulesResult> {
  const leadEmail = normalizeEmail(opts.lead.email);
  const userEmail = normalizeEmail(opts.userEmail);
  if (!userEmail || userEmail !== leadEmail) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.emailMismatch };
  }

  if (opts.lead.redeemed_at) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.alreadyRedeemed };
  }

  const expiresAt = new Date(opts.lead.expires_at).getTime();
  if (Number.isFinite(expiresAt) && Date.now() > expiresAt) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.expired };
  }

  const ctx = opts.context ?? {};
  const scope = exitDiscountScope();
  if (
    !isExitDiscountOrderInScope({
      scope,
      palletId: ctx.palletId,
      fulfillmentChannel: ctx.fulfillmentChannel,
    })
  ) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.scopePalletOnly };
  }

  const voucherSek = Math.max(0, Number(ctx.voucherSek) || 0);
  const pactPoints = Math.max(0, Math.floor(Number(ctx.pactPointsRedeem) || 0));
  if (pactPoints > 0) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.stackingPoints };
  }
  if (voucherSek > 0) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.stackingVoucher };
  }
  if (cartHasMemberOrEarlyBirdDiscount(ctx.cart ?? null)) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.stackingMemberOrEarlyBird };
  }

  if (
    await userHasPriorOrder(
      opts.sb,
      opts.userId,
      ctx.excludeReservationIds ?? [],
    )
  ) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.notFirstOrder };
  }

  const excluded = await loadExitDiscountExcludedWineIds(opts.sb);
  const eligibleItems = filterExitDiscountEligibleItems(opts.items, excluded);
  const cartValueSek = sumPromoItemsSek(eligibleItems);

  if (opts.items.length > 0 && eligibleItems.length === 0) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.excludedOnly };
  }
  if (cartValueSek <= 0) {
    return { ok: false, error: EXIT_DISCOUNT_ERRORS.noEligibleWine };
  }

  const discountAmountSek = calculatePromoDiscountAmountSek({
    type: opts.promo.type,
    value: opts.promo.value,
    // Wine lines only — never include shipping in the base.
    applies_to: "item",
    cart_value_sek: cartValueSek,
    items: eligibleItems,
  });

  return {
    ok: true,
    exitDiscountId: opts.lead.id,
    eligibleItems,
    cartValueSek,
    discountAmountSek,
  };
}

export async function markExitDiscountRedeemed(opts: {
  sb: SupabaseClient;
  exitDiscountId: string;
  redeemedAt?: Date;
}): Promise<{ ok: boolean; error?: string }> {
  const { error } = await opts.sb
    .from("exit_discount_codes")
    .update({
      redeemed_at: (opts.redeemedAt ?? new Date()).toISOString(),
    })
    .eq("id", opts.exitDiscountId)
    .is("redeemed_at", null);
  if (error) {
    console.error("[exit-discount] redeemed_at update failed:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
