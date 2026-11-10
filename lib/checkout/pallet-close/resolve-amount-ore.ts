/**
 * Shared customer-facing charge amount for pallet-close (öre).
 *
 * Prefer SetupIntent metadata.expected_amount_ore (what checkout bound).
 * Else use order_reservations.total_sek * 100 (customer total incl. VAT /
 * shipping after discounts). Never guess from catalog wine prices — those
 * exclude shipping/discounts and are not whole-kronor rounded.
 * Returns null when neither source is available (caller must refuse).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

export async function resolveAmountOre(
  reservationId: string,
): Promise<number | null> {
  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("order_reservations")
    .select("setup_intent_id, total_sek")
    .eq("id", reservationId)
    .maybeSingle();
  if (row?.setup_intent_id && stripe) {
    try {
      const si = await stripe.setupIntents.retrieve(String(row.setup_intent_id));
      const ore = Number(
        (si.metadata as { expected_amount_ore?: string } | null)
          ?.expected_amount_ore,
      );
      if (Number.isFinite(ore) && ore > 0) return Math.round(ore);
    } catch {
      /* fall through to total_sek */
    }
  }
  const totalSek = Number((row as { total_sek?: unknown } | null)?.total_sek);
  if (Number.isFinite(totalSek) && totalSek > 0) {
    return Math.round(totalSek * 100);
  }
  return null;
}
