/**
 * Runtime switch for the early-bird pallet discount schedule
 * (20% / 10% / 0% by fill), stored in existing `site_content`.
 *
 * Default when the key is missing: DISABLED (0% — CFO 2026-11-10).
 * Re-enable without deploy: set `early_bird_pallet_discount_enabled` = `true`.
 * Agents must not flip the live value — Axel decides.
 */

import { getSiteContentByKey, updateSiteContent } from "@/lib/actions/content";
import {
  getPalletDiscountTier,
  type DiscountTier,
} from "@/lib/pallet-discount";

export const EARLY_BIRD_PALLET_DISCOUNT_ENABLED_KEY =
  "early_bird_pallet_discount_enabled";

/** Parse site_content value; missing/empty/unknown → disabled (0%). */
export function parseEarlyBirdPalletDiscountEnabled(
  raw: string | null | undefined,
): boolean {
  if (raw == null || String(raw).trim() === "") return false;
  const v = String(raw).trim().toLowerCase();
  if (v === "true" || v === "1" || v === "on" || v === "enabled" || v === "yes") {
    return true;
  }
  if (v === "false" || v === "0" || v === "off" || v === "disabled" || v === "no") {
    return false;
  }
  return false;
}

export async function isEarlyBirdPalletDiscountEnabled(): Promise<boolean> {
  try {
    const value = await getSiteContentByKey(
      EARLY_BIRD_PALLET_DISCOUNT_ENABLED_KEY,
    );
    return parseEarlyBirdPalletDiscountEnabled(value);
  } catch (err) {
    console.warn(
      "[early-bird] Failed to read site_content switch; treating as disabled:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/**
 * Single async entry for cart / zone-status / charge: fill-based tier, or 0 when off.
 */
export async function resolvePalletDiscountTier(
  bottlesFilled: number,
): Promise<DiscountTier> {
  const enabled = await isEarlyBirdPalletDiscountEnabled();
  return getPalletDiscountTier(bottlesFilled, { enabled });
}

/** Admin/ops helper — agents must not call this against prod without Axel. */
export async function setEarlyBirdPalletDiscountEnabled(
  enabled: boolean,
): Promise<void> {
  await updateSiteContent(
    EARLY_BIRD_PALLET_DISCOUNT_ENABLED_KEY,
    enabled ? "true" : "false",
  );
}
