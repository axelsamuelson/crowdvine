/**
 * Admin-triggered post-close delivery notifications.
 * Gated by isPalletCloseFlowEnabled() — persists fields always when called
 * from admin; emails only when the close-flow gate is on AND Resend is configured
 * (or PALLET_CLOSE_SEND_EMAIL forces).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPalletCloseFlowEnabled } from "@/lib/checkout/pallet-close/flags";
import {
  sendPalletDeliveryDayEmailOnce,
  sendPalletDeliveryDelayEmailOnce,
  sendPalletShippedEmailOnce,
} from "@/lib/checkout/pallet-delivery-notify/send";

export type DeliveryNotifySummary = {
  ok: boolean;
  action: string;
  emailsEnabled: boolean;
  reservationCount: number;
  sent: number;
  skipped: number;
  failed: number;
  message?: string;
};

function shouldSendEmail(): boolean {
  const forced = String(process.env.PALLET_CLOSE_SEND_EMAIL ?? "")
    .trim()
    .toLowerCase();
  if (forced === "false" || forced === "0" || forced === "off") return false;
  if (forced === "true" || forced === "1" || forced === "on") {
    return Boolean(process.env.RESEND_API_KEY?.trim());
  }
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value).trim());
}

async function listNotifyReservationIds(
  palletId: string,
): Promise<string[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("order_reservations")
    .select("id, status, cancelled_at, payment_status")
    .eq("pallet_id", palletId)
    .is("archived_at", null);

  if (error || !data) return [];

  return data
    .filter((row) => {
      if (row.cancelled_at) return false;
      const status = String(row.status || "").toLowerCase();
      if (status === "cancelled" || status === "archived") return false;
      return true;
    })
    .map((row) => String(row.id));
}

async function fanOut(
  reservationIds: string[],
  sendOne: (id: string) => Promise<"sent" | "skipped" | "failed">,
): Promise<Pick<DeliveryNotifySummary, "sent" | "skipped" | "failed">> {
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const id of reservationIds) {
    const result = await sendOne(id);
    if (result === "sent") sent += 1;
    else if (result === "skipped") skipped += 1;
    else failed += 1;
  }
  return { sent, skipped, failed };
}

/**
 * (1) Admin marks pallet shipped + enters estimated delivery window.
 */
export async function markPalletShippedAndNotify(opts: {
  palletId: string;
  windowStart: string;
  windowEnd: string;
  now?: Date;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<DeliveryNotifySummary> {
  const start = String(opts.windowStart).trim();
  const end = String(opts.windowEnd).trim();
  if (!isIsoDate(start) || !isIsoDate(end)) {
    return {
      ok: false,
      action: "mark_shipped",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: "window_start_and_end_required_yyyy_mm_dd",
    };
  }
  if (start > end) {
    return {
      ok: false,
      action: "mark_shipped",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: "window_start_after_end",
    };
  }

  const nowIso = (opts.now ?? new Date()).toISOString();
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("pallets")
    .update({
      delivery_window_start: start,
      delivery_window_end: end,
      delivery_shipped_at: nowIso,
      status: "shipped",
      status_mode: "manual",
      updated_at: nowIso,
    })
    .eq("id", opts.palletId);

  if (error) {
    return {
      ok: false,
      action: "mark_shipped",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: error.message,
    };
  }

  const emailsEnabled =
    isPalletCloseFlowEnabled(opts.env) && shouldSendEmail();
  const reservationIds = await listNotifyReservationIds(opts.palletId);

  if (!emailsEnabled) {
    return {
      ok: true,
      action: "mark_shipped",
      emailsEnabled: false,
      reservationCount: reservationIds.length,
      sent: 0,
      skipped: reservationIds.length,
      failed: 0,
      message: "emails_skipped_flag_or_no_resend",
    };
  }

  const counts = await fanOut(reservationIds, (id) =>
    sendPalletShippedEmailOnce({
      reservationId: id,
      windowStart: start,
      windowEnd: end,
    }),
  );

  await sb
    .from("pallets")
    .update({ delivery_shipped_notified_at: nowIso, updated_at: nowIso })
    .eq("id", opts.palletId);

  return {
    ok: true,
    action: "mark_shipped",
    emailsEnabled: true,
    reservationCount: reservationIds.length,
    ...counts,
  };
}

/**
 * (2) Admin marks arrived in Sweden + enters delivery day.
 */
export async function markPalletArrivedSwedenAndNotify(opts: {
  palletId: string;
  deliveryDay: string;
  now?: Date;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<DeliveryNotifySummary> {
  const day = String(opts.deliveryDay).trim();
  if (!isIsoDate(day)) {
    return {
      ok: false,
      action: "mark_arrived_sweden",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: "delivery_day_required_yyyy_mm_dd",
    };
  }

  const nowIso = (opts.now ?? new Date()).toISOString();
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("pallets")
    .update({
      delivery_day: day,
      arrived_sweden_at: nowIso,
      status: "out_for_delivery",
      status_mode: "manual",
      updated_at: nowIso,
    })
    .eq("id", opts.palletId);

  if (error) {
    return {
      ok: false,
      action: "mark_arrived_sweden",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: error.message,
    };
  }

  const emailsEnabled =
    isPalletCloseFlowEnabled(opts.env) && shouldSendEmail();
  const reservationIds = await listNotifyReservationIds(opts.palletId);

  if (!emailsEnabled) {
    return {
      ok: true,
      action: "mark_arrived_sweden",
      emailsEnabled: false,
      reservationCount: reservationIds.length,
      sent: 0,
      skipped: reservationIds.length,
      failed: 0,
      message: "emails_skipped_flag_or_no_resend",
    };
  }

  const counts = await fanOut(reservationIds, (id) =>
    sendPalletDeliveryDayEmailOnce({
      reservationId: id,
      deliveryDayLabel: day,
    }),
  );

  await sb
    .from("pallets")
    .update({ delivery_day_notified_at: nowIso, updated_at: nowIso })
    .eq("id", opts.palletId);

  return {
    ok: true,
    action: "mark_arrived_sweden",
    emailsEnabled: true,
    reservationCount: reservationIds.length,
    ...counts,
  };
}

/**
 * Delay notice — admin sets a new expected delivery date.
 */
export async function setPalletExpectedDateAndNotify(opts: {
  palletId: string;
  expectedDate: string;
  now?: Date;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}): Promise<DeliveryNotifySummary> {
  const expected = String(opts.expectedDate).trim();
  if (!isIsoDate(expected)) {
    return {
      ok: false,
      action: "set_expected_date",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: "expected_date_required_yyyy_mm_dd",
    };
  }

  const nowIso = (opts.now ?? new Date()).toISOString();
  const sb = getSupabaseAdmin();

  const { data: pallet, error: readErr } = await sb
    .from("pallets")
    .select("id, closed_at, delivery_day, delivery_expected_date")
    .eq("id", opts.palletId)
    .maybeSingle();

  if (readErr || !pallet) {
    return {
      ok: false,
      action: "set_expected_date",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: readErr?.message || "pallet_not_found",
    };
  }

  const { error } = await sb
    .from("pallets")
    .update({
      delivery_expected_date: expected,
      delivery_expected_updated_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", opts.palletId);

  if (error) {
    return {
      ok: false,
      action: "set_expected_date",
      emailsEnabled: false,
      reservationCount: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      message: error.message,
    };
  }

  const emailsEnabled =
    isPalletCloseFlowEnabled(opts.env) && shouldSendEmail();
  const reservationIds = await listNotifyReservationIds(opts.palletId);

  if (!emailsEnabled) {
    return {
      ok: true,
      action: "set_expected_date",
      emailsEnabled: false,
      reservationCount: reservationIds.length,
      sent: 0,
      skipped: reservationIds.length,
      failed: 0,
      message: "emails_skipped_flag_or_no_resend",
    };
  }

  const closedAt = pallet.closed_at ? String(pallet.closed_at) : null;
  const deliveryDay = pallet.delivery_day
    ? String(pallet.delivery_day)
    : null;

  const counts = await fanOut(reservationIds, (id) =>
    sendPalletDeliveryDelayEmailOnce({
      reservationId: id,
      expectedDateIso: expected,
      expectedDateLabel: expected,
      closedAt,
      deliveryDay,
    }),
  );

  return {
    ok: true,
    action: "set_expected_date",
    emailsEnabled: true,
    reservationCount: reservationIds.length,
    ...counts,
  };
}

/** Record pallet closed_at once (close-flow charge path). */
export async function recordPalletClosedAtIfMissing(opts: {
  palletId: string;
  closedAt?: Date;
}): Promise<void> {
  const sb = getSupabaseAdmin();
  const nowIso = (opts.closedAt ?? new Date()).toISOString();
  const { data } = await sb
    .from("pallets")
    .select("closed_at")
    .eq("id", opts.palletId)
    .maybeSingle();
  if (data?.closed_at) return;
  await sb
    .from("pallets")
    .update({ closed_at: nowIso, updated_at: nowIso })
    .eq("id", opts.palletId)
    .is("closed_at", null);
}
