import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  normalizeMembershipLevel,
  type MembershipLevel,
} from "@/lib/membership/points-engine";
import { isMembershipDiscountEligible } from "@/lib/membership/membership-discount-eligible";
import type { PortalSearchParams } from "@/lib/b2b-site";

export type MemberDiscount = {
  percent: number;
  level: MembershipLevel | null;
};

/**
 * Discount % from active membership perks (same parsing as client
 * {@link MembershipProvider} / discount perk_value like "10% off").
 * Returns 0 on dirtywine.se (and localhost with ?b2b=1).
 */
export async function getMemberDiscountForUserId(
  userId: string,
  options?: { host?: string | null; searchParams?: PortalSearchParams | null },
): Promise<MemberDiscount> {
  if (
    options?.host != null &&
    !isMembershipDiscountEligible(options.host, options.searchParams ?? null)
  ) {
    return { percent: 0, level: null };
  }

  const sb = getSupabaseAdmin();
  const { data: membership, error } = await sb
    .from("user_memberships")
    .select("level")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !membership?.level) return { percent: 0, level: null };

  const displayLevel = normalizeMembershipLevel(membership.level);

  const { data: perks, error: perksError } = await sb
    .from("membership_perks")
    .select("perk_type, perk_value")
    .eq("level", displayLevel)
    .eq("is_active", true);

  if (perksError || !perks?.length) {
    return { percent: 0, level: displayLevel };
  }

  const discountPerk = perks.find((p) => p.perk_type === "discount");
  const m = discountPerk?.perk_value?.match(/(\d+)/);
  return {
    percent: m ? Number.parseInt(m[1], 10) : 0,
    level: displayLevel,
  };
}

export async function getMemberDiscountPercentForUserId(
  userId: string,
  options?: { host?: string | null; searchParams?: PortalSearchParams | null },
): Promise<number> {
  const discount = await getMemberDiscountForUserId(userId, options);
  return discount.percent;
}
