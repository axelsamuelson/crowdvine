/**
 * Configurable "becomes physical" parameters for PACT pallets.
 * Defaults match product rules; values can be overridden via site_content.
 *
 * Pallet minimum remains DEFAULT_MIN_BOTTLES_TO_COMPLETE / pallets.min_bottles_to_complete (270).
 */

import { getSiteContentByKey, updateSiteContent } from "@/lib/actions/content";
import { DEFAULT_MIN_BOTTLES_TO_COMPLETE } from "@/lib/pallet-ship-progress";

export const PALLET_PICKUP_SELECTION_TRIGGER_SHARE_KEY =
  "pallet_pickup_selection_trigger_share";
export const PALLET_WEIGHT_LIMIT_KG_KEY = "pallet_weight_limit_kg";
export const PALLET_KG_PER_BOTTLE_KEY = "pallet_kg_per_bottle";

/** Default share of min bottles at which admin should choose pickup (0.8 = 80%). */
export const DEFAULT_PICKUP_SELECTION_TRIGGER_SHARE = 0.8;

/** Default estimated weight per bottle (kg). */
export const DEFAULT_KG_PER_BOTTLE = 1.4;

/** null = no weight check. */
export const DEFAULT_WEIGHT_LIMIT_KG: number | null = null;

export type PalletPhysicalSettings = {
  /** Canonical pallet minimum (default 270). */
  minBottlesToComplete: number;
  /** Share of min bottles that triggers pickup selection (default 0.8). */
  pickupSelectionTriggerShare: number;
  /** Weight limit in kg; null = no check. */
  weightLimitKg: number | null;
  /** Estimated kg per bottle (default 1.4). */
  kgPerBottle: number;
};

function parsePositiveNumber(
  raw: string | null | undefined,
  fallback: number,
): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function parseOptionalNonNegNumber(
  raw: string | null | undefined,
): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function resolvePalletPhysicalSettings(input?: {
  pickupSelectionTriggerShare?: string | null;
  weightLimitKg?: string | null;
  kgPerBottle?: string | null;
}): PalletPhysicalSettings {
  return {
    minBottlesToComplete: DEFAULT_MIN_BOTTLES_TO_COMPLETE,
    pickupSelectionTriggerShare: parsePositiveNumber(
      input?.pickupSelectionTriggerShare,
      DEFAULT_PICKUP_SELECTION_TRIGGER_SHARE,
    ),
    weightLimitKg: parseOptionalNonNegNumber(input?.weightLimitKg),
    kgPerBottle: parsePositiveNumber(
      input?.kgPerBottle,
      DEFAULT_KG_PER_BOTTLE,
    ),
  };
}

/** Load settings from site_content with documented defaults. */
export async function getPalletPhysicalSettings(): Promise<PalletPhysicalSettings> {
  const [triggerShare, weightLimit, kgPerBottle] = await Promise.all([
    getSiteContentByKey(PALLET_PICKUP_SELECTION_TRIGGER_SHARE_KEY),
    getSiteContentByKey(PALLET_WEIGHT_LIMIT_KG_KEY),
    getSiteContentByKey(PALLET_KG_PER_BOTTLE_KEY),
  ]);
  return resolvePalletPhysicalSettings({
    pickupSelectionTriggerShare: triggerShare,
    weightLimitKg: weightLimit,
    kgPerBottle,
  });
}

export async function updatePalletPhysicalSettings(input: {
  pickupSelectionTriggerShare?: number;
  weightLimitKg?: number | null;
  kgPerBottle?: number;
}): Promise<void> {
  if (input.pickupSelectionTriggerShare !== undefined) {
    const share = Math.min(
      1,
      Math.max(0.01, Number(input.pickupSelectionTriggerShare) || 0.8),
    );
    await updateSiteContent(
      PALLET_PICKUP_SELECTION_TRIGGER_SHARE_KEY,
      String(share),
    );
  }
  if (input.weightLimitKg !== undefined) {
    await updateSiteContent(
      PALLET_WEIGHT_LIMIT_KG_KEY,
      input.weightLimitKg == null || !Number.isFinite(input.weightLimitKg)
        ? ""
        : String(Math.max(0, input.weightLimitKg)),
    );
  }
  if (input.kgPerBottle !== undefined) {
    const kg = Math.max(0.01, Number(input.kgPerBottle) || DEFAULT_KG_PER_BOTTLE);
    await updateSiteContent(PALLET_KG_PER_BOTTLE_KEY, String(kg));
  }
}
