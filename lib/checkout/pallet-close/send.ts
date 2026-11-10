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
import { resolveAmountOre } from "@/lib/checkout/pallet-close/resolve-amount-ore";
import { formatSharedPalletChargeDeadline } from "@/lib/checkout/shared-pallet-deadline";

async function resolveRecipient(reservationId: string): Promise<{
  email: string | null;
  name: string;
  locale: PalletCloseEmailLocale;
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

  const palletEmbed = row?.pallet as
    | { name?: unknown }
    | { name?: unknown }[]
    | null
    | undefined;
  const palletObj = Array.isArray(palletEmbed) ? palletEmbed[0] : palletEmbed;
  const palletName =
    palletObj && typeof palletObj.name === "string" ? palletObj.name : null;

  return {
    email,
    name,
    locale,
    palletName,
  };
}

export async function sendPalletClosedChargedEmailOnce(opts: {
  reservationId: string;
}): Promise<"sent" | "skipped" | "failed"> {
  const r = await resolveRecipient(opts.reservationId);
  if (!r.email) return "failed";

  // Same source as the charge — never guess from catalog wine prices.
  const amountOre = await resolveAmountOre(opts.reservationId);
  if (amountOre == null || amountOre <= 0) {
    console.error(
      "[pallet-close] amount unavailable — refusing charged email guess",
      { reservationId: opts.reservationId },
    );
    try {
      await getSupabaseAdmin().from("pallet_close_events").insert({
        reservation_id: opts.reservationId,
        event: "amount_unavailable",
        meta: {
          reason: "missing_expected_amount_and_total_sek",
          context: "pallet_closed_charged_email",
        },
      });
    } catch (err) {
      console.error(
        "[pallet-close] failed to record amount_unavailable for charged email",
        { reservationId: opts.reservationId, err },
      );
    }
    return "failed";
  }
  const amountSek = Math.round(amountOre / 100);

  const built = buildPalletClosedChargedEmail({
    locale: r.locale,
    customerName: r.name,
    reservationId: opts.reservationId,
    amountSek,
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
