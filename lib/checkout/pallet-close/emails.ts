/**
 * Pallet-close transactional email builders (SV/EN).
 * Uses existing Resend transport via sendgrid-service helpers.
 * Never auto-sends — callers claim via email_sends first.
 */

import { getAppUrl } from "@/lib/app-url";

export type PalletCloseEmailLocale = "sv" | "en";

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

export function buildPalletClosedChargedEmail(opts: {
  locale: PalletCloseEmailLocale;
  customerName: string;
  reservationId: string;
  amountSek: number;
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const amount = Math.round(opts.amountSek);
  if (opts.locale === "sv") {
    const subject = "Pallen stängde — betalning genomförd";
    const text = `Hej ${name},\n\nPallen har stängt och vi har debiterat ${amount} kr från ditt sparade kort${opts.palletName ? ` (${opts.palletName})` : ""}.\n\nTack för att du handlar med PACT.\n`;
    const html = shell({
      title: subject,
      reservationId: opts.reservationId,
      bodyHtml: `<p>Hej ${esc(name)},</p><p>Pallen har stängt och vi har debiterat <strong>${amount} kr</strong> från ditt sparade kort${opts.palletName ? ` (${esc(opts.palletName)})` : ""}.</p><p><a href="${esc(getAppUrl())}/profile/reservations" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Visa reservation</a></p>`,
    });
    return { subject, html, text };
  }
  const subject = "Pallet closed — payment completed";
  const text = `Hi ${name},\n\nThe pallet has closed and we charged ${amount} kr to your saved card${opts.palletName ? ` (${opts.palletName})` : ""}.\n\nThank you for shopping with PACT.\n`;
  const html = shell({
    title: subject,
    reservationId: opts.reservationId,
    bodyHtml: `<p>Hi ${esc(name)},</p><p>The pallet has closed and we charged <strong>${amount} kr</strong> to your saved card${opts.palletName ? ` (${esc(opts.palletName)})` : ""}.</p><p><a href="${esc(getAppUrl())}/profile/reservations" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">View reservation</a></p>`,
  });
  return { subject, html, text };
}

export function buildPalletCloseChoiceEmail(opts: {
  locale: PalletCloseEmailLocale;
  customerName: string;
  reservationId: string;
  replyByLabel: string;
  waitUrl: string;
  cancelUrl: string;
  switchDirectUrl?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const direct =
    opts.switchDirectUrl && opts.switchDirectUrl.trim()
      ? opts.switchDirectUrl.trim()
      : null;

  if (opts.locale === "sv") {
    const subject = "Pallen nådde sista datumet — välj hur du vill gå vidare";
    const text = `Hej ${name},\n\nPallen är inte full och sista datumet har passerat. Svara senast ${opts.replyByLabel}:\n\n1) Vänta längre (max 4 veckor till, samma pris, kostnadsfri avbokning): ${opts.waitUrl}\n2) Avboka utan kostnad (kortet kopplas bort): ${opts.cancelUrl}\n${direct ? `3) Byt till direktleverans (nytt erbjudande): ${direct}\n` : ""}\nOm du inte svarar avbokas köpet utan kostnad.\n`;
    const html = shell({
      title: subject,
      reservationId: opts.reservationId,
      bodyHtml: `<p>Hej ${esc(name)},</p><p>Pallen är inte full och sista datumet har passerat. Välj senast <strong>${esc(opts.replyByLabel)}</strong>:</p><ol><li><a href="${esc(opts.waitUrl)}">Vänta längre</a> — max 4 veckor till, samma pris, kostnadsfri avbokning</li><li><a href="${esc(opts.cancelUrl)}">Avboka utan kostnad</a> — kortet kopplas bort</li>${direct ? `<li><a href="${esc(direct)}">Byt till direktleverans</a> — nytt erbjudande med nytt godkännande</li>` : ""}</ol><p>Om du inte svarar avbokas köpet utan kostnad.</p>`,
    });
    return { subject, html, text };
  }

  const subject = "Pallet deadline reached — choose how to continue";
  const text = `Hi ${name},\n\nThe pallet is not full and the last date has passed. Reply by ${opts.replyByLabel}:\n\n1) Wait longer (up to 4 more weeks, same price, free cancel): ${opts.waitUrl}\n2) Cancel at no cost (card detached): ${opts.cancelUrl}\n${direct ? `3) Switch to direct delivery (new quote): ${direct}\n` : ""}\nIf you do not reply, the purchase is cancelled at no cost.\n`;
  const html = shell({
    title: subject,
    reservationId: opts.reservationId,
    bodyHtml: `<p>Hi ${esc(name)},</p><p>The pallet is not full and the last date has passed. Choose by <strong>${esc(opts.replyByLabel)}</strong>:</p><ol><li><a href="${esc(opts.waitUrl)}">Wait longer</a> — up to 4 more weeks, same price, free cancellation</li><li><a href="${esc(opts.cancelUrl)}">Cancel at no cost</a> — card is detached</li>${direct ? `<li><a href="${esc(direct)}">Switch to direct delivery</a> — new quote with new acceptance</li>` : ""}</ol><p>If you do not reply, the purchase is cancelled at no cost.</p>`,
  });
  return { subject, html, text };
}

export function buildPalletCloseCancelledEmail(opts: {
  locale: PalletCloseEmailLocale;
  customerName: string;
  reservationId: string;
  reason:
    | "customer_cancel"
    | "choice_timeout"
    | "pay_link_timeout"
    | "other";
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  if (opts.locale === "sv") {
    const subject = "Reservation avbokad — ingen debitering";
    const why =
      opts.reason === "choice_timeout"
        ? "Vi fick inget svar inom 7 dagar."
        : opts.reason === "pay_link_timeout"
          ? "Betalningslänken gick ut."
          : opts.reason === "customer_cancel"
            ? "Du valde att avboka."
            : "Reservationen avbokades.";
    const text = `Hej ${name},\n\n${why} Ingen debitering har skett och det sparade kortet har kopplats bort.\n`;
    const html = shell({
      title: subject,
      reservationId: opts.reservationId,
      bodyHtml: `<p>Hej ${esc(name)},</p><p>${esc(why)} Ingen debitering har skett och det sparade kortet har kopplats bort.</p>`,
    });
    return { subject, html, text };
  }
  const subject = "Reservation cancelled — no charge";
  const why =
    opts.reason === "choice_timeout"
      ? "We did not receive a reply within 7 days."
      : opts.reason === "pay_link_timeout"
        ? "The payment link expired."
        : opts.reason === "customer_cancel"
          ? "You chose to cancel."
          : "The reservation was cancelled.";
  const text = `Hi ${name},\n\n${why} No charge was made and the saved card was detached.\n`;
  const html = shell({
    title: subject,
    reservationId: opts.reservationId,
    bodyHtml: `<p>Hi ${esc(name)},</p><p>${esc(why)} No charge was made and the saved card was detached.</p>`,
  });
  return { subject, html, text };
}

export function buildPalletClosePaymentFailedEmail(opts: {
  locale: PalletCloseEmailLocale;
  customerName: string;
  reservationId: string;
  payByLabel: string;
  paymentLinkUrl: string;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  if (opts.locale === "sv") {
    const subject = "Betalningen misslyckades — betala inom 3 dagar";
    const text = `Hej ${name},\n\nVi kunde inte debitera ditt sparade kort när pallen stängde. Betala senast ${opts.payByLabel} via länken:\n${opts.paymentLinkUrl}\n\nAnnars avbokas reservationen utan kostnad.\n`;
    const html = shell({
      title: subject,
      reservationId: opts.reservationId,
      bodyHtml: `<p>Hej ${esc(name)},</p><p>Vi kunde inte debitera ditt sparade kort när pallen stängde. Betala senast <strong>${esc(opts.payByLabel)}</strong>:</p><p><a href="${esc(opts.paymentLinkUrl)}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Betala nu</a></p><p>Annars avbokas reservationen utan kostnad.</p>`,
    });
    return { subject, html, text };
  }
  const subject = "Payment failed — pay within 3 days";
  const text = `Hi ${name},\n\nWe could not charge your saved card when the pallet closed. Please pay by ${opts.payByLabel}:\n${opts.paymentLinkUrl}\n\nOtherwise the reservation is cancelled at no cost.\n`;
  const html = shell({
    title: subject,
    reservationId: opts.reservationId,
    bodyHtml: `<p>Hi ${esc(name)},</p><p>We could not charge your saved card when the pallet closed. Please pay by <strong>${esc(opts.payByLabel)}</strong>:</p><p><a href="${esc(opts.paymentLinkUrl)}" style="display:inline-block;margin-top:8px;padding:10px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">Pay now</a></p><p>Otherwise the reservation is cancelled at no cost.</p>`,
  });
  return { subject, html, text };
}
