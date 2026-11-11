/**
 * Persist a customer's sold-out replace / remove / cancel_order choice.
 * Enforces the 6-per-source packing rule (Axel 01:00).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cancelReservationAndDetachPaymentMethod } from "@/lib/checkout/pallet-close/cancel";
import {
  applySoldOutCustomerDecision,
  packingSourceIdForWine,
  type SoldOutChoice,
  type SoldOutLineSnapshot,
} from "@/lib/pallet-coverage-close/sold-out-choice";

type WinePackingRow = {
  base_price_cents?: number | null;
  source_type?: string | null;
  source_name?: string | null;
  producer_id?: string | null;
  producers?:
    | { name?: string | null; display_name?: string | null }
    | { name?: string | null; display_name?: string | null }[]
    | null;
};

function unwrapWine(raw: unknown): WinePackingRow | null {
  if (!raw) return null;
  if (Array.isArray(raw)) return (raw[0] as WinePackingRow) ?? null;
  return raw as WinePackingRow;
}

function lineFromRow(row: {
  id: string;
  item_id: string | number;
  quantity: number | null;
  sold_out_choice_state: string | null;
  wines?: unknown;
}): SoldOutLineSnapshot {
  const wine = unwrapWine(row.wines);
  const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
  const unit = Number(wine?.base_price_cents) || 0;
  const sourceType = wine?.source_type ?? "producer";
  const sourceName = wine?.source_name ?? null;
  const producerId = wine?.producer_id ?? null;
  return {
    lineId: row.id,
    wineId: String(row.item_id),
    quantity: qty,
    originalAmountOre: Math.round(unit * qty),
    state: (row.sold_out_choice_state as SoldOutLineSnapshot["state"]) || "ok",
    packingSourceId: packingSourceIdForWine({
      sourceType,
      sourceName,
      producerId,
    }),
    sourceType,
    sourceName,
    producerId,
  };
}

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

  const { data: rows, error } = await sb
    .from("order_reservation_items")
    .select(
      "id, reservation_id, item_id, quantity, sold_out_choice_state, wines(base_price_cents, source_type, source_name, producer_id)",
    )
    .eq("reservation_id", opts.reservationId);

  if (error || !rows?.length) {
    return { ok: false, message: error?.message ?? "Order lines not found" };
  }

  const lines = rows.map(lineFromRow);
  const target = lines.find((l) => l.lineId === opts.reservationItemId);
  if (!target) {
    return { ok: false, message: "Line not found" };
  }
  if (target.state !== "pending_choice") {
    return { ok: false, message: "Line is not awaiting a choice" };
  }

  let replacementPacking: {
    sourceType?: string | null;
    sourceName?: string | null;
    producerId?: string | null;
  } | null = null;
  let replacementAmountOre = opts.replacementAmountOre ?? null;

  if (opts.choice === "replace") {
    const replacementWineId = String(opts.replacementWineId ?? "").trim();
    if (!replacementWineId) {
      return { ok: false, message: "replacementWineId required for replace" };
    }
    const { data: wine, error: wineErr } = await sb
      .from("wines")
      .select("base_price_cents, source_type, source_name, producer_id")
      .eq("id", replacementWineId)
      .maybeSingle();
    if (wineErr || !wine) {
      return { ok: false, message: wineErr?.message ?? "Replacement wine not found" };
    }
    replacementPacking = {
      sourceType: wine.source_type,
      sourceName: wine.source_name,
      producerId: wine.producer_id,
    };
    if (replacementAmountOre == null) {
      replacementAmountOre = Math.round(
        (Number(wine.base_price_cents) || 0) * target.quantity,
      );
    }
  }

  const decision = applySoldOutCustomerDecision({
    lines,
    lineId: opts.reservationItemId,
    choice: opts.choice,
    replacementWineId: opts.replacementWineId,
    replacementAmountOre,
    replacementPacking,
  });

  if (!decision.ok) {
    return decision;
  }

  if (decision.orderCancelled) {
    const cancel = await cancelReservationAndDetachPaymentMethod({
      reservationId: opts.reservationId,
      reason: "sold_out_pack_timeout",
      now,
    });
    if (!cancel.ok) {
      return {
        ok: false,
        message: cancel.message ?? "Could not cancel order",
      };
    }
    // Mark all lines removed so coverage skips bottles.
    await sb
      .from("order_reservation_items")
      .update({
        sold_out_choice_state: "removed",
        sold_out_choice_at: now.toISOString(),
        sold_out_replacement_wine_id: null,
        sold_out_replacement_amount_ore: null,
      })
      .eq("reservation_id", opts.reservationId);

    await sb.from("pallet_coverage_close_events").insert({
      reservation_id: opts.reservationId,
      event: "sold_out_choice_cancel_order",
      meta: { line_id: opts.reservationItemId, reason: "packing_rule" },
    });

    return { ok: true };
  }

  const next = decision.lines.find((l) => l.lineId === opts.reservationItemId)!;
  const { error: updErr } = await sb
    .from("order_reservation_items")
    .update({
      sold_out_choice_state: next.state,
      sold_out_replacement_wine_id: next.replacementWineId ?? null,
      sold_out_replacement_amount_ore: next.replacementAmountOre ?? null,
      sold_out_choice_at: now.toISOString(),
    })
    .eq("id", opts.reservationItemId);

  if (updErr) {
    return { ok: false, message: updErr.message };
  }

  await sb.from("pallet_coverage_close_events").insert({
    reservation_id: opts.reservationId,
    event: `sold_out_choice_${opts.choice}`,
    meta: {
      line_id: opts.reservationItemId,
      replacement_wine_id: next.replacementWineId ?? null,
    },
  });

  return { ok: true };
}
