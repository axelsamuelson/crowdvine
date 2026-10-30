import { sendEmail } from "@/lib/email";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import type { AppLocale } from "@/lib/i18n/locale";
import { isAppLocale } from "@/lib/i18n/locale";
import { PALLET_FILL_STATUSES } from "@/lib/pallet-fill-count";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { archiveReservation } from "@/lib/reservations/archive";
import {
  getReservationExpiryConfig,
  reservationExpiryFrom,
  RESERVATION_EXPIRY_ADMIN_FLAGS,
  RESERVATION_EXPIRY_ARCHIVE_REASONS,
  RESERVATION_EXPIRY_EMAIL_TYPES,
  type ReservationExpiryConfig,
} from "@/lib/reservations/expiry-config";
import {
  decideReservationExpiryAction,
  type ExpiryPalletRow,
  type ExpiryReservationRow,
} from "@/lib/reservations/expiry-eligibility";
import {
  buildExpiryCancelledHtml,
  buildExpiryCancelledText,
  buildExtensionAskHtml,
  buildExtensionAskText,
  expiryCancelledSubject,
  extensionAskSubject,
} from "@/lib/reservations/expiry-emails";
import { createReservationExtensionToken } from "@/lib/reservations/expiry-tokens";

export type ExpiryRunSummary = {
  enabled: boolean;
  dryRun: boolean;
  sendEmail: boolean;
  scanned: number;
  skipped: number;
  waits: number;
  asks: number;
  cancelledNoReply: number;
  hardExpired: number;
  flaggedCharged: number;
  errors: number;
  actions: Array<Record<string, unknown>>;
};

function localeFromProfile(preferred: unknown): AppLocale {
  if (typeof preferred === "string" && isAppLocale(preferred)) return preferred;
  return "sv";
}

async function sendExpiryMail(opts: {
  emailType: string;
  to: string;
  reservationId: string;
  subject: string;
  html: string;
  text: string;
  dryRun: boolean;
  sendEmail: boolean;
}): Promise<"sent" | "skipped" | "dry_run" | "send_disabled" | "failed"> {
  if (opts.dryRun) return "dry_run";
  if (!opts.sendEmail) return "send_disabled";
  return sendTransactionalEmailOnce({
    emailType: opts.emailType,
    recipient: opts.to,
    reservationId: opts.reservationId,
    send: async () => {
      await sendEmail({
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
        from: reservationExpiryFrom(),
      });
      return true;
    },
  });
}

async function clearUnchargedStripeLinkage(
  reservationId: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  const sb = getSupabaseAdmin();
  // Leave SetupIntent / PaymentMethod on the Stripe customer alone; only
  // unlink from this reservation row so nothing is charged from expiry.
  const { error } = await sb
    .from("order_reservations")
    .update({
      payment_method_id: null,
      setup_intent_id: null,
      retry_scheduled_at: null,
    })
    .eq("id", reservationId);
  if (error) {
    console.error(
      `[reservation-expiry] clear stripe linkage reservation_id=${reservationId}:`,
      error.message,
    );
  }
}

async function flagChargedForAdmin(
  reservationId: string,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) return;
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("order_reservations")
    .update({
      expiry_admin_flag: RESERVATION_EXPIRY_ADMIN_FLAGS.alreadyCharged,
      expiry_admin_flagged_at: new Date().toISOString(),
    })
    .eq("id", reservationId)
    .is("expiry_admin_flag", null);
  if (error) {
    console.error(
      `[reservation-expiry] flag charged reservation_id=${reservationId}:`,
      error.message,
    );
  }
}

async function endReservationForExpiry(opts: {
  reservationId: string;
  reason: string;
  dryRun: boolean;
}): Promise<boolean> {
  if (opts.dryRun) return true;
  await clearUnchargedStripeLinkage(opts.reservationId, false);
  const result = await archiveReservation({
    reservationId: opts.reservationId,
    reason: opts.reason,
  });
  if (!result.ok) {
    console.error(
      `[reservation-expiry] archive failed reservation_id=${opts.reservationId}:`,
      result.error,
    );
    return false;
  }
  return true;
}

async function recordExtensionAsk(opts: {
  reservationId: string;
  milestoneDay: number;
  replyBy: Date;
  dryRun: boolean;
}): Promise<boolean> {
  if (opts.dryRun) return true;
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb
    .from("order_reservations")
    .update({
      extension_ask_sent_at: now,
      extension_ask_milestone_day: opts.milestoneDay,
      extension_reply_by: opts.replyBy.toISOString(),
    })
    .eq("id", opts.reservationId);
  if (error) {
    console.error(
      `[reservation-expiry] record ask reservation_id=${opts.reservationId}:`,
      error.message,
    );
    return false;
  }
  return true;
}

/**
 * Apply a successful extension confirmation (token already consumed).
 */
export async function applyReservationExtensionConfirm(opts: {
  reservationId: string;
  now?: Date;
}): Promise<{ ok: true } | { ok: false; code: "not_eligible"; message: string }> {
  const sb = getSupabaseAdmin();
  const now = opts.now ?? new Date();

  const { data: row, error } = await sb
    .from("order_reservations")
    .select(
      "id, status, archived_at, extension_reply_by, extensions_confirmed_count, payment_status",
    )
    .eq("id", opts.reservationId)
    .maybeSingle();

  if (error || !row) {
    return {
      ok: false,
      code: "not_eligible",
      message: "Reservation not found",
    };
  }

  if (row.archived_at != null || String(row.status) === "archived") {
    return {
      ok: false,
      code: "not_eligible",
      message: "Reservation already ended",
    };
  }

  const confirmed =
    Math.max(0, Math.floor(Number(row.extensions_confirmed_count) || 0)) + 1;

  const { error: updErr } = await sb
    .from("order_reservations")
    .update({
      extensions_confirmed_count: confirmed,
      last_extension_confirmed_at: now.toISOString(),
      extension_ask_sent_at: null,
      extension_ask_milestone_day: null,
      extension_reply_by: null,
    })
    .eq("id", opts.reservationId);

  if (updErr) {
    return {
      ok: false,
      code: "not_eligible",
      message: updErr.message,
    };
  }

  return { ok: true };
}

export async function runReservationExpiryJob(
  now: Date = new Date(),
  configOverride?: Partial<ReservationExpiryConfig>,
): Promise<ExpiryRunSummary> {
  const base = getReservationExpiryConfig();
  const config: ReservationExpiryConfig = { ...base, ...configOverride };

  const summary: ExpiryRunSummary = {
    enabled: config.enabled,
    dryRun: config.dryRun,
    sendEmail: config.sendEmail,
    scanned: 0,
    skipped: 0,
    waits: 0,
    asks: 0,
    cancelledNoReply: 0,
    hardExpired: 0,
    flaggedCharged: 0,
    errors: 0,
    actions: [],
  };

  if (!config.enabled) {
    console.log("[reservation-expiry] disabled (RESERVATION_EXPIRY_ENABLED)");
    return summary;
  }

  const sb = getSupabaseAdmin();
  const { data: rows, error } = await sb
    .from("order_reservations")
    .select(
      `
      id,
      status,
      archived_at,
      created_at,
      pallet_id,
      payment_status,
      payment_method_id,
      setup_intent_id,
      extension_ask_sent_at,
      extension_ask_milestone_day,
      extension_reply_by,
      extensions_confirmed_count,
      expiry_admin_flag,
      profiles!left ( email, full_name, preferred_locale )
    `,
    )
    .in("status", [...PALLET_FILL_STATUSES])
    .is("archived_at", null)
    .not("pallet_id", "is", null);

  if (error) {
    console.error("[reservation-expiry] load reservations:", error.message);
    summary.errors += 1;
    return summary;
  }

  const reservations = (rows ?? []) as Array<
    ExpiryReservationRow & {
      profiles?:
        | { email?: string | null; full_name?: string | null; preferred_locale?: string | null }
        | Array<{
            email?: string | null;
            full_name?: string | null;
            preferred_locale?: string | null;
          }>
        | null;
    }
  >;

  const palletIds = [
    ...new Set(
      reservations
        .map((r) => (typeof r.pallet_id === "string" ? r.pallet_id : null))
        .filter((id): id is string => !!id),
    ),
  ];

  const palletById = new Map<string, ExpiryPalletRow>();
  if (palletIds.length > 0) {
    const { data: pallets, error: pErr } = await sb
      .from("pallets")
      .select("id, status, is_complete")
      .in("id", palletIds);
    if (pErr) {
      console.error("[reservation-expiry] load pallets:", pErr.message);
      summary.errors += 1;
      return summary;
    }
    for (const p of pallets ?? []) {
      palletById.set(String(p.id), p as ExpiryPalletRow);
    }
  }

  summary.scanned = reservations.length;
  console.log(
    `[reservation-expiry] enabled=${config.enabled} dryRun=${config.dryRun} sendEmail=${config.sendEmail} scanned=${summary.scanned} maxAgeDays=${config.maxAgeDays}`,
  );

  for (const row of reservations) {
    const palletId =
      typeof row.pallet_id === "string" ? row.pallet_id.trim() : "";
    const pallet = palletId ? palletById.get(palletId) ?? null : null;
    const decision = decideReservationExpiryAction(row, pallet, now, config);

    const profileRaw = row.profiles;
    const profile = Array.isArray(profileRaw) ? profileRaw[0] : profileRaw;
    const toEmail =
      typeof profile?.email === "string" && profile.email.includes("@")
        ? profile.email.trim()
        : null;
    const customerName =
      typeof profile?.full_name === "string" ? profile.full_name : "";
    const locale = localeFromProfile(profile?.preferred_locale);

    const logBase = {
      reservationId: row.id,
      action: decision.action,
      dryRun: config.dryRun,
    };

    try {
      if (decision.action === "skip") {
        summary.skipped += 1;
        summary.actions.push({ ...logBase, reason: decision.reason });
        continue;
      }
      if (decision.action === "wait") {
        summary.waits += 1;
        summary.actions.push({ ...logBase, reason: decision.reason });
        continue;
      }

      if (decision.action === "flag_charged") {
        summary.flaggedCharged += 1;
        await flagChargedForAdmin(row.id, config.dryRun);
        summary.actions.push({ ...logBase, reason: decision.reason });
        console.log(
          `[reservation-expiry] FLAG charged reservation_id=${row.id} dryRun=${config.dryRun}`,
        );
        continue;
      }

      if (decision.action === "send_extension_ask") {
        let confirmUrl = "(dry-run)";
        if (!config.dryRun) {
          const token = await createReservationExtensionToken({
            reservationId: row.id,
            expiresAt: decision.replyBy,
          });
          confirmUrl = token.url;
          const recorded = await recordExtensionAsk({
            reservationId: row.id,
            milestoneDay: decision.milestoneDay,
            replyBy: decision.replyBy,
            dryRun: false,
          });
          if (!recorded) {
            summary.errors += 1;
            continue;
          }
        } else {
          await recordExtensionAsk({
            reservationId: row.id,
            milestoneDay: decision.milestoneDay,
            replyBy: decision.replyBy,
            dryRun: true,
          });
        }

        const askParams = {
          locale,
          customerName,
          confirmUrl,
          replyDays: config.replyDays,
          extensionDays: config.extensionDays,
        };
        let mailResult: string = "no_recipient";
        if (toEmail) {
          mailResult = await sendExpiryMail({
            emailType: RESERVATION_EXPIRY_EMAIL_TYPES.extensionAsk,
            to: toEmail,
            reservationId: row.id,
            subject: extensionAskSubject(locale),
            html: buildExtensionAskHtml(askParams),
            text: buildExtensionAskText(askParams),
            dryRun: config.dryRun,
            sendEmail: config.sendEmail,
          });
        }

        summary.asks += 1;
        summary.actions.push({
          ...logBase,
          milestoneDay: decision.milestoneDay,
          replyBy: decision.replyBy.toISOString(),
          mailResult,
        });
        console.log(
          `[reservation-expiry] ASK milestone=${decision.milestoneDay} reservation_id=${row.id} mail=${mailResult} dryRun=${config.dryRun}`,
        );
        continue;
      }

      if (
        decision.action === "cancel_no_reply" ||
        decision.action === "hard_expire"
      ) {
        const archiveReason =
          decision.action === "hard_expire"
            ? RESERVATION_EXPIRY_ARCHIVE_REASONS.maxAge
            : RESERVATION_EXPIRY_ARCHIVE_REASONS.noExtension;
        const ended = await endReservationForExpiry({
          reservationId: row.id,
          reason: archiveReason,
          dryRun: config.dryRun,
        });
        if (!ended) {
          summary.errors += 1;
          continue;
        }

        const kind =
          decision.action === "hard_expire" ? "max_age" : "no_reply";
        const emailType =
          kind === "max_age"
            ? RESERVATION_EXPIRY_EMAIL_TYPES.cancelledMaxAge
            : RESERVATION_EXPIRY_EMAIL_TYPES.cancelledNoReply;
        const cancelParams = {
          locale,
          customerName,
          kind: kind as "no_reply" | "max_age",
          maxAgeDays: config.maxAgeDays,
        };
        let mailResult: string = "no_recipient";
        if (toEmail) {
          mailResult = await sendExpiryMail({
            emailType,
            to: toEmail,
            reservationId: row.id,
            subject: expiryCancelledSubject(locale, kind),
            html: buildExpiryCancelledHtml(cancelParams),
            text: buildExpiryCancelledText(cancelParams),
            dryRun: config.dryRun,
            sendEmail: config.sendEmail,
          });
        }

        if (decision.action === "hard_expire") summary.hardExpired += 1;
        else summary.cancelledNoReply += 1;

        summary.actions.push({
          ...logBase,
          archiveReason,
          mailResult,
        });
        console.log(
          `[reservation-expiry] END ${decision.action} reservation_id=${row.id} mail=${mailResult} dryRun=${config.dryRun}`,
        );
      }
    } catch (e) {
      summary.errors += 1;
      const message = e instanceof Error ? e.message : String(e);
      console.error(
        `[reservation-expiry] error reservation_id=${row.id}:`,
        message,
      );
      summary.actions.push({ ...logBase, error: message });
    }
  }

  return summary;
}
