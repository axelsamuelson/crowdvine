/**
 * Whether a shared pallet is "full" for close/charge purposes.
 * Uses ship-ready threshold (min bottles to complete), not physical overflow.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getPalletFillData } from "@/lib/pallet-fill-count";
import { isPalletShippingLocked } from "@/lib/pallet-ship-progress";

export async function isSharedPalletFullForClose(
  palletId: string,
): Promise<{ full: boolean; bottlesFilled: number; minToShip: number }> {
  const sb = getSupabaseAdmin();
  const { data: pallet, error } = await sb
    .from("pallets")
    .select(
      "id, status, bottle_capacity, min_bottles_to_complete, created_at",
    )
    .eq("id", palletId)
    .maybeSingle();

  if (error || !pallet) {
    return { full: false, bottlesFilled: 0, minToShip: 0 };
  }

  if (isPalletShippingLocked(pallet.status)) {
    return { full: true, bottlesFilled: 0, minToShip: 0 };
  }

  const fill = await getPalletFillData(
    palletId,
    Number(pallet.bottle_capacity) || 0,
    pallet.min_bottles_to_complete != null
      ? Number(pallet.min_bottles_to_complete)
      : undefined,
  );

  return {
    full: fill.shipProgress.isReadyToShip,
    bottlesFilled: fill.bottlesFilled,
    minToShip: fill.minBottlesToShip,
  };
}
