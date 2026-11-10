import type { AppLocale } from "@/lib/i18n/locale";
import { escapeHtmlBasic } from "@/lib/email/escape-html";
import { DAY_MS } from "@/lib/reservations/expiry-config";

export type StatusEmailParams = {
  locale: AppLocale;
  customerName: string;
  orderId: string;
  bottlesOrdered: number;
  bottlesNeeded: number;
  amountSek: number | null;
  orderUrl: string;
  cancelUrl: string;
};

/** @deprecated Extension ask removed — kept for type imports during transition. */
export type ExtensionAskEmailParams = {
  locale: AppLocale;
  customerName: string;
  confirmUrl: string;
  replyDays: number;
  extensionDays: number;
  deadlineDate: Date;
  amountSek: number | null;
};

/** @deprecated Auto-cancel emails removed. */
export type ExpiryCancelledEmailParams = {
  locale: AppLocale;
  customerName: string;
  kind: "no_reply" | "max_age";
  maxAgeDays?: number | null;
};

const SITE = "https://pactwines.com";
export const TERMS_URL_SV = `${SITE}/villkor`;
export const TERMS_URL_EN = `${SITE}/terms`;

export const QUESTIONS_LINE_SV =
  "Frågor? Svara på detta mejl eller skriv till customer@pactwines.com.";
export const QUESTIONS_LINE_EN =
  "Questions? Reply to this email or write to customer@pactwines.com.";

export const STATUS_FOOTER_SV =
  "EURPACT OÜ, säljare på pactwines.com · customer@pactwines.com";
export const STATUS_FOOTER_EN =
  "EURPACT OÜ, seller at pactwines.com · customer@pactwines.com";

/** Swedish-style long date, e.g. "6 november 2026". */
export function formatExtensionDeadlineDate(
  date: Date,
  locale: AppLocale,
): string {
  return new Intl.DateTimeFormat(locale === "sv" ? "sv-SE" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Stockholm",
  }).format(date);
}

/** Order amount for email copy, e.g. "1 250 kr". */
export function formatReservedAmountSek(
  amountSek: number | null | undefined,
  locale: AppLocale,
): string {
  const n = Number(amountSek);
  if (!Number.isFinite(n) || n < 0) {
    return locale === "sv" ? "beloppet" : "the amount";
  }
  const formatted = new Intl.NumberFormat(
    locale === "sv" ? "sv-SE" : "en-GB",
    {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    },
  ).format(Math.round(n));
  return locale === "sv" ? `${formatted} kr` : `${formatted} SEK`;
}

export function termsUrlForLocale(locale: AppLocale): string {
  return locale === "sv" ? TERMS_URL_SV : TERMS_URL_EN;
}

export function statusEmailSubject(locale: AppLocale): string {
  return locale === "sv"
    ? "Läget för din PACT-pall"
    : "An update on your PACT pallet";
}

/** @deprecated */
export function extensionAskSubject(locale: AppLocale): string {
  return statusEmailSubject(locale);
}

/** @deprecated */
export function expiryCancelledSubject(
  locale: AppLocale,
  _kind: "no_reply" | "max_age",
): string {
  return locale === "sv"
    ? "Din order är avbruten – inget har dragits"
    : "Your order has been cancelled – nothing was charged";
}

export function buildStatusEmailText(p: StatusEmailParams): string {
  const name = p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi");
  const amount = formatReservedAmountSek(p.amountSek, p.locale);
  const orderId = p.orderId;
  const antal = Math.max(0, Math.floor(p.bottlesOrdered));
  const grans = Math.max(0, Math.floor(p.bottlesNeeded));

  if (p.locale === "sv") {
    return `Hej ${name},

Din order ${orderId} väntar fortfarande på att pallen ska fyllas. Just nu är ${antal} av ${grans} flaskor beställda.

Du behöver inte göra något. Din order ligger kvar tills pallen stänger, och först då dras ${amount} från ditt sparade kort. Vi mejlar dig när det händer.

Vill du inte vänta längre kan du avbryta utan kostnad fram till att pallen stänger.

Se din order: ${p.orderUrl}
Avbryt ordern: ${p.cancelUrl}

${STATUS_FOOTER_SV}`;
  }

  return `Hi ${name},

Your order ${orderId} is still waiting for the pallet to fill. Right now ${antal} of ${grans} bottles have been ordered.

You don't need to do anything. Your order stays in place until the pallet closes, and only then will ${amount} be charged to your saved card. We'll email you when that happens.

If you'd rather not wait, you can cancel free of charge until the pallet closes.

View your order: ${p.orderUrl}
Cancel order: ${p.cancelUrl}

${STATUS_FOOTER_EN}`;
}

export function buildStatusEmailHtml(p: StatusEmailParams): string {
  const name = escapeHtmlBasic(
    p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi"),
  );
  const amount = escapeHtmlBasic(
    formatReservedAmountSek(p.amountSek, p.locale),
  );
  const orderId = escapeHtmlBasic(p.orderId);
  const orderUrl = escapeHtmlBasic(p.orderUrl);
  const cancelUrl = escapeHtmlBasic(p.cancelUrl);
  const antal = Math.max(0, Math.floor(p.bottlesOrdered));
  const grans = Math.max(0, Math.floor(p.bottlesNeeded));

  if (p.locale === "sv") {
    return wrapEmail(
      "Läget för din PACT-pall",
      `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hej ${name},</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Din order ${orderId} väntar fortfarande på att pallen ska fyllas. Just nu är ${antal} av ${grans} flaskor beställda.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Du behöver inte göra något. Din order ligger kvar tills pallen stänger, och först då dras ${amount} från ditt sparade kort. Vi mejlar dig när det händer.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Vill du inte vänta längre kan du avbryta utan kostnad fram till att pallen stänger.</p>
<p style="margin:24px 0;">
  <a href="${orderUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;margin:0 8px 8px 0;">Se din order</a>
  <a href="${cancelUrl}" style="display:inline-block;background:#fff;color:#000;border:1px solid #000;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;margin:0 8px 8px 0;">Avbryt ordern</a>
</p>
<p style="color:#666;font-size:12px;line-height:1.6;margin:0;">${escapeHtmlBasic(STATUS_FOOTER_SV)}</p>`,
    );
  }

  return wrapEmail(
    "An update on your PACT pallet",
    `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hi ${name},</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Your order ${orderId} is still waiting for the pallet to fill. Right now ${antal} of ${grans} bottles have been ordered.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">You don't need to do anything. Your order stays in place until the pallet closes, and only then will ${amount} be charged to your saved card. We'll email you when that happens.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">If you'd rather not wait, you can cancel free of charge until the pallet closes.</p>
<p style="margin:24px 0;">
  <a href="${orderUrl}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;margin:0 8px 8px 0;">View your order</a>
  <a href="${cancelUrl}" style="display:inline-block;background:#fff;color:#000;border:1px solid #000;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;margin:0 8px 8px 0;">Cancel order</a>
</p>
<p style="color:#666;font-size:12px;line-height:1.6;margin:0;">${escapeHtmlBasic(STATUS_FOOTER_EN)}</p>`,
  );
}

/** @deprecated */
export function buildExtensionAskText(p: ExtensionAskEmailParams): string {
  return buildStatusEmailText({
    locale: p.locale,
    customerName: p.customerName,
    orderId: "—",
    bottlesOrdered: 0,
    bottlesNeeded: 0,
    amountSek: p.amountSek,
    orderUrl: p.confirmUrl,
    cancelUrl: p.confirmUrl,
  });
}

/** @deprecated */
export function buildExtensionAskHtml(p: ExtensionAskEmailParams): string {
  return buildStatusEmailHtml({
    locale: p.locale,
    customerName: p.customerName,
    orderId: "—",
    bottlesOrdered: 0,
    bottlesNeeded: 0,
    amountSek: p.amountSek,
    orderUrl: p.confirmUrl,
    cancelUrl: p.confirmUrl,
  });
}

/** @deprecated Auto-cancel copy removed. */
export function buildExpiryCancelledText(
  p: ExpiryCancelledEmailParams,
): string {
  const name = p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi");
  if (p.locale === "sv") {
    return `Hej ${name},\n\nDin order ligger kvar — vi avbokar den inte automatiskt längre.\n\n${QUESTIONS_LINE_SV}\n\n/PACT`;
  }
  return `Hi ${name},\n\nYour order stays in place — we no longer cancel automatically.\n\n${QUESTIONS_LINE_EN}\n\n/PACT`;
}

/** @deprecated */
export function buildExpiryCancelledHtml(
  p: ExpiryCancelledEmailParams,
): string {
  const text = buildExpiryCancelledText(p);
  const paragraphs = text
    .split(/\n\n+/)
    .map((block) => {
      const safe = escapeHtmlBasic(block).replace(/\n/g, "<br>");
      return `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">${safe}</p>`;
    })
    .join("");
  return wrapEmail(
    p.locale === "sv" ? "Orderstatus" : "Order status",
    paragraphs,
  );
}

/**
 * Friendly body when someone opens an old extension link.
 * Extension / confirmation is no longer required (Axel 2026-11-10).
 */
export function buildExtensionConfirmSuccessBody(opts: {
  locale: AppLocale;
  newEndDate?: Date;
  extensionDays?: number;
}): string {
  if (opts.locale === "sv") {
    return `Du behöver inte bekräfta något. Din order ligger kvar tills pallen stänger, och du kan avbryta utan kostnad fram till dess. Inget belopp dras förrän pallen når sin gräns.`;
  }
  return `You don't need to confirm anything. Your order stays in place until the pallet closes, and you can cancel free of charge until then. Nothing is charged until the pallet reaches its threshold.`;
}

export function extensionNewEndDate(
  confirmedAt: Date,
  extensionDays: number,
): Date {
  return new Date(confirmedAt.getTime() + extensionDays * DAY_MS);
}

/** Friendly chrome for the legacy extension confirmation page. */
export const EXTENSION_CONFIRM_PAGE_COPY = {
  sv: {
    title: "Ingen åtgärd behövs",
    cta: "Till pactwines.com",
  },
  en: {
    title: "No action needed",
    cta: "Go to pactwines.com",
  },
} as const;

/**
 * Old extension links must show a friendly message (not an error).
 * All codes map to the same reassuring copy.
 */
export const EXTENSION_CONFIRM_PAGE_ERROR_COPY = {
  sv: {
    title: "Ingen åtgärd behövs",
    missing_token:
      "Du behöver inte bekräfta något. Din order ligger kvar tills pallen stänger — avbryt när du vill via ditt konto.",
    not_found:
      "Du behöver inte bekräfta något. Din order ligger kvar tills pallen stänger — avbryt när du vill via ditt konto.",
    expired:
      "Du behöver inte bekräfta något. Din order ligger kvar tills pallen stänger — avbryt när du vill via ditt konto.",
    already_used:
      "Du behöver inte bekräfta något. Din order ligger kvar tills pallen stänger — avbryt när du vill via ditt konto.",
    db_error:
      "Du behöver inte bekräfta något. Din order ligger kvar tills pallen stänger. Mejla customer@pactwines.com om du har frågor.",
    not_eligible:
      "Du behöver inte bekräfta något. Din order ligger kvar tills pallen stänger — avbryt när du vill via ditt konto.",
  },
  en: {
    title: "No action needed",
    missing_token:
      "You don't need to confirm anything. Your order stays until the pallet closes — cancel any time from your account.",
    not_found:
      "You don't need to confirm anything. Your order stays until the pallet closes — cancel any time from your account.",
    expired:
      "You don't need to confirm anything. Your order stays until the pallet closes — cancel any time from your account.",
    already_used:
      "You don't need to confirm anything. Your order stays until the pallet closes — cancel any time from your account.",
    db_error:
      "You don't need to confirm anything. Your order stays until the pallet closes. Email customer@pactwines.com if you have questions.",
    not_eligible:
      "You don't need to confirm anything. Your order stays until the pallet closes — cancel any time from your account.",
  },
} as const;

function wrapEmail(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtmlBasic(title);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background-color:#f8f9fa;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;">
    <div style="background:#000;padding:28px 20px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:26px;font-weight:600;">PACT</h1>
    </div>
    <div style="padding:36px 20px;">${bodyHtml}</div>
    <div style="background:#f8f9fa;padding:16px;text-align:center;border-top:1px solid #e9ecef;">
      <p style="color:#666;font-size:12px;margin:0;">PACT · customer@pactwines.com</p>
    </div>
  </div>
</body>
</html>`;
}
