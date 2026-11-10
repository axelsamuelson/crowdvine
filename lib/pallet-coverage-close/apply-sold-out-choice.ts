/**
 * Persist a customer's sold-out replace/remove choice for one line.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  applySoldOutChoice,
  type SoldOutChoice,
} from "@/lib/pallet-coverage-close/sold-out-choice";

export async function persistSoldOutCustomerChoice(opts: {
  reservationId: string;
  reservationItemId: string;
  choice: SoldOutChoice;
  replacementWineId?: string | null;
  replacementAmountOre?: number | null;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const sb = getSupabaseAdmin();
  const now = opts.now ?? new Date();

  const { data: row, error } = await sb
    .from("order_reservation_items")
    .select(
      "id, reservation_id, item_id, quantity, sold_out_choice_state, wines(base_price_cents)",
    )
    .eq("id", opts.reservationItemId)
    .eq("reservation_id", opts.reservationId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, message: error?.message ?? "Line not found" };
  }
  if (row.sold_out_choice_state !== "pending_choice") {
    return { ok: false, message: "Line is not awaiting a choice" };
  }

  const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
  const wineRaw = (row as { wines?: { base_price_cents?: number } | { base_price_cents?: number }[] | null }).wines;
  const wine = Array.isArray(wineRaw) ? wineRaw[0] : wineRaw;
  const unit = Number(wine?.base_price_cents) || 0;
  const originalAmountOre = Math.round(unit * qty);

  const next = applySoldOutChoice({
    line: {
      lineId: row.id as string,
      wineId: String(row.item_id),
      quantity: qty,
      originalAmountOre,
      state: "pending_choice",
    },
    choice: opts.choice,
    replacementWineId: opts.replacementWineId,
    replacementAmountOre: opts.replacementAmountOre,
  });

  const { error: updErr } = await sb
    .from("order_reservation_items")
    .update({
      sold_out_choice_state: next.state,
      sold_out_replacement_wine_id: next.replacementWineId ?? null,
      sold_out_replacement_amount_ore: next.replacementAmountOre ?? null,
      sold_out_choice_at: now.toISOString(),
    })
    .eq("id", row.id);

  if (updErr) {
    return { ok: false, message: updErr.message };
  }

  await sb.from("pallet_coverage_close_events").insert({
    reservation_id: opts.reservationId,
    event: `sold_out_choice_${opts.choice}`,
    meta: {
      line_id: row.id,
      replacement_wine_id: next.replacementWineId ?? null,
    },
  });

  return { ok: true };
}
