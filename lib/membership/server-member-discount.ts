import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeMembershipLevel } from "@/lib/membership/points-engine";

/**
 * Discount % from active membership perks (same parsing as client
 * {@link MembershipProvider} / discount perk_value like "10% off").
 */
export async function getMemberDiscountPercentForUserId(
  userId: string,
): Promise<number> {
  const sb = getSupabaseAdmin();
  const { data: membership, error } = await sb
    .from("user_memberships")
    .select("level")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !membership?.level) return 0;

  const displayLevel = normalizeMembershipLevel(membership.level);

  const { data: perks, error: perksError } = await sb
    .from("membership_perks")
    .select("perk_type, perk_value")
    .eq("level", displayLevel)
    .eq("is_active", true);

  if (perksError || !perks?.length) return 0;

  const discountPerk = perks.find((p) => p.perk_type === "discount");
  const m = discountPerk?.perk_value?.match(/(\d+)/);
  return m ? Number.parseInt(m[1], 10) : 0;
}
