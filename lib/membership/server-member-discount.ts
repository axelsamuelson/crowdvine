import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeMembershipLevel } from "@/lib/membership/points-engine";
import { isMembershipDiscountEligible } from "@/lib/membership/membership-discount-eligible";
import type { PortalSearchParams } from "@/lib/b2b-site";

/**
 * Discount % from active membership perks (same parsing as client
 * {@link MembershipProvider} / discount perk_value like "10% off").
 * Returns 0 on dirtywine.se (and localhost with ?b2b=1).
 */
export async function getMemberDiscountPercentForUserId(
  userId: string,
  options?: { host?: string | null; searchParams?: PortalSearchParams | null },
): Promise<number> {
  if (
    options?.host != null &&
    !isMembershipDiscountEligible(options.host, options.searchParams ?? null)
  ) {
    return 0;
  }

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
