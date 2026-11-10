/**
 * Runtime switch for automatic membership-tier price discounts
 * (Silver 5% / Guld 10% / Privilege|Founding 15%), via existing `site_content`.
 *
 * Default when missing: DISABLED (CFO 2026-11-10 — all discounts off for now).
 * Re-enable without deploy: set `member_tier_discount_enabled` = `true`.
 */

import { getSiteContentByKey, updateSiteContent } from "@/lib/actions/content";

export const MEMBER_TIER_DISCOUNT_ENABLED_KEY = "member_tier_discount_enabled";

export function parseMemberTierDiscountEnabled(
  raw: string | null | undefined,
): boolean {
  if (raw == null || String(raw).trim() === "") return false;
  const v = String(raw).trim().toLowerCase();
  if (v === "true" || v === "1" || v === "on" || v === "enabled" || v === "yes") {
    return true;
  }
  return false;
}

export async function isMemberTierDiscountEnabled(): Promise<boolean> {
  try {
    const value = await getSiteContentByKey(MEMBER_TIER_DISCOUNT_ENABLED_KEY);
    return parseMemberTierDiscountEnabled(value);
  } catch (err) {
    console.warn(
      "[member-discount] Failed to read site_content switch; treating as disabled:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Admin/ops helper — do not flip live without Axel. */
export async function setMemberTierDiscountEnabled(
  enabled: boolean,
): Promise<void> {
  await updateSiteContent(
    MEMBER_TIER_DISCOUNT_ENABLED_KEY,
    enabled ? "true" : "false",
  );
}
