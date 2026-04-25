import { createHash, randomBytes } from "node:crypto";

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  POINTS_FIRST_VOUCHER_THRESHOLD,
  POINTS_PER_ADDITIONAL_VOUCHER,
  VOUCHER_AMOUNT_SEK,
} from "@/lib/membership/points-engine";

function generateDiscountCodeCandidate(): string {
  return createHash("md5")
    .update(randomBytes(32))
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}

async function generateUniqueDiscountCode(): Promise<string> {
  const sb = getSupabaseAdmin();
  for (;;) {
    const candidate = generateDiscountCodeCandidate();
    const { data } = await sb
      .from("discount_codes")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();
    if (!data) return candidate;
  }
}

function milestonesEarnedFromTotal(newTotal: number): number {
  if (newTotal < POINTS_FIRST_VOUCHER_THRESHOLD) return 0;
  return 1 + Math.floor((newTotal - POINTS_FIRST_VOUCHER_THRESHOLD) / POINTS_PER_ADDITIONAL_VOUCHER);
}

/**
 * Ensures discount_codes rows exist for each IP milestone (first at 5 IP, then every 10 IP).
 * Idempotent: repeated calls with the same newTotal only mint the delta vs existing milestone rows.
 */
export async function checkAndMintMilestoneVouchers(
  userId: string,
  newTotal: number,
  _membershipLevel: string,
): Promise<{ success: boolean; minted: number; error?: string }> {
  try {
    const milestonesEarned = milestonesEarnedFromTotal(newTotal);
    if (milestonesEarned === 0) {
      return { success: true, minted: 0 };
    }

    const sb = getSupabaseAdmin();
    const { count: existingRaw, error: countError } = await sb
      .from("discount_codes")
      .select("*", { count: "exact", head: true })
      .eq("earned_by_user_id", userId)
      .eq("voucher_type", "milestone");

    if (countError) {
      return {
        success: false,
        minted: 0,
        error: countError.message,
      };
    }

    const existingMilestoneCount = existingRaw ?? 0;
    const vouchersToMint = milestonesEarned - existingMilestoneCount;
    if (vouchersToMint <= 0) {
      return { success: true, minted: 0 };
    }

    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + 90);
    const discountAmountCents = VOUCHER_AMOUNT_SEK * 100;

    for (let i = 0; i < vouchersToMint; i++) {
      const code = await generateUniqueDiscountCode();
      // Voucher applies to full list price — use_discount_code receives
      // p_order_amount_cents based on list price, not member/early-bird price.
      // This is enforced at the call site in checkout/confirm.
      const { error: insertError } = await sb.from("discount_codes").insert({
        code,
        discount_percentage: null,
        discount_amount_cents: discountAmountCents,
        voucher_type: "milestone",
        earned_by_user_id: userId,
        earned_for_invitation_id: null,
        is_active: true,
        usage_limit: 1,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        return {
          success: false,
          minted: 0,
          error: insertError.message,
        };
      }
    }

    return { success: true, minted: vouchersToMint };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown milestone voucher error";
    return { success: false, minted: 0, error: message };
  }
}
