/**
 * Post-close delivery transactional emails (SV/EN).
 * Shared Inès template + Juliette legal footer.
 * Never auto-sends — callers claim via email_sends first.
 */

import {
  formatDeliveryWindowLabel,
  orderCtaLabel,
  orderReservationsUrl,
  p,
  primaryButtonHtml,
  withOrderEmailTextFooter,
  wrapOrderEmail,
  type OrderEmailLocale,
} from "@/lib/email/order-email-chrome";
import { escapeHtmlBasic } from "@/lib/email/escape-html";

export type PalletDeliveryEmailLocale = OrderEmailLocale;

/** (1) Pallen har skickats — estimated delivery window. */
export function buildPalletShippedEmail(opts: {
  locale: PalletDeliveryEmailLocale;
  customerName: string;
  reservationId: string;
  windowStart: string;
  windowEnd: string;
  /** @deprecated Internal pallet names must not appear in customer emails. */
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const window = formatDeliveryWindowLabel(
    opts.locale,
    opts.windowStart,
    opts.windowEnd,
  );
  const orderUrl = orderReservationsUrl();
  const cta = orderCtaLabel(opts.locale);

  if (opts.locale === "sv") {
    const subject = "Pallen har skickats";
    const text = `Hej ${name},

Vinet är på väg till Sverige. Beräknat leveransfönster: ${window}.

Vi mejlar leveransdagen när vinet har nått Sverige.

${cta}: ${orderUrl}
`;
    const html = wrapOrderEmail({
      locale: "sv",
      title: subject,
      orderId: opts.reservationId,
      bodyHtml: [
        p(`Hej ${escapeHtmlBasic(name)},`),
        p("Vinet är på väg till Sverige."),
        p(
          `Beräknat leveransfönster: <strong>${escapeHtmlBasic(window)}</strong>.`,
        ),
        p("Vi mejlar leveransdagen när vinet har nått Sverige."),
        `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
      ].join(""),
    });
    return {
      subject,
      html,
      text: withOrderEmailTextFooter(text, "sv", opts.reservationId),
    };
  }

  const subject = "The pallet has shipped";
  const text = `Hi ${name},

Your wine is on its way to Sweden. Estimated delivery window: ${window}.

We'll email the delivery date once the wine has reached Sweden.

${cta}: ${orderUrl}
`;
  const html = wrapOrderEmail({
    locale: "en",
    title: subject,
    orderId: opts.reservationId,
    bodyHtml: [
      p(`Hi ${escapeHtmlBasic(name)},`),
      p("Your wine is on its way to Sweden."),
      p(
        `Estimated delivery window: <strong>${escapeHtmlBasic(window)}</strong>.`,
      ),
      p("We'll email the delivery date once the wine has reached Sweden."),
      `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
    ].join(""),
  });
  return {
    subject,
    html,
    text: withOrderEmailTextFooter(text, "en", opts.reservationId),
  };
}

/** (2) Leveransdag — delivery day after arrived in Sweden. */
export function buildPalletDeliveryDayEmail(opts: {
  locale: PalletDeliveryEmailLocale;
  customerName: string;
  reservationId: string;
  deliveryDayLabel: string;
  /** @deprecated Internal pallet names must not appear in customer emails. */
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const day = String(opts.deliveryDayLabel).trim();
  const orderUrl = orderReservationsUrl();
  const cta = orderCtaLabel(opts.locale);

  if (opts.locale === "sv") {
    const subject = "Leveransdag";
    const text = `Hej ${name},

Vinet har nått Sverige. Leveransdag: ${day}.

${cta}: ${orderUrl}
`;
    const html = wrapOrderEmail({
      locale: "sv",
      title: subject,
      orderId: opts.reservationId,
      bodyHtml: [
        p(`Hej ${escapeHtmlBasic(name)},`),
        p("Vinet har nått Sverige."),
        p(`Leveransdag: <strong>${escapeHtmlBasic(day)}</strong>.`),
        `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
      ].join(""),
    });
    return {
      subject,
      html,
      text: withOrderEmailTextFooter(text, "sv", opts.reservationId),
    };
  }

  const subject = "Delivery day";
  const text = `Hi ${name},

The wine has reached Sweden. Delivery day: ${day}.

${cta}: ${orderUrl}
`;
  const html = wrapOrderEmail({
    locale: "en",
    title: subject,
    orderId: opts.reservationId,
    bodyHtml: [
      p(`Hi ${escapeHtmlBasic(name)},`),
      p("The wine has reached Sweden."),
      p(`Delivery day: <strong>${escapeHtmlBasic(day)}</strong>.`),
      `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
    ].join(""),
  });
  return {
    subject,
    html,
    text: withOrderEmailTextFooter(text, "en", opts.reservationId),
  };
}

/** Delay notice — new expected date; optional late-cancel link. */
export function buildPalletDeliveryDelayEmail(opts: {
  locale: PalletDeliveryEmailLocale;
  customerName: string;
  reservationId: string;
  expectedDateLabel: string;
  cancelForRefundUrl?: string | null;
  /** @deprecated Internal pallet names must not appear in customer emails. */
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const date = String(opts.expectedDateLabel).trim();
  const cancelUrl =
    opts.cancelForRefundUrl && opts.cancelForRefundUrl.trim()
      ? opts.cancelForRefundUrl.trim()
      : null;

  if (opts.locale === "sv") {
    const subject = "Ny beräknad leveransdag";
    const cancelText = cancelUrl
      ? `\nEftersom det gått mer än 30 dagar sedan pallen stängde kan du avboka med full återbetalning (återbetalning inom 14 dagar):\n${cancelUrl}\n`
      : "";
    const text = `Hej ${name},

Leveransen är försenad. Ny beräknad leveransdag: ${date}.${cancelText}`;
    const cancelHtml = cancelUrl
      ? `<p style="color:#111;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Eftersom det gått mer än 30 dagar sedan pallen stängde kan du <a href="${escapeHtmlBasic(cancelUrl)}" style="color:#0A0A0A;text-decoration:underline;">avboka med full återbetalning</a> (återbetalning inom 14 dagar).</p>`
      : "";
    const html = wrapOrderEmail({
      locale: "sv",
      title: subject,
      orderId: opts.reservationId,
      bodyHtml: [
        p(`Hej ${escapeHtmlBasic(name)},`),
        p("Leveransen är försenad."),
        p(
          `Ny beräknad leveransdag: <strong>${escapeHtmlBasic(date)}</strong>.`,
        ),
        cancelHtml,
      ].join(""),
    });
    return {
      subject,
      html,
      text: withOrderEmailTextFooter(text, "sv", opts.reservationId),
    };
  }

  const subject = "Updated expected delivery date";
  const cancelText = cancelUrl
    ? `\nBecause more than 30 days have passed since the pallet closed, you can cancel for a full refund (refund within 14 days):\n${cancelUrl}\n`
    : "";
  const text = `Hi ${name},

Delivery is delayed. New expected delivery date: ${date}.${cancelText}`;
  const cancelHtml = cancelUrl
    ? `<p style="color:#111;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Because more than 30 days have passed since the pallet closed, you can <a href="${escapeHtmlBasic(cancelUrl)}" style="color:#0A0A0A;text-decoration:underline;">cancel for a full refund</a> (refund within 14 days).</p>`
    : "";
  const html = wrapOrderEmail({
    locale: "en",
    title: subject,
    orderId: opts.reservationId,
    bodyHtml: [
      p(`Hi ${escapeHtmlBasic(name)},`),
      p("Delivery is delayed."),
      p(
        `New expected delivery date: <strong>${escapeHtmlBasic(date)}</strong>.`,
      ),
      cancelHtml,
    ].join(""),
  });
  return {
    subject,
    html,
    text: withOrderEmailTextFooter(text, "en", opts.reservationId),
  };
}
