/**
 * Claimed sends for post-close delivery emails.
 * When RESEND_API_KEY is unset, callers should skip provider sends
 * (same pattern as pallet-close).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import { sendEmail } from "@/lib/email";
import { getAppUrl } from "@/lib/app-url";
import {
  buildPalletDeliveryDayEmail,
  buildPalletDeliveryDelayEmail,
  buildPalletShippedEmail,
  type PalletDeliveryEmailLocale,
} from "@/lib/checkout/pallet-delivery-notify/emails";
import {
  PALLET_DELIVERY_EMAIL_TYPES,
  isLateDeliveryCancelEligible,
} from "@/lib/checkout/pallet-delivery-notify/eligibility";

async function resolveRecipient(reservationId: string): Promise<{
  email: string | null;
  name: string;
  locale: PalletDeliveryEmailLocale;
  palletName: string | null;
  cancelledAt: string | null;
  lateDeliveryCancelAt: string | null;
}> {
  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("order_reservations")
    .select(
      "user_id, cancelled_at, late_delivery_cancel_at, pallet:pallets(name)",
    )
    .eq("id", reservationId)
    .maybeSingle();

  const userId = row?.user_id ? String(row.user_id) : "";
  let email: string | null = null;
  let name = "";
  let locale: PalletDeliveryEmailLocale = "sv";

  if (userId) {
    const { data: profile } = await sb
      .from("profiles")
      .select("email, full_name, preferred_locale")
      .eq("id", userId)
      .maybeSingle();
    email = profile?.email ? String(profile.email) : null;
    name = profile?.full_name ? String(profile.full_name) : "";
    if (String(profile?.preferred_locale || "").toLowerCase().startsWith("en")) {
      locale = "en";
    }
  }

  const palletName =
    row?.pallet && typeof (row.pallet as { name?: unknown }).name === "string"
      ? String((row.pallet as { name: string }).name)
      : null;

  return {
    email,
    name,
    locale,
    palletName,
    cancelledAt: row?.cancelled_at ? String(row.cancelled_at) : null,
    lateDeliveryCancelAt: row?.late_delivery_cancel_at
      ? String(row.late_delivery_cancel_at)
      : null,
  };
}

export async function sendPalletShippedEmailOnce(opts: {
  reservationId: string;
  windowStart: string;
  windowEnd: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";
  const built = buildPalletShippedEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    windowStart: opts.windowStart,
    windowEnd: opts.windowEnd,
    palletName: r.palletName,
  });
  return sendTransactionalEmailOnce({
    emailType: PALLET_DELIVERY_EMAIL_TYPES.shipped,
    recipient: r.email,
    reservationId: opts.reservationId,
    send: async () => {
      await sendEmail({
        to: r.email!,
        subject: built.subject,
        html: built.html,
        text: built.text,
      });
      return true;
    },
  });
}

export async function sendPalletDeliveryDayEmailOnce(opts: {
  reservationId: string;
  deliveryDayLabel: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";
  const built = buildPalletDeliveryDayEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    deliveryDayLabel: opts.deliveryDayLabel,
    palletName: r.palletName,
  });
  return sendTransactionalEmailOnce({
    emailType: PALLET_DELIVERY_EMAIL_TYPES.deliveryDay,
    recipient: r.email,
    reservationId: opts.reservationId,
    send: async () => {
      await sendEmail({
        to: r.email!,
        subject: built.subject,
        html: built.html,
        text: built.text,
      });
      return true;
    },
  });
}

export async function sendPalletDeliveryDelayEmailOnce(opts: {
  reservationId: string;
  expectedDateIso: string;
  expectedDateLabel: string;
  closedAt?: string | null;
  deliveryDay?: string | null;
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";

  const showCancel = isLateDeliveryCancelEligible({
    closedAt: opts.closedAt,
    deliveryDay: opts.deliveryDay,
    cancelledAt: r.cancelledAt,
    lateDeliveryCancelAt: r.lateDeliveryCancelAt,
  });
  const cancelForRefundUrl = showCancel
    ? `${getAppUrl()}/profile/reservations/${encodeURIComponent(opts.reservationId)}/late-cancel`
    : null;

  const built = buildPalletDeliveryDelayEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    expectedDateLabel: opts.expectedDateLabel,
    cancelForRefundUrl,
    palletName: r.palletName,
  });

  const dateKey = String(opts.expectedDateIso).trim().slice(0, 10);
  return sendTransactionalEmailOnce({
    emailType: PALLET_DELIVERY_EMAIL_TYPES.delayForDate(dateKey),
    recipient: r.email,
    reservationId: opts.reservationId,
    send: async () => {
      await sendEmail({
        to: r.email!,
        subject: built.subject,
        html: built.html,
        text: built.text,
      });
      return true;
    },
  });
}
