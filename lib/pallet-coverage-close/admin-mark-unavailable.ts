/**
 * Admin marks a wine unavailable on a locked or scheduled-to-lock pallet.
 * Affected active order lines → pending_choice; optional email behind send flag.
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import { getPalletCoverageCloseConfig } from "@/lib/pallet-coverage-close/config";
import { soldOutChoiceDeadlineAt } from "@/lib/pallet-coverage-close/sold-out-choice";
import { createSoldOutChoiceToken } from "@/lib/pallet-coverage-close/sold-out-tokens";
import { buildSoldOutChoiceEmail } from "@/lib/pallet-coverage-close/emails";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import { sendEmail } from "@/lib/email";

export type MarkWineUnavailableResult =
  | {
      ok: true;
      affectedLineIds: string[];
      emailsQueued: number;
    }
  | { ok: false; code: string; message: string };

export async function markWineUnavailableOnPallet(opts: {
  palletId: string;
  wineId: string;
  wineTitle?: string;
  now?: Date;
}): Promise<MarkWineUnavailableResult> {
  const cfg = getPalletCoverageCloseConfig();
  const now = opts.now ?? new Date();
  const sb = getSupabaseAdmin();

  const { data: pallet, error: palletErr } = await sb
    .from("pallets")
    .select(
      "id, coverage_locked_at, coverage_lock_scheduled_at, coverage_close_enabled",
    )
    .eq("id", opts.palletId)
    .maybeSingle();

  if (palletErr || !pallet) {
    return {
      ok: false,
      code: "pallet_not_found",
      message: palletErr?.message ?? "Pallet not found",
    };
  }

  const lockedOrScheduled =
    Boolean(pallet.coverage_locked_at) ||
    Boolean(pallet.coverage_lock_scheduled_at);
  if (!lockedOrScheduled) {
    return {
      ok: false,
      code: "pallet_not_locked_or_scheduled",
      message:
        "Wine can only be marked unavailable on a locked or scheduled pallet.",
    };
  }

  const { data: reservations, error: resErr } = await sb
    .from("order_reservations")
    .select("id, user_id")
    .eq("pallet_id", opts.palletId)
    .in("status", [...PALLET_FILL_STATUSES])
    .is("archived_at", null);

  if (resErr) {
    return { ok: false, code: "db_error", message: resErr.message };
  }
  if (!reservations?.length) {
    return { ok: true, affectedLineIds: [], emailsQueued: 0 };
  }

  const reservationIds = reservations.map((r) => r.id as string);
  const { data: items, error: itemsErr } = await sb
    .from("order_reservation_items")
    .select("id, reservation_id, item_id, quantity, sold_out_choice_state")
    .in("reservation_id", reservationIds)
    .eq("item_id", opts.wineId);

  if (itemsErr) {
    return { ok: false, code: "db_error", message: itemsErr.message };
  }

  const toUpdate = (items ?? []).filter(
    (row) =>
      row.sold_out_choice_state == null ||
      row.sold_out_choice_state === "ok",
  );

  if (toUpdate.length === 0) {
    return { ok: true, affectedLineIds: [], emailsQueued: 0 };
  }

  const replyBy = soldOutChoiceDeadlineAt(now, cfg).toISOString();
  const affectedLineIds: string[] = [];
  let emailsQueued = 0;

  for (const row of toUpdate) {
    const { error: updErr } = await sb
      .from("order_reservation_items")
      .update({
        sold_out_choice_state: "pending_choice",
        sold_out_choice_reply_by: replyBy,
        sold_out_choice_at: null,
        sold_out_replacement_wine_id: null,
        sold_out_replacement_amount_ore: null,
      })
      .eq("id", row.id);

    if (updErr) {
      return { ok: false, code: "db_error", message: updErr.message };
    }
    affectedLineIds.push(row.id as string);

    await sb.from("pallet_coverage_close_events").insert({
      pallet_id: opts.palletId,
      reservation_id: row.reservation_id,
      event: "wine_marked_unavailable",
      meta: {
        wine_id: opts.wineId,
        line_id: row.id,
        reply_by: replyBy,
      },
    });

    if (!cfg.sendEmail) continue;

    const reservation = reservations.find((r) => r.id === row.reservation_id);
    if (!reservation?.user_id) continue;

    const { data: profile } = await sb
      .from("profiles")
      .select("email, full_name, preferred_locale")
      .eq("id", reservation.user_id)
      .maybeSingle();

    const email = String(profile?.email ?? "").trim();
    if (!email) continue;

    try {
      const tok = await createSoldOutChoiceToken({
        reservationId: row.reservation_id as string,
        reservationItemId: row.id as string,
        expiresAt: new Date(replyBy),
      });
      const locale =
        String(profile?.preferred_locale ?? "sv").toLowerCase() === "en"
          ? "en"
          : "sv";
      const built = buildSoldOutChoiceEmail({
        locale,
        customerName: String(profile?.full_name ?? ""),
        wineTitle: opts.wineTitle ?? opts.wineId,
        choiceUrl: tok.url,
        replyByLabel: replyBy.slice(0, 10),
        reservationId: row.reservation_id as string,
      });

      const result = await sendTransactionalEmailOnce({
        emailType: `pallet_sold_out_choice:${row.id}`,
        recipient: email,
        reservationId: row.reservation_id as string,
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
      if (result === "sent") emailsQueued += 1;
    } catch (e) {
      console.error("[markWineUnavailableOnPallet] email failed", e);
    }
  }

  return { ok: true, affectedLineIds, emailsQueued };
}
