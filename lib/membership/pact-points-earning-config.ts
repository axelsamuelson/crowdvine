/**
 * Runtime switch for PACT Points (and Impact Points) *earning*.
 * Stored in existing `site_content` — no migration.
 *
 * Default when missing: DISABLED (Axel 2026-11-10).
 * Re-enable without deploy: set `pact_points_earning_enabled` = `true`.
 *
 * Does NOT gate redeem / pending_until_payment / referral free-bottle coupon.
 */

import { getSiteContentByKey, updateSiteContent } from "@/lib/actions/content";
import {
  PACT_POINTS_EARNING_ENABLED_KEY,
  parsePactPointsEarningEnabled,
} from "@/lib/membership/pact-points-earning-parse";

export {
  PACT_POINTS_EARNING_ENABLED_KEY,
  parsePactPointsEarningEnabled,
} from "@/lib/membership/pact-points-earning-parse";

export async function isPactPointsEarningEnabled(): Promise<boolean> {
  try {
    const value = await getSiteContentByKey(PACT_POINTS_EARNING_ENABLED_KEY);
    return parsePactPointsEarningEnabled(value);
  } catch (err) {
    console.warn(
      "[pact-points] Failed to read earning switch; treating as disabled:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Admin/ops — do not flip live without Axel. */
export async function setPactPointsEarningEnabled(
  enabled: boolean,
): Promise<void> {
  await updateSiteContent(
    PACT_POINTS_EARNING_ENABLED_KEY,
    enabled ? "true" : "false",
  );
}
