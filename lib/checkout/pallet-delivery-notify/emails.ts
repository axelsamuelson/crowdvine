/**
 * Post-close delivery transactional emails (SV/EN).
 * Same shell/template style as pallet-close emails.
 * Never auto-sends — callers claim via email_sends first.
 */

import { getAppUrl } from "@/lib/app-url";

export type PalletDeliveryEmailLocale = "sv" | "en";

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shell(opts: {
  title: string;
  bodyHtml: string;
  reservationId: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Geist,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111;">
  <div style="max-width:600px;margin:0 auto;background:#fff;">
    <div style="padding:32px 24px 8px;text-align:center;letter-spacing:2px;font-weight:600;">PACT</div>
    <div style="padding:8px 28px 32px;">
      <h1 style="font-size:22px;font-weight:500;margin:0 0 16px;">${esc(opts.title)}</h1>
      ${opts.bodyHtml}
      <p style="margin-top:28px;font-size:12px;color:#666;">Säljare: EURPACT OÜ (reg. 17538270), Estland<br/>Reservation ${esc(opts.reservationId)}</p>
    </div>
  </div>
</body>
</html>`;
}

function formatWindowLabel(
  locale: PalletDeliveryEmailLocale,
  start: string,
  end: string,
): string {
  const s = String(start).trim();
  const e = String(end).trim();
  if (s && e && s !== e) {
    return locale === "sv" ? `${s}–${e}` : `${s}–${e}`;
  }
  return s || e;
}

/** (1) Pallen har skickats — estimated delivery window. */
export function buildPalletShippedEmail(opts: {
  locale: PalletDeliveryEmailLocale;
  customerName: string;
  reservationId: string;
  windowStart: string;
  windowEnd: string;
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const window = formatWindowLabel(opts.locale, opts.windowStart, opts.windowEnd);
  const pallet =
    opts.palletName && opts.palletName.trim() ? opts.palletName.trim() : null;

  if (opts.locale === "sv") {
    const subject = "Pallen har skickats";
    const text = `Hej ${name},\n\nPallen har skickats${pallet ? ` (${pallet})` : ""}. Beräknat leveransfönster: ${window}.\n\nDu får leveransdagen när vinet nått Sverige.\n`;
    const html = shell({
      title: subject,
      reservationId: opts.reservationId,
      bodyHtml: `<p>Hej ${esc(name)},</p><p>Pallen har skickats${pallet ? ` (${esc(pallet)})` : ""}.</p><p>Beräknat leveransfönster: <strong>${esc(window)}</strong>.</p><p>Du får leveransdagen när vinet nått Sverige.</p><p><a href="${esc(getAppUrl())}/profile/reservations" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Visa reservation</a></p>`,
    });
    return { subject, html, text };
  }

  const subject = "The pallet has shipped";
  const text = `Hi ${name},\n\nThe pallet has shipped${pallet ? ` (${pallet})` : ""}. Estimated delivery window: ${window}.\n\nYou'll get the delivery day once the wine has reached Sweden.\n`;
  const html = shell({
    title: subject,
    reservationId: opts.reservationId,
    bodyHtml: `<p>Hi ${esc(name)},</p><p>The pallet has shipped${pallet ? ` (${esc(pallet)})` : ""}.</p><p>Estimated delivery window: <strong>${esc(window)}</strong>.</p><p>You'll get the delivery day once the wine has reached Sweden.</p><p><a href="${esc(getAppUrl())}/profile/reservations" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">View reservation</a></p>`,
  });
  return { subject, html, text };
}

/** (2) Leveransdag — delivery day after arrived in Sweden. */
export function buildPalletDeliveryDayEmail(opts: {
  locale: PalletDeliveryEmailLocale;
  customerName: string;
  reservationId: string;
  deliveryDayLabel: string;
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const day = String(opts.deliveryDayLabel).trim();
  const pallet =
    opts.palletName && opts.palletName.trim() ? opts.palletName.trim() : null;

  if (opts.locale === "sv") {
    const subject = "Leveransdag";
    const text = `Hej ${name},\n\nVinet har nått Sverige${pallet ? ` (${pallet})` : ""}. Leveransdag: ${day}.\n`;
    const html = shell({
      title: subject,
      reservationId: opts.reservationId,
      bodyHtml: `<p>Hej ${esc(name)},</p><p>Vinet har nått Sverige${pallet ? ` (${esc(pallet)})` : ""}.</p><p>Leveransdag: <strong>${esc(day)}</strong>.</p><p><a href="${esc(getAppUrl())}/profile/reservations" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Visa reservation</a></p>`,
    });
    return { subject, html, text };
  }

  const subject = "Delivery day";
  const text = `Hi ${name},\n\nThe wine has reached Sweden${pallet ? ` (${pallet})` : ""}. Delivery day: ${day}.\n`;
  const html = shell({
    title: subject,
    reservationId: opts.reservationId,
    bodyHtml: `<p>Hi ${esc(name)},</p><p>The wine has reached Sweden${pallet ? ` (${esc(pallet)})` : ""}.</p><p>Delivery day: <strong>${esc(day)}</strong>.</p><p><a href="${esc(getAppUrl())}/profile/reservations" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">View reservation</a></p>`,
  });
  return { subject, html, text };
}

/** Delay notice — new expected date; optional late-cancel link. */
export function buildPalletDeliveryDelayEmail(opts: {
  locale: PalletDeliveryEmailLocale;
  customerName: string;
  reservationId: string;
  expectedDateLabel: string;
  cancelForRefundUrl?: string | null;
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const date = String(opts.expectedDateLabel).trim();
  const cancelUrl =
    opts.cancelForRefundUrl && opts.cancelForRefundUrl.trim()
      ? opts.cancelForRefundUrl.trim()
      : null;
  const pallet =
    opts.palletName && opts.palletName.trim() ? opts.palletName.trim() : null;

  if (opts.locale === "sv") {
    const subject = "Ny beräknad leveransdag";
    const cancelText = cancelUrl
      ? `\nEftersom det gått mer än 30 dagar sedan pallen stängde kan du avboka med full återbetalning (återbetalning inom 14 dagar):\n${cancelUrl}\n`
      : "";
    const text = `Hej ${name},\n\nLeveransen är försenad${pallet ? ` (${pallet})` : ""}. Ny beräknad leveransdag: ${date}.${cancelText}`;
    const cancelHtml = cancelUrl
      ? `<p>Eftersom det gått mer än 30 dagar sedan pallen stängde kan du <a href="${esc(cancelUrl)}">avboka med full återbetalning</a> (återbetalning inom 14 dagar).</p>`
      : "";
    const html = shell({
      title: subject,
      reservationId: opts.reservationId,
      bodyHtml: `<p>Hej ${esc(name)},</p><p>Leveransen är försenad${pallet ? ` (${esc(pallet)})` : ""}.</p><p>Ny beräknad leveransdag: <strong>${esc(date)}</strong>.</p>${cancelHtml}`,
    });
    return { subject, html, text };
  }

  const subject = "Updated expected delivery date";
  const cancelText = cancelUrl
    ? `\nBecause more than 30 days have passed since the pallet closed, you can cancel for a full refund (refund within 14 days):\n${cancelUrl}\n`
    : "";
  const text = `Hi ${name},\n\nDelivery is delayed${pallet ? ` (${pallet})` : ""}. New expected delivery date: ${date}.${cancelText}`;
  const cancelHtml = cancelUrl
    ? `<p>Because more than 30 days have passed since the pallet closed, you can <a href="${esc(cancelUrl)}">cancel for a full refund</a> (refund within 14 days).</p>`
    : "";
  const html = shell({
    title: subject,
    reservationId: opts.reservationId,
    bodyHtml: `<p>Hi ${esc(name)},</p><p>Delivery is delayed${pallet ? ` (${esc(pallet)})` : ""}.</p><p>New expected delivery date: <strong>${esc(date)}</strong>.</p>${cancelHtml}`,
  });
  return { subject, html, text };
}
