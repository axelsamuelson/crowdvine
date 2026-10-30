import type { AppLocale } from "@/lib/i18n/locale";
import { escapeHtmlBasic } from "@/lib/email/escape-html";
import { DAY_MS } from "@/lib/reservations/expiry-config";

export type ExtensionAskEmailParams = {
  locale: AppLocale;
  customerName: string;
  confirmUrl: string;
  replyDays: number;
  extensionDays: number;
  /** Concrete reply deadline (e.g. replyBy from the ask). */
  deadlineDate: Date;
  /** Reserved total in SEK (order_reservations.total_sek). */
  amountSek: number | null;
};

export type ExpiryCancelledEmailParams = {
  locale: AppLocale;
  customerName: string;
  /** no_reply | max_age (max_age only when an optional cap is configured) */
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

/** Reserved amount for email copy, e.g. "1 250 kr". */
export function formatReservedAmountSek(
  amountSek: number | null | undefined,
  locale: AppLocale,
): string {
  const n = Number(amountSek);
  if (!Number.isFinite(n) || n < 0) {
    return locale === "sv" ? "det reserverade beloppet" : "the reserved amount";
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

export function extensionAskSubject(locale: AppLocale): string {
  return locale === "sv"
    ? "Vill du ge din PACT-reservation 30 dagar till?"
    : "Do you want to give your PACT reservation 30 more days?";
}

export function expiryCancelledSubject(
  locale: AppLocale,
  kind: "no_reply" | "max_age",
): string {
  if (locale === "sv") {
    return kind === "max_age"
      ? "Din PACT-reservation har avslutats (köpvillkor p. 3)"
      : "Din PACT-reservation har avslutats";
  }
  return kind === "max_age"
    ? "Your PACT reservation has ended (terms of purchase §3)"
    : "Your PACT reservation has ended";
}

export function buildExtensionAskText(p: ExtensionAskEmailParams): string {
  const name = p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi");
  const deadline = formatExtensionDeadlineDate(p.deadlineDate, p.locale);
  const amount = formatReservedAmountSek(p.amountSek, p.locale);
  const termsUrl = termsUrlForLocale(p.locale);
  const days = p.extensionDays;

  if (p.locale === "sv") {
    return `Hej ${name},

Din reservation hos PACT har nu gällt i ${days} dagar och pallen har ännu inte nått den volym som krävs. Enligt köpvillkoren (punkt 3) gäller en reservation i ${days} dagar åt gången. Vill du behålla den bekräftar du senast ${deadline} via länken nedan (ingen inloggning krävs):

${p.confirmUrl}

När du bekräftar gäller reservationen i ${days} dagar till, och när pallen når sin gräns debiteras det belopp du reserverat (${amount}). Om du inte bekräftar avslutas reservationen automatiskt och inget belopp debiteras. Du kan förlänga igen på samma sätt så länge pallen väntar på volym.

Köpvillkor: ${termsUrl}

${QUESTIONS_LINE_SV}

/PACT`;
  }

  return `Hi ${name},

Your reservation with PACT has now been in effect for ${days} days and the pallet has not yet reached the required volume. Under the terms of purchase (section 3), a reservation is valid for ${days} days at a time. If you want to keep it, please confirm by ${deadline} using the link below (no login required):

${p.confirmUrl}

When you confirm, the reservation remains valid for another ${days} days, and when the pallet reaches its limit the amount you reserved (${amount}) will be charged. If you do not confirm, the reservation ends automatically and no amount is charged. You can extend again in the same way for as long as the pallet is waiting on volume.

Terms of purchase: ${termsUrl}

${QUESTIONS_LINE_EN}

/PACT`;
}

export function buildExtensionAskHtml(p: ExtensionAskEmailParams): string {
  const name = escapeHtmlBasic(
    p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi"),
  );
  const url = escapeHtmlBasic(p.confirmUrl);
  const deadline = escapeHtmlBasic(
    formatExtensionDeadlineDate(p.deadlineDate, p.locale),
  );
  const amount = escapeHtmlBasic(
    formatReservedAmountSek(p.amountSek, p.locale),
  );
  const termsUrl = escapeHtmlBasic(termsUrlForLocale(p.locale));
  const days = p.extensionDays;

  if (p.locale === "sv") {
    return wrapEmail(
      "Förläng din reservation",
      `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hej ${name},</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Din reservation hos PACT har nu gällt i ${days} dagar och pallen har ännu inte nått den volym som krävs. Enligt köpvillkoren (punkt 3) gäller en reservation i ${days} dagar åt gången. Vill du behålla den bekräftar du senast ${deadline} via länken nedan (ingen inloggning krävs):</p>
<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;">Ge reservationen ${days} dagar till</a></p>
<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Eller öppna länken:<br><a href="${url}" style="color:#000;">${url}</a></p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">När du bekräftar gäller reservationen i ${days} dagar till, och när pallen når sin gräns debiteras det belopp du reserverat (${amount}). Om du inte bekräftar avslutas reservationen automatiskt och inget belopp debiteras. Du kan förlänga igen på samma sätt så länge pallen väntar på volym.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;"><a href="${termsUrl}" style="color:#000;">Köpvillkor</a> (${termsUrl})</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0;">${escapeHtmlBasic(QUESTIONS_LINE_SV)}</p>`,
    );
  }

  return wrapEmail(
    "Extend your reservation",
    `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hi ${name},</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Your reservation with PACT has now been in effect for ${days} days and the pallet has not yet reached the required volume. Under the terms of purchase (section 3), a reservation is valid for ${days} days at a time. If you want to keep it, please confirm by ${deadline} using the link below (no login required):</p>
<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;">Give the reservation ${days} more days</a></p>
<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Or open this link:<br><a href="${url}" style="color:#000;">${url}</a></p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">When you confirm, the reservation remains valid for another ${days} days, and when the pallet reaches its limit the amount you reserved (${amount}) will be charged. If you do not confirm, the reservation ends automatically and no amount is charged. You can extend again in the same way for as long as the pallet is waiting on volume.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;"><a href="${termsUrl}" style="color:#000;">Terms of purchase</a> (${termsUrl})</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0;">${escapeHtmlBasic(QUESTIONS_LINE_EN)}</p>`,
  );
}

export function buildExpiryCancelledText(p: ExpiryCancelledEmailParams): string {
  const name = p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi");
  const questions = p.locale === "sv" ? QUESTIONS_LINE_SV : QUESTIONS_LINE_EN;

  if (p.locale === "sv") {
    if (p.kind === "max_age") {
      const days = p.maxAgeDays ?? 90;
      return `Hej ${name},

Din reservation hos PACT har avslutats automatiskt enligt köpvillkoren punkt 3, eftersom pallen inte nådde nödvändig volym inom ${days} dagar från din reservation.

Inget belopp har debiterats.

Du är varmt välkommen att lägga en ny reservation när du vill: ${SITE}

${questions}

/PACT`;
    }
    return `Hej ${name},

Din reservation hos PACT har avslutats automatiskt eftersom vi inte fick en bekräftelse på att du ville förlänga den.

Inget belopp har debiterats. Flaskorna är åter tillgängliga.

Du är varmt välkommen att lägga en ny reservation när du vill: ${SITE}

${questions}

/PACT`;
  }

  if (p.kind === "max_age") {
    const days = p.maxAgeDays ?? 90;
    return `Hi ${name},

Your reservation with PACT has ended automatically under the terms of purchase section 3, because the pallet did not reach the required volume within ${days} days of your reservation.

No amount has been charged.

You are warmly welcome to place a new reservation whenever you like: ${SITE}

${questions}

/PACT`;
  }

  return `Hi ${name},

Your reservation with PACT has ended automatically because we did not receive confirmation that you wanted to extend it.

No amount has been charged. The bottles have been released.

You are warmly welcome to place a new reservation whenever you like: ${SITE}

${questions}

/PACT`;
}

export function buildExpiryCancelledHtml(p: ExpiryCancelledEmailParams): string {
  const text = buildExpiryCancelledText(p);
  const paragraphs = text
    .split(/\n\n+/)
    .map((block) => {
      const safe = escapeHtmlBasic(block).replace(/\n/g, "<br>");
      return `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">${safe}</p>`;
    })
    .join("");
  return wrapEmail(
    p.locale === "sv" ? "Reservation avslutad" : "Reservation ended",
    paragraphs,
  );
}

export function buildExtensionConfirmSuccessBody(opts: {
  locale: AppLocale;
  newEndDate: Date;
  extensionDays?: number;
}): string {
  const end = formatExtensionDeadlineDate(opts.newEndDate, opts.locale);
  const days = opts.extensionDays ?? 30;
  if (opts.locale === "sv") {
    return `Du har bekräftat att din reservation gäller i ${days} dagar till, till och med ${end}. Inget belopp debiteras nu – betalning dras först när pallen nått sin gräns. Vi hör av oss igen om pallen fortfarande inte är redo.`;
  }
  return `You have confirmed that your reservation is valid for another ${days} days, until ${end}. No amount is charged now – payment is taken only when the pallet has reached its limit. We will be in touch again if the pallet is still not ready.`;
}

export function extensionNewEndDate(
  confirmedAt: Date,
  extensionDays: number,
): Date {
  return new Date(confirmedAt.getTime() + extensionDays * DAY_MS);
}

/** Static chrome for the confirmation page (body is built with the end date). */
export const EXTENSION_CONFIRM_PAGE_COPY = {
  sv: {
    title: "Tack — din reservation fortsätter",
    cta: "Till pactwines.com",
  },
  en: {
    title: "Thank you — your reservation continues",
    cta: "Go to pactwines.com",
  },
} as const;

export const EXTENSION_CONFIRM_PAGE_ERROR_COPY = {
  sv: {
    title: "Länken fungerar inte",
    missing_token: "Länken saknar en giltig kod.",
    not_found: "Länken är ogiltig.",
    expired:
      "Länken har gått ut. Kontakta oss på customer@pactwines.com om du fortfarande vill förlänga.",
    already_used: "Länken har redan använts.",
    db_error:
      "Något gick fel. Försök igen om en stund eller mejla customer@pactwines.com.",
    not_eligible:
      "Reservationen kan inte förlängas (den kan redan vara avslutad eller pallen är redo).",
  },
  en: {
    title: "This link does not work",
    missing_token: "The link is missing a valid code.",
    not_found: "This link is invalid.",
    expired:
      "This link has expired. Contact us at customer@pactwines.com if you still want to extend.",
    already_used: "This link has already been used.",
    db_error:
      "Something went wrong. Try again shortly or email customer@pactwines.com.",
    not_eligible:
      "This reservation can no longer be extended (it may already have ended or the pallet is ready).",
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
