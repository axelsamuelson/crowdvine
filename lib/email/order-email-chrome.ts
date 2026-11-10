/**
 * Shared chrome for PACT customer order emails (Inès template + Juliette footer).
 * White background, centred PACT wordmark, Geist stack, #0A0A0A primary CTA (4px).
 */

import { escapeHtmlBasic } from "@/lib/email/escape-html";

export type OrderEmailLocale = "sv" | "en";

/** Production customer site — never localhost in transactional mail. */
export const PACT_PUBLIC_SITE = "https://pactwines.com";

/**
 * Base URL for links inside customer emails.
 * Root cause of localhost in charged/shipped: getAppUrl() falls back to
 * http://localhost:3000 when NODE_ENV !== "production" and env is unset.
 * Emails must never use that fallback.
 */
export function getEmailAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    const cleaned = explicit.replace(/\/$/, "");
    if (!/localhost|127\.0\.0\.1/i.test(cleaned)) {
      return cleaned;
    }
  }
  if (process.env.VERCEL_ENV === "production") {
    return PACT_PUBLIC_SITE;
  }
  // Preview / local / missing env: still production domain in customer mail.
  return PACT_PUBLIC_SITE;
}

export function orderReservationsUrl(): string {
  return `${getEmailAppUrl()}/profile/reservations`;
}

/** SV "1 250 kr" (narrow NBSP), EN "SEK 1,250". */
export function formatOrderAmountSek(
  amountSek: number | null | undefined,
  locale: OrderEmailLocale,
): string {
  const n = Number(amountSek);
  if (!Number.isFinite(n) || n < 0) {
    return locale === "sv" ? "beloppet" : "the amount";
  }
  const rounded = Math.round(n);
  if (locale === "sv") {
    const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, "\u202F");
    return `${grouped} kr`;
  }
  const grouped = String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `SEK ${grouped}`;
}

export function orderEmailFooterLine(
  locale: OrderEmailLocale,
  orderId: string,
): string {
  if (locale === "sv") {
    return `Säljare: EURPACT OÜ (reg.nr 17538270), Tartu mnt 67/1-13b, 10115 Tallinn, Estland · customer@pactwines.com · Order ${orderId}`;
  }
  return `Seller: EURPACT OÜ (reg. no. 17538270), Tartu mnt 67/1-13b, 10115 Tallinn, Estonia · customer@pactwines.com · Order ${orderId}`;
}

const FONT =
  "Geist,ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

export function primaryButtonHtml(href: string, label: string): string {
  return `<a href="${escapeHtmlBasic(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;background:#0A0A0A;color:#ffffff;text-decoration:none;border-radius:4px;font-size:16px;font-weight:500;">${escapeHtmlBasic(label)}</a>`;
}

export function secondaryButtonHtml(href: string, label: string): string {
  return `<a href="${escapeHtmlBasic(href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;background:#ffffff;color:#0A0A0A;border:1px solid #0A0A0A;text-decoration:none;border-radius:4px;font-size:16px;font-weight:500;">${escapeHtmlBasic(label)}</a>`;
}

export function inlineLinkHtml(href: string, label: string): string {
  return `<a href="${escapeHtmlBasic(href)}" style="color:#0A0A0A;text-decoration:underline;">${escapeHtmlBasic(label)}</a>`;
}

export function orderCtaLabel(locale: OrderEmailLocale): string {
  return locale === "sv" ? "Se din order" : "View your order";
}

export function cancelCtaLabel(locale: OrderEmailLocale): string {
  return locale === "sv" ? "Avbryt ordern" : "Cancel order";
}

export function payNowCtaLabel(locale: OrderEmailLocale): string {
  return locale === "sv" ? "Betala nu" : "Pay now";
}

const P_STYLE =
  "color:#111;font-size:16px;line-height:1.6;margin:0 0 16px 0;";

export function p(html: string): string {
  return `<p style="${P_STYLE}">${html}</p>`;
}

/**
 * Full HTML document for all PACT order emails.
 * Footer appears once (locale-correct); EN never gets a Swedish footer.
 */
export function wrapOrderEmail(opts: {
  locale: OrderEmailLocale;
  title: string;
  bodyHtml: string;
  orderId: string;
}): string {
  const title = escapeHtmlBasic(opts.title);
  const footer = escapeHtmlBasic(
    orderEmailFooterLine(opts.locale, opts.orderId),
  );
  return `<!DOCTYPE html>
<html lang="${opts.locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:${FONT};color:#111;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="padding:32px 24px 8px;text-align:center;letter-spacing:2px;font-weight:600;font-size:18px;">PACT</div>
    <div style="padding:8px 28px 32px;">
      <h1 style="font-size:22px;font-weight:500;margin:0 0 16px;color:#111;line-height:1.3;">${title}</h1>
      ${opts.bodyHtml}
      <p style="margin-top:28px;font-size:12px;line-height:1.5;color:#666;">${footer}</p>
    </div>
  </div>
</body>
</html>`;
}

/** Compact "12–18 maj" / "12–18 May" when same month; else "28 maj–3 juni". */
export function formatDeliveryWindowLabel(
  locale: OrderEmailLocale,
  startRaw: string,
  endRaw: string,
): string {
  const start = parseLooseDate(startRaw);
  const end = parseLooseDate(endRaw);
  if (!start || !end) {
    const s = String(startRaw).trim();
    const e = String(endRaw).trim();
    if (s && e && s !== e) return `${s}–${e}`;
    return s || e;
  }

  const loc = locale === "sv" ? "sv-SE" : "en-GB";
  const day = new Intl.DateTimeFormat(loc, {
    day: "numeric",
    timeZone: "Europe/Stockholm",
  });
  const month = new Intl.DateTimeFormat(loc, {
    month: "long",
    timeZone: "Europe/Stockholm",
  });
  const startDay = day.format(start);
  const endDay = day.format(end);
  const startMonth = month.format(start);
  const endMonth = month.format(end);
  const sameMonth =
    start.toLocaleString("en-CA", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
    }) ===
    end.toLocaleString("en-CA", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit",
    });

  if (sameMonth) {
    return `${startDay}–${endDay} ${startMonth}`;
  }
  return `${startDay} ${startMonth}–${endDay} ${endMonth}`;
}

function parseLooseDate(raw: string): Date | null {
  const s = String(raw).trim();
  if (!s) return null;
  // ISO date or datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.length === 10 ? `${s}T12:00:00+02:00` : s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}
