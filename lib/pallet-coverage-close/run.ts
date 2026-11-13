/**
 * Coverage-close cron runner. Default OFF (PALLET_COVERAGE_CLOSE_ENABLED).
 * Does not auto-cancel for coverage shortfalls. Sold-out packing timeouts may
 * cancel an order when removal would break the 6-per-source rule (Axel 01:00).
 * Charges only after lock (existing charge path).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import { getPalletCoverageCloseConfig } from "@/lib/pallet-coverage-close/config";
import {
  evaluateLockDecision,
  recheckAtLockTime,
} from "@/lib/pallet-coverage-close/schedule";
import type { CoverageOrderInput } from "@/lib/pallet-coverage-close/coverage";
import { buildPalletLockHeadsUpEmail } from "@/lib/pallet-coverage-close/emails";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import { sendEmail } from "@/lib/email";
import { createPalletCloseActionToken } from "@/lib/checkout/pallet-close/tokens";
import { cancelReservationAndDetachPaymentMethod } from "@/lib/checkout/pallet-close/cancel";
import {
  applySoldOutChoiceTimeout,
  packingSourceIdForWine,
  type SoldOutLineSnapshot,
} from "@/lib/pallet-coverage-close/sold-out-choice";
import { resolveAmountOre } from "@/lib/checkout/pallet-close/resolve-amount-ore";

export type CoverageCloseRunSummary = {
  enabled: boolean;
  sendEmail: boolean;
  scanned: number;
  scheduled: number;
  locked: number;
  scheduleCleared: number;
  headsUpSent: number;
  soldOutTimedOut: number;
  soldOutOrderCancelled: number;
  skipped: number;
  errors: number;
  actions: Array<Record<string, unknown>>;
};

async function loadActiveOrdersForPallet(
  palletId: string,
): Promise<{ orders: CoverageOrderInput[]; firstOrderAt: string | null }> {
  const sb = getSupabaseAdmin();
  const { data: reservations } = await sb
    .from("order_reservations")
    .select("id, created_at")
    .eq("pallet_id", palletId)
    .in("status", [...PALLET_FILL_STATUSES])
    .is("archived_at", null)
    .order("created_at", { ascending: true });

  if (!reservations?.length) {
    return { orders: [], firstOrderAt: null };
  }

  const firstOrderAt = String(reservations[0]!.created_at);
  const orders: CoverageOrderInput[] = [];

  for (const res of reservations) {
    const { data: items } = await sb
      .from("order_reservation_items")
      .select("quantity, sold_out_choice_state, pre_pallet_contribution_cents")
      .eq("reservation_id", res.id);

    let bottles = 0;
    let wineMarginOre: number | null = null;
    for (const item of items ?? []) {
      if (item.sold_out_choice_state === "removed") continue;
      const qty = Math.max(0, Math.floor(Number(item.quantity) || 0));
      bottles += qty;
      // Prefer live pre_pallet contribution as wine-margin proxy when present
      // (includes more terms); coverage module still applies config EPR/ship/stripe
      // when wineMarginOre is omitted. Here we only pass bottle counts and let
      // config defaults estimate unless we have explicit margin later.
    }
    if (bottles > 0) {
      orders.push({ bottleCount: bottles, wineMarginOre });
    }
  }

  return { orders, firstOrderAt };
}

async function sendHeadsUpForPallet(opts: {
  palletId: string;
  scheduledLockAt: Date;
  summary: CoverageCloseRunSummary;
}): Promise<void> {
  const cfg = getPalletCoverageCloseConfig();
  if (!cfg.sendEmail) return;

  const sb = getSupabaseAdmin();
  const { data: reservations } = await sb
    .from("order_reservations")
    .select("id, user_id")
    .eq("pallet_id", opts.palletId)
    .in("status", [...PALLET_FILL_STATUSES])
    .is("archived_at", null);

  for (const res of reservations ?? []) {
    if (!res.user_id) continue;
    const { data: profile } = await sb
      .from("profiles")
      .select("email, full_name, preferred_locale")
      .eq("id", res.user_id)
      .maybeSingle();
    const email = String(profile?.email ?? "").trim();
    if (!email) continue;

    const locale =
      String(profile?.preferred_locale ?? "sv").toLowerCase() === "en"
        ? "en"
        : "sv";
    const amountOre = await resolveAmountOre(res.id as string);
    const amountLabel =
      amountOre != null
        ? `${Math.round(amountOre / 100)} kr`
        : locale === "sv"
          ? "se orderbekräftelsen"
          : "see your confirmation";

    const cancelTok = await createPalletCloseActionToken({
      reservationId: res.id as string,
      action: "cancel",
      expiresAt: opts.scheduledLockAt,
    });

    const built = buildPalletLockHeadsUpEmail({
      locale,
      customerName: String(profile?.full_name ?? ""),
      amountLabel,
      lockDateLabel: opts.scheduledLockAt.toISOString().slice(0, 10),
      cancelUrl: cancelTok.url,
      reservationId: res.id as string,
    });

    const result = await sendTransactionalEmailOnce({
      emailType: `pallet_coverage_lock_heads_up:${opts.scheduledLockAt.toISOString().slice(0, 10)}`,
      recipient: email,
      reservationId: res.id as string,
      send: async () => {
        await sendEmail({
          to: email,
          subject: built.subject,
          html: built.html,
          text: built.text,
        });
        return true;
      },
    });
    if (result === "sent") opts.summary.headsUpSent += 1;
  }
}

export async function runPalletCoverageClose(opts?: {
  now?: Date;
}): Promise<CoverageCloseRunSummary> {
  const cfg = getPalletCoverageCloseConfig();
  const now = opts?.now ?? new Date();
  const summary: CoverageCloseRunSummary = {
    enabled: cfg.enabled,
    sendEmail: cfg.sendEmail,
    scanned: 0,
    scheduled: 0,
    locked: 0,
    scheduleCleared: 0,
    headsUpSent: 0,
    soldOutTimedOut: 0,
    soldOutOrderCancelled: 0,
    skipped: 0,
    errors: 0,
    actions: [],
  };

  if (!cfg.enabled) {
    return summary;
  }

  const sb = getSupabaseAdmin();

  // Sold-out timeouts: remove when packing stays valid; else cancel order.
  // Coverage is recomputed below from active (non-cancelled) reservations.
  const { data: pendingLines } = await sb
    .from("order_reservation_items")
    .select("id, reservation_id, sold_out_choice_reply_by, quantity, item_id")
    .eq("sold_out_choice_state", "pending_choice")
    .lt("sold_out_choice_reply_by", now.toISOString())
    .limit(200);

  const pendingByReservation = new Map<string, string[]>();
  for (const line of pendingLines ?? []) {
    const rid = String(line.reservation_id);
    const list = pendingByReservation.get(rid) ?? [];
    list.push(String(line.id));
    pendingByReservation.set(rid, list);
  }

  for (const [reservationId, pendingIds] of pendingByReservation) {
    const { data: orderLines, error: linesErr } = await sb
      .from("order_reservation_items")
      .select(
        "id, item_id, quantity, sold_out_choice_state, wines(source_type, source_name, producer_id, base_price_cents)",
      )
      .eq("reservation_id", reservationId);

    if (linesErr || !orderLines?.length) {
      summary.errors += 1;
      summary.actions.push({
        event: "sold_out_timeout_load_error",
        reservation_id: reservationId,
        message: linesErr?.message,
      });
      continue;
    }

    const snapshots: SoldOutLineSnapshot[] = orderLines.map((row) => {
      const wineRaw = (
        row as {
          wines?:
            | {
                source_type?: string | null;
                source_name?: string | null;
                producer_id?: string | null;
                base_price_cents?: number | null;
              }
            | {
                source_type?: string | null;
                source_name?: string | null;
                producer_id?: string | null;
                base_price_cents?: number | null;
              }[]
            | null;
        }
      ).wines;
      const wine = Array.isArray(wineRaw) ? wineRaw[0] : wineRaw;
      const qty = Math.max(0, Math.floor(Number(row.quantity) || 0));
      const unit = Number(wine?.base_price_cents) || 0;
      const sourceType = wine?.source_type ?? "producer";
      const sourceName = wine?.source_name ?? null;
      const producerId = wine?.producer_id ?? null;
      return {
        lineId: String(row.id),
        wineId: String(row.item_id),
        quantity: qty,
        originalAmountOre: Math.round(unit * qty),
        state:
          (row.sold_out_choice_state as SoldOutLineSnapshot["state"]) || "ok",
        packingSourceId: packingSourceIdForWine({
          sourceType,
          sourceName,
          producerId,
        }),
        sourceType,
        sourceName,
        producerId,
      };
    });

    const timed = applySoldOutChoiceTimeout(snapshots, pendingIds);

    if (timed.outcome === "cancel_order") {
      const cancel = await cancelReservationAndDetachPaymentMethod({
        reservationId,
        reason: "sold_out_pack_timeout",
        now,
      });
      if (cancel.ok) {
        await sb
          .from("order_reservation_items")
          .update({
            sold_out_choice_state: "removed",
            sold_out_choice_at: now.toISOString(),
            sold_out_replacement_wine_id: null,
            sold_out_replacement_amount_ore: null,
          })
          .eq("reservation_id", reservationId);
        summary.soldOutOrderCancelled += 1;
        summary.soldOutTimedOut += pendingIds.length;
        summary.actions.push({
          event: "sold_out_timeout_cancel_order",
          reservation_id: reservationId,
          line_ids: pendingIds,
        });
      } else {
        summary.errors += 1;
        summary.actions.push({
          event: "sold_out_timeout_cancel_failed",
          reservation_id: reservationId,
          message: cancel.message,
        });
      }
      continue;
    }

    for (const lineId of pendingIds) {
      const { error } = await sb
        .from("order_reservation_items")
        .update({
          sold_out_choice_state: "removed",
          sold_out_choice_at: now.toISOString(),
          sold_out_replacement_wine_id: null,
          sold_out_replacement_amount_ore: null,
        })
        .eq("id", lineId)
        .eq("sold_out_choice_state", "pending_choice");
      if (!error) {
        summary.soldOutTimedOut += 1;
        summary.actions.push({
          event: "sold_out_timeout_removed",
          line_id: lineId,
          reservation_id: reservationId,
        });
      }
    }
  }

  const { data: pallets, error: listErr } = await sb
    .from("pallets")
    .select(
      "id, status, first_order_at, coverage_lock_scheduled_at, coverage_locked_at, coverage_close_enabled, coverage_lock_heads_up_sent_at",
    )
    .eq("coverage_close_enabled", true)
    .is("coverage_locked_at", null)
    .in("status", ["open", "consolidating", "complete"])
    .limit(50);

  if (listErr) {
    summary.errors += 1;
    summary.actions.push({ event: "list_error", message: listErr.message });
    return summary;
  }

  for (const pallet of pallets ?? []) {
    summary.scanned += 1;
    try {
      const { orders, firstOrderAt: derivedFirst } =
        await loadActiveOrdersForPallet(pallet.id as string);
      const firstOrderAt =
        pallet.first_order_at ?? derivedFirst;
      if (!firstOrderAt || orders.length === 0) {
        summary.skipped += 1;
        continue;
      }

      if (!pallet.first_order_at && derivedFirst) {
        await sb
          .from("pallets")
          .update({ first_order_at: derivedFirst })
          .eq("id", pallet.id);
      }

      const scheduled = pallet.coverage_lock_scheduled_at
        ? new Date(pallet.coverage_lock_scheduled_at)
        : null;
      const atScheduled =
        scheduled != null && scheduled.getTime() <= now.getTime();

      if (atScheduled) {
        const decision = recheckAtLockTime({
          orders,
          firstOrderAt,
          now,
          cfg,
        });
        if (decision.action === "lock_immediately") {
          await sb
            .from("pallets")
            .update({
              coverage_locked_at: now.toISOString(),
              status: "complete",
            })
            .eq("id", pallet.id);
          summary.locked += 1;
          summary.actions.push({
            event: "locked",
            pallet_id: pallet.id,
            reason: decision.reason,
          });
          await sb.from("pallet_coverage_close_events").insert({
            pallet_id: pallet.id,
            event: "locked",
            meta: { reason: decision.reason },
          });
        } else {
          await sb
            .from("pallets")
            .update({
              coverage_lock_scheduled_at: null,
              coverage_lock_heads_up_sent_at: null,
            })
            .eq("id", pallet.id);
          summary.scheduleCleared += 1;
          summary.actions.push({
            event: "schedule_cleared",
            pallet_id: pallet.id,
          });
        }
        continue;
      }

      const decision = evaluateLockDecision({
        orders,
        firstOrderAt,
        now,
        scheduledLockAt: scheduled,
        cfg,
      });

      if (decision.action === "lock_immediately") {
        await sb
          .from("pallets")
          .update({
            coverage_locked_at: now.toISOString(),
            coverage_lock_scheduled_at: null,
            status: "complete",
          })
          .eq("id", pallet.id);
        summary.locked += 1;
        summary.actions.push({
          event: "locked",
          pallet_id: pallet.id,
          reason: decision.reason,
        });
        continue;
      }

      if (decision.action === "clear_schedule") {
        await sb
          .from("pallets")
          .update({
            coverage_lock_scheduled_at: null,
            coverage_lock_heads_up_sent_at: null,
          })
          .eq("id", pallet.id);
        summary.scheduleCleared += 1;
        continue;
      }

      if (decision.action === "schedule_lock") {
        await sb
          .from("pallets")
          .update({
            coverage_lock_scheduled_at: decision.scheduledLockAt.toISOString(),
          })
          .eq("id", pallet.id);
        summary.scheduled += 1;
        summary.actions.push({
          event: "scheduled",
          pallet_id: pallet.id,
          at: decision.scheduledLockAt.toISOString(),
        });
        await sendHeadsUpForPallet({
          palletId: pallet.id as string,
          scheduledLockAt: decision.scheduledLockAt,
          summary,
        });
        await sb
          .from("pallets")
          .update({ coverage_lock_heads_up_sent_at: now.toISOString() })
          .eq("id", pallet.id);
      }
    } catch (e) {
      summary.errors += 1;
      summary.actions.push({
        event: "error",
        pallet_id: pallet.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return summary;
}
