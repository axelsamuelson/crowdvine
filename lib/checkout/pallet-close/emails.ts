/**
 * Pallet-close transactional email builders (SV/EN).
 * Shared Inès template + Juliette legal footer via order-email-chrome.
 * Never auto-sends — callers claim via email_sends first.
 */

import {
  formatOrderAmountSek,
  inlineLinkHtml,
  orderCtaLabel,
  orderReservationsUrl,
  p,
  payNowCtaLabel,
  primaryButtonHtml,
  wrapOrderEmail,
  type OrderEmailLocale,
} from "@/lib/email/order-email-chrome";
import { escapeHtmlBasic } from "@/lib/email/escape-html";

export type PalletCloseEmailLocale = OrderEmailLocale;

const FUTURE_PALLETS_SV =
  "Vill du vara med på en kommande pall hittar du de öppna pallarna på pactwines.com.";
const FUTURE_PALLETS_EN =
  "If you’d like to join a future pallet, you’ll find the open pallets at pactwines.com.";

const DELIVERY_PROMISE_SV =
  "Vinet levereras normalt 2–3 veckor efter att pallen stängt, och alltid inom 30 dagar. Kommer det inte inom 30 dagar får du avbryta köpet och få tillbaka hela beloppet inom 14 dagar.";
const DELIVERY_PROMISE_EN =
  "The wine is normally delivered 2–3 weeks after the pallet closes, and always within 30 days. If it hasn’t arrived within 30 days, you may cancel the purchase and get the full amount back within 14 days.";

export function buildPalletClosedChargedEmail(opts: {
  locale: PalletCloseEmailLocale;
  customerName: string;
  reservationId: string;
  amountSek: number;
  /** @deprecated Internal pallet names must not appear in customer emails. */
  palletName?: string | null;
}): { subject: string; html: string; text: string } {
  const name = opts.customerName || (opts.locale === "sv" ? "du" : "there");
  const amount = formatOrderAmountSek(opts.amountSek, opts.locale);
  const orderUrl = orderReservationsUrl();
  const cta = orderCtaLabel(opts.locale);

  if (opts.locale === "sv") {
    const subject = "Pallen har stängt – betalningen är klar";
    const text = `Hej ${name},

Pallen har stängt och vi har debiterat ${amount} från ditt sparade kort.

${DELIVERY_PROMISE_SV}

Vi mejlar dig när pallen har skickats.

${cta}: ${orderUrl}
`;
    const html = wrapOrderEmail({
      locale: "sv",
      title: subject,
      orderId: opts.reservationId,
      bodyHtml: [
        p(`Hej ${escapeHtmlBasic(name)},`),
        p(
          `Pallen har stängt och vi har debiterat <strong>${escapeHtmlBasic(amount)}</strong> från ditt sparade kort.`,
        ),
        p(escapeHtmlBasic(DELIVERY_PROMISE_SV)),
        p("Vi mejlar dig när pallen har skickats."),
        `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
      ].join(""),
    });
    return { subject, html, text };
  }

  const subject = "The pallet has closed – payment complete";
  const text = `Hi ${name},

The pallet has closed and we charged ${amount} to your saved card.

${DELIVERY_PROMISE_EN}

We’ll email you when the pallet has shipped.

${cta}: ${orderUrl}
`;
  const html = wrapOrderEmail({
    locale: "en",
    title: subject,
    orderId: opts.reservationId,
    bodyHtml: [
      p(`Hi ${escapeHtmlBasic(name)},`),
      p(
        `The pallet has closed and we charged <strong>${escapeHtmlBasic(amount)}</strong> to your saved card.`,
      ),
      p(escapeHtmlBasic(DELIVERY_PROMISE_EN)),
      p("We’ll email you when the pallet has shipped."),
      `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
    ].join(""),
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
    const text = `Hej ${name},

Pallen är inte full och sista datumet har passerat. Svara senast ${opts.replyByLabel}:

1) Vänta längre (max 4 veckor till, samma pris, kostnadsfri avbokning): ${opts.waitUrl}
2) Avboka utan kostnad (kortet kopplas bort): ${opts.cancelUrl}
${direct ? `3) Byt till direktleverans (nytt erbjudande): ${direct}\n` : ""}
Om du inte svarar avbokas köpet utan kostnad.
`;
    const html = wrapOrderEmail({
      locale: "sv",
      title: subject,
      orderId: opts.reservationId,
      bodyHtml: `<p style="color:#111;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hej ${escapeHtmlBasic(name)},</p><p style="color:#111;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Pallen är inte full och sista datumet har passerat. Välj senast <strong>${escapeHtmlBasic(opts.replyByLabel)}</strong>:</p><ol style="color:#111;font-size:16px;line-height:1.6;"><li>${inlineLinkHtml(opts.waitUrl, "Vänta längre")} — max 4 veckor till, samma pris, kostnadsfri avbokning</li><li>${inlineLinkHtml(opts.cancelUrl, "Avboka utan kostnad")} — kortet kopplas bort</li>${direct ? `<li>${inlineLinkHtml(direct, "Byt till direktleverans")} — nytt erbjudande med nytt godkännande</li>` : ""}</ol><p style="color:#111;font-size:16px;line-height:1.6;margin:16px 0 0;">Om du inte svarar avbokas köpet utan kostnad.</p>`,
    });
    return { subject, html, text };
  }

  const subject = "Pallet deadline reached — choose how to continue";
  const text = `Hi ${name},

The pallet is not full and the last date has passed. Reply by ${opts.replyByLabel}:

1) Wait longer (up to 4 more weeks, same price, free cancel): ${opts.waitUrl}
2) Cancel at no cost (card detached): ${opts.cancelUrl}
${direct ? `3) Switch to direct delivery (new quote): ${direct}\n` : ""}
If you do not reply, the purchase is cancelled at no cost.
`;
  const html = wrapOrderEmail({
    locale: "en",
    title: subject,
    orderId: opts.reservationId,
    bodyHtml: `<p style="color:#111;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hi ${escapeHtmlBasic(name)},</p><p style="color:#111;font-size:16px;line-height:1.6;margin:0 0 16px 0;">The pallet is not full and the last date has passed. Choose by <strong>${escapeHtmlBasic(opts.replyByLabel)}</strong>:</p><ol style="color:#111;font-size:16px;line-height:1.6;"><li>${inlineLinkHtml(opts.waitUrl, "Wait longer")} — up to 4 more weeks, same price, free cancellation</li><li>${inlineLinkHtml(opts.cancelUrl, "Cancel at no cost")} — card is detached</li>${direct ? `<li>${inlineLinkHtml(direct, "Switch to direct delivery")} — new quote with new acceptance</li>` : ""}</ol><p style="color:#111;font-size:16px;line-height:1.6;margin:16px 0 0;">If you do not reply, the purchase is cancelled at no cost.</p>`,
  });
  return { subject, html, text };
}

/**
 * Cancel confirmation.
 * Coupons/discount codes are NOT restored on cancellation (only pending PACT
 * Points via reversePendingRedemption) — do not mention coupons or points here.
 */
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
  const orderUrl = orderReservationsUrl();
  const cta = orderCtaLabel(opts.locale);

  if (opts.locale === "sv") {
    const subject = "Din order är avbruten – inget har dragits";
    const why =
      opts.reason === "choice_timeout"
        ? "Vi fick inget svar inom 7 dagar."
        : opts.reason === "pay_link_timeout"
          ? "Betalningslänken gick ut."
          : opts.reason === "customer_cancel"
            ? "Vi har avbrutit din order som du bad om."
            : "Vi har avbrutit din order.";
    const text = `Hej ${name},

${why} Inget belopp har dragits från ditt kort, och det sparade kortet är borttaget.

${FUTURE_PALLETS_SV}

${cta}: ${orderUrl}
`;
    const html = wrapOrderEmail({
      locale: "sv",
      title: subject,
      orderId: opts.reservationId,
      bodyHtml: [
        p(`Hej ${escapeHtmlBasic(name)},`),
        p(
          `${escapeHtmlBasic(why)} Inget belopp har dragits från ditt kort, och det sparade kortet är borttaget.`,
        ),
        p(
          `Vill du vara med på en kommande pall hittar du de öppna pallarna på ${inlineLinkHtml("https://pactwines.com", "pactwines.com")}.`,
        ),
        `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
      ].join(""),
    });
    return { subject, html, text };
  }

  const subject = "Your order has been cancelled – nothing was charged";
  const why =
    opts.reason === "choice_timeout"
      ? "We did not receive a reply within 7 days."
      : opts.reason === "pay_link_timeout"
        ? "The payment link expired."
        : opts.reason === "customer_cancel"
          ? "We have cancelled your order as you asked."
          : "We have cancelled your order.";
  const text = `Hi ${name},

${why} Nothing was charged to your card, and the saved card has been removed.

${FUTURE_PALLETS_EN}

${cta}: ${orderUrl}
`;
  const html = wrapOrderEmail({
    locale: "en",
    title: subject,
    orderId: opts.reservationId,
    bodyHtml: [
      p(`Hi ${escapeHtmlBasic(name)},`),
      p(
        `${escapeHtmlBasic(why)} Nothing was charged to your card, and the saved card has been removed.`,
      ),
      p(
        `If you’d like to join a future pallet, you’ll find the open pallets at ${inlineLinkHtml("https://pactwines.com", "pactwines.com")}.`,
      ),
      `<p style="margin:24px 0;">${primaryButtonHtml(orderUrl, cta)}</p>`,
    ].join(""),
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
  const payLabel = payNowCtaLabel(opts.locale);

  if (opts.locale === "sv") {
    const subject = "Vi kunde inte dra betalningen";
    const text = `Hej ${name},

Pallen för din order har stängt, men vi kunde inte dra beloppet från ditt kort.

Du har till och med ${opts.payByLabel} (3 dagar) på dig att betala. Använd länken nedan för att godkänna betalningen eller byta kort. Vi försöker också dra beloppet igen under tiden.

Har betalningen inte gått igenom senast ${opts.payByLabel} avbryts ordern och inget dras.

${payLabel}: ${opts.paymentLinkUrl}
`;
    const html = wrapOrderEmail({
      locale: "sv",
      title: subject,
      orderId: opts.reservationId,
      bodyHtml: [
        p(`Hej ${escapeHtmlBasic(name)},`),
        p(
          "Pallen för din order har stängt, men vi kunde inte dra beloppet från ditt kort.",
        ),
        p(
          `Du har till och med <strong>${escapeHtmlBasic(opts.payByLabel)}</strong> (3 dagar) på dig att betala. Använd länken nedan för att godkänna betalningen eller byta kort. Vi försöker också dra beloppet igen under tiden.`,
        ),
        p(
          `Har betalningen inte gått igenom senast ${escapeHtmlBasic(opts.payByLabel)} avbryts ordern och inget dras.`,
        ),
        `<p style="margin:24px 0;">${primaryButtonHtml(opts.paymentLinkUrl, payLabel)}</p>`,
      ].join(""),
    });
    return { subject, html, text };
  }

  const subject = "We couldn't take payment";
  const text = `Hi ${name},

The pallet for your order has closed, but we couldn't charge your card.

You have until ${opts.payByLabel} (3 days) to pay. Use the link below to approve the payment or change card. We'll also try the charge again in the meantime.

If payment hasn't gone through by ${opts.payByLabel}, the order will be cancelled and nothing will be charged.

${payLabel}: ${opts.paymentLinkUrl}
`;
  const html = wrapOrderEmail({
    locale: "en",
    title: subject,
    orderId: opts.reservationId,
    bodyHtml: [
      p(`Hi ${escapeHtmlBasic(name)},`),
      p(
        "The pallet for your order has closed, but we couldn't charge your card.",
      ),
      p(
        `You have until <strong>${escapeHtmlBasic(opts.payByLabel)}</strong> (3 days) to pay. Use the link below to approve the payment or change card. We'll also try the charge again in the meantime.`,
      ),
      p(
        `If payment hasn't gone through by ${escapeHtmlBasic(opts.payByLabel)}, the order will be cancelled and nothing will be charged.`,
      ),
      `<p style="margin:24px 0;">${primaryButtonHtml(opts.paymentLinkUrl, payLabel)}</p>`,
    ].join(""),
  });
  return { subject, html, text };
}
