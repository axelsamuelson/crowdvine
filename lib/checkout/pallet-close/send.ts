/**
 * Claimed sends for pallet-close emails. Respects RESEND_API_KEY;
 * when unset, returns skipped/failed without throwing (never “touch prod”).
 */

import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import { sendEmail } from "@/lib/email";
import {
  buildPalletClosedChargedEmail,
  buildPalletCloseCancelledEmail,
  buildPalletCloseChoiceEmail,
  buildPalletClosePaymentFailedEmail,
  type PalletCloseEmailLocale,
} from "@/lib/checkout/pallet-close/emails";
import { formatSharedPalletChargeDeadline } from "@/lib/checkout/shared-pallet-deadline";

async function resolveRecipient(reservationId: string): Promise<{
  email: string | null;
  name: string;
  locale: PalletCloseEmailLocale;
  amountSek: number;
  palletName: string | null;
}> {
  const sb = getSupabaseAdmin();
  const { data: row } = await sb
    .from("order_reservations")
    .select("user_id, pallet_id, pallet:pallets(name)")
    .eq("id", reservationId)
    .maybeSingle();

  const userId = row?.user_id ? String(row.user_id) : "";
  let email: string | null = null;
  let name = "";
  let locale: PalletCloseEmailLocale = "sv";

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

  // Best-effort amount from line items (öre → SEK). Missing items → 0.
  let amountSek = 0;
  const { data: items } = await sb
    .from("order_reservation_items")
    .select("quantity, wines(base_price_cents)")
    .eq("reservation_id", reservationId);
  if (items?.length) {
    let ore = 0;
    for (const it of items) {
      const qty = Number(it.quantity) || 0;
      const wine = it.wines as
        | { base_price_cents?: number }
        | { base_price_cents?: number }[]
        | null;
      const unit = Array.isArray(wine)
        ? Number(wine[0]?.base_price_cents) || 0
        : Number(wine?.base_price_cents) || 0;
      ore += qty * unit;
    }
    amountSek = Math.round(ore / 100);
  }

  return {
    email,
    name,
    locale,
    amountSek,
    palletName,
  };
}

export async function sendPalletClosedChargedEmailOnce(opts: {
  reservationId: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";
  const built = buildPalletClosedChargedEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    amountSek: r.amountSek,
    palletName: r.palletName,
  });
  return sendTransactionalEmailOnce({
    emailType: "pallet_closed_charged",
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

export async function sendPalletCloseChoiceEmailOnce(opts: {
  reservationId: string;
  replyByIso: string;
  waitUrl: string;
  cancelUrl: string;
  switchDirectUrl?: string | null;
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";
  const replyByLabel =
    formatSharedPalletChargeDeadline(opts.replyByIso, r.locale) ||
    opts.replyByIso.slice(0, 10);
  const built = buildPalletCloseChoiceEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    replyByLabel,
    waitUrl: opts.waitUrl,
    cancelUrl: opts.cancelUrl,
    switchDirectUrl: opts.switchDirectUrl,
  });
  return sendTransactionalEmailOnce({
    emailType: "pallet_close_choice",
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

export async function sendPalletCloseCancelledEmailOnce(opts: {
  reservationId: string;
  reason: "customer_cancel" | "choice_timeout" | "pay_link_timeout" | "other";
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";
  const built = buildPalletCloseCancelledEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    reason: opts.reason,
  });
  return sendTransactionalEmailOnce({
    emailType: `pallet_close_cancelled:${opts.reason}`,
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

export async function sendPalletClosePaymentFailedEmailOnce(opts: {
  reservationId: string;
  payByIso: string;
  paymentLinkUrl: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";
  const payByLabel =
    formatSharedPalletChargeDeadline(opts.payByIso, r.locale) ||
    opts.payByIso.slice(0, 10);
  const built = buildPalletClosePaymentFailedEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    payByLabel,
    paymentLinkUrl: opts.paymentLinkUrl,
  });
  return sendTransactionalEmailOnce({
    emailType: "pallet_close_payment_failed",
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
