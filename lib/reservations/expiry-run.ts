import { sendEmail } from "@/lib/email";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import { getEmailAppUrl } from "@/lib/email/order-email-chrome";
import { isPalletCloseFlowEnabled } from "@/lib/checkout/pallet-close/flags";
import { createPalletCloseActionToken } from "@/lib/checkout/pallet-close/tokens";
import type { AppLocale } from "@/lib/i18n/locale";
import { isAppLocale } from "@/lib/i18n/locale";
import {
  getPalletFillData,
  PALLET_FILL_STATUSES,
} from "@/lib/pallet-fill-count";
import { DEFAULT_MIN_BOTTLES_TO_COMPLETE } from "@/lib/pallet-ship-progress";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  getReservationExpiryConfig,
  reservationExpiryFrom,
  reservationExpiryReplyTo,
  RESERVATION_EXPIRY_ADMIN_FLAGS,
  statusUpdateEmailType,
  type ReservationExpiryConfig,
} from "@/lib/reservations/expiry-config";
import {
  decideReservationExpiryAction,
  type ExpiryPalletRow,
  type ExpiryReservationRow,
} from "@/lib/reservations/expiry-eligibility";
import {
  buildStatusEmailHtml,
  buildStatusEmailText,
  statusEmailSubject,
} from "@/lib/reservations/expiry-emails";

export type ExpiryRunSummary = {
  enabled: boolean;
  dryRun: boolean;
  sendEmail: boolean;
  scanned: number;
  skipped: number;
  waits: number;
  /** Decisions that would send a status email (at most one per order per run). */
  wouldSendStatusEmails: number;
  /** Emails actually handed to the mailer (0 when sendEmail=false or dryRun). */
  statusEmailsSent: number;
  /** @deprecated Alias of wouldSendStatusEmails. */
  statusEmails: number;
  /** @deprecated Always 0 — extension asks removed. */
  asks: number;
  /** @deprecated Always 0 — no auto-cancel for no reply. */
  cancelledNoReply: number;
  /** @deprecated Always 0 — no hard max-age cancel. */
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
        replyTo: reservationExpiryReplyTo(),
      });
      return true;
    },
  });
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

/**
 * Record that a status email period was handled.
 * Clears any legacy extension_reply_by so old open asks never trigger cancel.
 */
async function recordStatusEmailSent(opts: {
  reservationId: string;
  periodDay: number;
  dryRun: boolean;
}): Promise<boolean> {
  if (opts.dryRun) return true;
  const sb = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { error } = await sb
    .from("order_reservations")
    .update({
      extension_ask_sent_at: now,
      extension_ask_milestone_day: opts.periodDay,
      extension_reply_by: null,
    })
    .eq("id", opts.reservationId);
  if (error) {
    console.error(
      `[reservation-expiry] record status reservation_id=${opts.reservationId}:`,
      error.message,
    );
    return false;
  }
  return true;
}

/**
 * Legacy extension confirm — no longer extends or mutates anything.
 * Returns a friendly ok so old links never error.
 */
export async function applyReservationExtensionConfirm(opts: {
  reservationId: string;
  now?: Date;
  extensionDays?: number;
}): Promise<
  | { ok: true; newEndDate: Date; extensionDays: number }
  | { ok: false; code: "not_eligible"; message: string }
> {
  const now = opts.now ?? new Date();
  const extensionDays =
    opts.extensionDays ?? getReservationExpiryConfig().statusIntervalDays;
  // Intentionally no DB writes — old links must change nothing.
  return {
    ok: true,
    newEndDate: new Date(now.getTime() + extensionDays * 24 * 60 * 60 * 1000),
    extensionDays,
  };
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
    wouldSendStatusEmails: 0,
    statusEmailsSent: 0,
    statusEmails: 0,
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
  // Do not select fulfillment_channel — migration 277 is not applied in
  // production; PostgREST rejects unknown columns. Without the column, treat
  // channel as null / shared_pallet; isPalletBasedReservation uses pallet_id.
  const { data: rows, error } = await sb
    .from("order_reservations")
    .select(
      `
      id,
      status,
      archived_at,
      created_at,
      pallet_id,
      payment_mode,
      payment_status,
      payment_method_id,
      setup_intent_id,
      total_sek,
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
      .select("id, status, is_complete, bottle_capacity, min_bottles_to_complete")
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
    `[reservation-expiry] enabled=${config.enabled} dryRun=${config.dryRun} sendEmail=${config.sendEmail} scanned=${summary.scanned} statusIntervalDays=${config.statusIntervalDays}`,
  );

  const fillCache = new Map<
    string,
    { bottlesFilled: number; minBottlesToShip: number }
  >();

  async function fillForPallet(palletId: string, pallet: ExpiryPalletRow) {
    const cached = fillCache.get(palletId);
    if (cached) return cached;
    try {
      const data = await getPalletFillData(
        palletId,
        Number(pallet.bottle_capacity) || 0,
        pallet.min_bottles_to_complete != null
          ? Number(pallet.min_bottles_to_complete)
          : DEFAULT_MIN_BOTTLES_TO_COMPLETE,
      );
      const value = {
        bottlesFilled: data.bottlesFilled,
        minBottlesToShip: data.minBottlesToShip,
      };
      fillCache.set(palletId, value);
      return value;
    } catch (e) {
      console.error(
        `[reservation-expiry] fill data pallet_id=${palletId}:`,
        e,
      );
      const fallback = {
        bottlesFilled: 0,
        minBottlesToShip: DEFAULT_MIN_BOTTLES_TO_COMPLETE,
      };
      fillCache.set(palletId, fallback);
      return fallback;
    }
  }

  for (const row of reservations) {
    const palletId =
      typeof row.pallet_id === "string" ? row.pallet_id.trim() : "";
    const pallet = palletId ? palletById.get(palletId) ?? null : null;
    const decision = decideReservationExpiryAction(row, pallet, now, config, {
      palletCloseFlowEnabled: isPalletCloseFlowEnabled(),
    });

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
      // Safety: never auto-cancel, even if a stale caller expected it.
      if (
        (decision as { action?: string }).action === "cancel_no_reply" ||
        (decision as { action?: string }).action === "hard_expire"
      ) {
        summary.waits += 1;
        summary.actions.push({
          ...logBase,
          action: "wait",
          reason: "auto_cancel_disabled",
          blockedAction: (decision as { action: string }).action,
        });
        console.log(
          `[reservation-expiry] BLOCKED auto-cancel reservation_id=${row.id} action=${(decision as { action: string }).action}`,
        );
        continue;
      }

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

      if (decision.action === "send_status_email") {
        // At most one status email decision per order per run (duePeriod only).
        summary.wouldSendStatusEmails += 1;
        summary.statusEmails = summary.wouldSendStatusEmails;

        const baseUrl = getEmailAppUrl().replace(/\/$/, "");
        const orderUrl = `${baseUrl}/profile/reservations`;
        let cancelUrl = orderUrl;

        const amountRaw = Number(
          (row as { total_sek?: number | string | null }).total_sek,
        );
        let bottlesOrdered = 0;
        let bottlesNeeded = DEFAULT_MIN_BOTTLES_TO_COMPLETE;
        if (palletId && pallet) {
          const fill = await fillForPallet(palletId, pallet);
          bottlesOrdered = fill.bottlesFilled;
          bottlesNeeded = fill.minBottlesToShip;
        }

        // Points used on the order (pending redemption events); show line only if >0.
        let pointsUsed: number | null = null;
        try {
          const { data: ptRows } = await sb
            .from("pact_points_events")
            .select("points_delta")
            .eq("related_order_id", row.id)
            .eq("event_type", "redemption");
          const sum = (ptRows ?? []).reduce((acc, r) => {
            const d = Number(r.points_delta) || 0;
            return acc + (d < 0 ? Math.abs(d) : 0);
          }, 0);
          pointsUsed = sum > 0 ? sum : null;
        } catch {
          pointsUsed = null;
        }

        // Dry-run / sendEmail=false: count only — no tokens, no DB milestone, no mail.
        if (config.dryRun || !config.sendEmail) {
          summary.actions.push({
            ...logBase,
            periodDay: decision.periodDay,
            mailResult: config.dryRun ? "dry_run" : "send_disabled",
            wouldSend: true,
          });
          console.log(
            `[reservation-expiry] STATUS would-send period=${decision.periodDay} reservation_id=${row.id} dryRun=${config.dryRun} sendEmail=${config.sendEmail}`,
          );
          continue;
        }

        try {
          const expiresAt = new Date(
            now.getTime() + 365 * 24 * 60 * 60 * 1000,
          );
          const tok = await createPalletCloseActionToken({
            reservationId: row.id,
            action: "cancel",
            expiresAt,
          });
          cancelUrl = tok.url;
        } catch (e) {
          console.error(
            `[reservation-expiry] cancel token reservation_id=${row.id}:`,
            e,
          );
          cancelUrl = orderUrl;
        }

        const statusParams = {
          locale,
          customerName,
          orderId: row.id,
          bottlesOrdered,
          bottlesNeeded,
          amountSek: Number.isFinite(amountRaw) ? amountRaw : null,
          orderUrl,
          cancelUrl,
          pointsUsed,
        };

        let mailResult: string = "no_recipient";
        if (toEmail) {
          mailResult = await sendExpiryMail({
            emailType: statusUpdateEmailType(decision.periodDay),
            to: toEmail,
            reservationId: row.id,
            subject: statusEmailSubject(locale),
            html: buildStatusEmailHtml(statusParams),
            text: buildStatusEmailText(statusParams),
            dryRun: false,
            sendEmail: true,
          });
        }

        // Only mark the period after a real send (or skip=already claimed).
        // Failed sends leave milestone unset so a later run can retry.
        if (mailResult === "sent" || mailResult === "skipped") {
          const recorded = await recordStatusEmailSent({
            reservationId: row.id,
            periodDay: decision.periodDay,
            dryRun: false,
          });
          if (!recorded) summary.errors += 1;
          if (mailResult === "sent") summary.statusEmailsSent += 1;
        } else if (mailResult === "no_recipient") {
          // No email address — still advance milestone so we don't loop forever.
          await recordStatusEmailSent({
            reservationId: row.id,
            periodDay: decision.periodDay,
            dryRun: false,
          });
        } else {
          summary.errors += 1;
        }

        summary.actions.push({
          ...logBase,
          periodDay: decision.periodDay,
          mailResult,
          wouldSend: true,
        });
        console.log(
          `[reservation-expiry] STATUS period=${decision.periodDay} reservation_id=${row.id} mail=${mailResult}`,
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
