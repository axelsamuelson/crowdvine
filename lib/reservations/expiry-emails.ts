import type { AppLocale } from "@/lib/i18n/locale";
import { escapeHtmlBasic } from "@/lib/email/escape-html";
import { DAY_MS } from "@/lib/reservations/expiry-config";
import {
  cancelCtaLabel,
  formatOrderAmountSek,
  orderCtaLabel,
  orderEmailFooterLine,
  p,
  primaryButtonHtml,
  secondaryButtonHtml,
  wrapOrderEmail,
} from "@/lib/email/order-email-chrome";

export type StatusEmailParams = {
  locale: AppLocale;
  customerName: string;
  orderId: string;
  bottlesOrdered: number;
  bottlesNeeded: number;
  amountSek: number | null;
  orderUrl: string;
  cancelUrl: string;
  /** Show PACT Points line only when points used on the order (>0). */
  pointsUsed?: number | null;
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

/** Juliette legal footer (locale-correct). Prefer orderEmailFooterLine. */
export const STATUS_FOOTER_SV =
  "Säljare: EURPACT OÜ (reg.nr 17538270), Tartu mnt 67/1-13b, 10115 Tallinn, Estland · customer@pactwines.com";
export const STATUS_FOOTER_EN =
  "Seller: EURPACT OÜ (reg. no. 17538270), Tartu mnt 67/1-13b, 10115 Tallinn, Estonia · customer@pactwines.com";

/** @deprecated Use formatOrderAmountSek from order-email-chrome. */
export function formatReservedAmountSek(
  amountSek: number | null | undefined,
  locale: AppLocale,
): string {
  return formatOrderAmountSek(amountSek, locale === "en" ? "en" : "sv");
}

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

export function termsUrlForLocale(locale: AppLocale): string {
  return locale === "sv" ? TERMS_URL_SV : TERMS_URL_EN;
}

export function statusEmailSubject(locale: AppLocale): string {
  return locale === "sv"
    ? "Pallen fylls fortfarande"
    : "Your pallet is still filling up";
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

function pointsLine(
  locale: AppLocale,
  pointsUsed: number | null | undefined,
): string | null {
  const n = Number(pointsUsed);
  if (!Number.isFinite(n) || n <= 0) return null;
  const pts = Math.floor(n);
  if (locale === "sv") {
    return `Du använder ${pts} PACT Points på den här ordern.`;
  }
  return `You’re using ${pts} PACT Points on this order.`;
}

export function buildStatusEmailText(pParams: StatusEmailParams): string {
  const name =
    pParams.customerName.trim() || (pParams.locale === "sv" ? "hej" : "hi");
  const amount = formatOrderAmountSek(
    pParams.amountSek,
    pParams.locale === "en" ? "en" : "sv",
  );
  const orderId = pParams.orderId;
  const antal = Math.max(0, Math.floor(pParams.bottlesOrdered));
  const grans = Math.max(0, Math.floor(pParams.bottlesNeeded));
  const points = pointsLine(pParams.locale, pParams.pointsUsed);
  const footer = orderEmailFooterLine(
    pParams.locale === "en" ? "en" : "sv",
    orderId,
  );
  const orderCta = orderCtaLabel(pParams.locale === "en" ? "en" : "sv");
  const cancelCta = cancelCtaLabel(pParams.locale === "en" ? "en" : "sv");

  if (pParams.locale === "sv") {
    return `Hej ${name},

Din order ${orderId} väntar fortfarande på att pallen ska fyllas. Just nu är ${antal} av ${grans} flaskor beställda.
${points ? `\n${points}\n` : ""}
Du behöver inte göra något. Din order ligger kvar tills pallen stänger, och först då dras ${amount} från ditt sparade kort. Vi mejlar dig när det händer.

Vill du inte vänta längre kan du avbryta utan kostnad tills pallen stänger.

${orderCta}: ${pParams.orderUrl}
${cancelCta}: ${pParams.cancelUrl}

${footer}`;
  }

  return `Hi ${name},

Your order ${orderId} is still waiting for the pallet to fill. Right now ${antal} of ${grans} bottles have been ordered.
${points ? `\n${points}\n` : ""}
You don't need to do anything. Your order stays in place until the pallet closes, and only then will ${amount} be charged to your saved card. We'll email you when that happens.

If you'd rather not wait, you can cancel free of charge until the pallet closes.

${orderCta}: ${pParams.orderUrl}
${cancelCta}: ${pParams.cancelUrl}

${footer}`;
}

export function buildStatusEmailHtml(pParams: StatusEmailParams): string {
  const locale = pParams.locale === "en" ? "en" : "sv";
  const name = escapeHtmlBasic(
    pParams.customerName.trim() || (locale === "sv" ? "hej" : "hi"),
  );
  const amount = escapeHtmlBasic(
    formatOrderAmountSek(pParams.amountSek, locale),
  );
  const orderId = escapeHtmlBasic(pParams.orderId);
  const antal = Math.max(0, Math.floor(pParams.bottlesOrdered));
  const grans = Math.max(0, Math.floor(pParams.bottlesNeeded));
  const points = pointsLine(pParams.locale, pParams.pointsUsed);
  const title = statusEmailSubject(pParams.locale);
  const orderCta = orderCtaLabel(locale);
  const cancelCta = cancelCtaLabel(locale);

  if (locale === "sv") {
    return wrapOrderEmail({
      locale: "sv",
      title,
      orderId: pParams.orderId,
      bodyHtml: [
        p(`Hej ${name},`),
        p(
          `Din order ${orderId} väntar fortfarande på att pallen ska fyllas. Just nu är ${antal} av ${grans} flaskor beställda.`,
        ),
        points ? p(escapeHtmlBasic(points)) : "",
        p(
          `Du behöver inte göra något. Din order ligger kvar tills pallen stänger, och först då dras ${amount} från ditt sparade kort. Vi mejlar dig när det händer.`,
        ),
        p(
          "Vill du inte vänta längre kan du avbryta utan kostnad tills pallen stänger.",
        ),
        `<p style="margin:24px 0;">${primaryButtonHtml(pParams.orderUrl, orderCta)}${secondaryButtonHtml(pParams.cancelUrl, cancelCta)}</p>`,
      ].join(""),
    });
  }

  return wrapOrderEmail({
    locale: "en",
    title,
    orderId: pParams.orderId,
    bodyHtml: [
      p(`Hi ${name},`),
      p(
        `Your order ${orderId} is still waiting for the pallet to fill. Right now ${antal} of ${grans} bottles have been ordered.`,
      ),
      points ? p(escapeHtmlBasic(points)) : "",
      p(
        `You don't need to do anything. Your order stays in place until the pallet closes, and only then will ${amount} be charged to your saved card. We'll email you when that happens.`,
      ),
      p(
        "If you'd rather not wait, you can cancel free of charge until the pallet closes.",
      ),
      `<p style="margin:24px 0;">${primaryButtonHtml(pParams.orderUrl, orderCta)}${secondaryButtonHtml(pParams.cancelUrl, cancelCta)}</p>`,
    ].join(""),
  });
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
  params: ExpiryCancelledEmailParams,
): string {
  const name =
    params.customerName.trim() || (params.locale === "sv" ? "hej" : "hi");
  if (params.locale === "sv") {
    return `Hej ${name},\n\nDin order ligger kvar — vi avbokar den inte automatiskt längre.\n\n${QUESTIONS_LINE_SV}\n\n/PACT`;
  }
  return `Hi ${name},\n\nYour order stays in place — we no longer cancel automatically.\n\n${QUESTIONS_LINE_EN}\n\n/PACT`;
}

/** @deprecated */
export function buildExpiryCancelledHtml(
  params: ExpiryCancelledEmailParams,
): string {
  const text = buildExpiryCancelledText(params);
  const paragraphs = text
    .split(/\n\n+/)
    .map((block) => {
      const safe = escapeHtmlBasic(block).replace(/\n/g, "<br>");
      return p(safe);
    })
    .join("");
  return wrapOrderEmail({
    locale: params.locale === "en" ? "en" : "sv",
    title: params.locale === "sv" ? "Orderstatus" : "Order status",
    orderId: "—",
    bodyHtml: paragraphs,
  });
}

/** Exact body for legacy /reservation-extension/confirm links. */
export const EXTENSION_LEGACY_LINK_BODY = {
  sv: "Din order ligger kvar tills pallen stänger. Du behöver inte göra något.",
  en: "Your order stays in place until the pallet closes. You don't need to do anything.",
} as const;

/**
 * Friendly body when someone opens an old extension link.
 * Extension / confirmation is no longer required (Axel 2026-11-10).
 */
export function buildExtensionConfirmSuccessBody(opts: {
  locale: AppLocale;
  newEndDate?: Date;
  extensionDays?: number;
}): string {
  return EXTENSION_LEGACY_LINK_BODY[opts.locale];
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
    body: EXTENSION_LEGACY_LINK_BODY.sv,
    orderCta: "Se din order",
    cancelCta: "Avbryt ordern",
    cta: "Se din order",
  },
  en: {
    title: "No action needed",
    body: EXTENSION_LEGACY_LINK_BODY.en,
    orderCta: "View your order",
    cancelCta: "Cancel order",
    cta: "View your order",
  },
} as const;

/**
 * Old extension links must show a friendly message (not an error).
 * All codes map to the same reassuring copy.
 */
export const EXTENSION_CONFIRM_PAGE_ERROR_COPY = {
  sv: {
    title: "Ingen åtgärd behövs",
    missing_token: EXTENSION_LEGACY_LINK_BODY.sv,
    not_found: EXTENSION_LEGACY_LINK_BODY.sv,
    expired: EXTENSION_LEGACY_LINK_BODY.sv,
    already_used: EXTENSION_LEGACY_LINK_BODY.sv,
    db_error: EXTENSION_LEGACY_LINK_BODY.sv,
    not_eligible: EXTENSION_LEGACY_LINK_BODY.sv,
  },
  en: {
    title: "No action needed",
    missing_token: EXTENSION_LEGACY_LINK_BODY.en,
    not_found: EXTENSION_LEGACY_LINK_BODY.en,
    expired: EXTENSION_LEGACY_LINK_BODY.en,
    already_used: EXTENSION_LEGACY_LINK_BODY.en,
    db_error: EXTENSION_LEGACY_LINK_BODY.en,
    not_eligible: EXTENSION_LEGACY_LINK_BODY.en,
  },
} as const;
