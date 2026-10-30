import type { AppLocale } from "@/lib/i18n/locale";
import { escapeHtmlBasic } from "@/lib/email/escape-html";

export type ExtensionAskEmailParams = {
  locale: AppLocale;
  customerName: string;
  confirmUrl: string;
  replyDays: number;
  extensionDays: number;
};

export type ExpiryCancelledEmailParams = {
  locale: AppLocale;
  customerName: string;
  /** no_reply | max_age (max_age only when an optional cap is configured) */
  kind: "no_reply" | "max_age";
  maxAgeDays?: number | null;
};

const SITE = "https://pactwines.com";

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
  if (p.locale === "sv") {
    return `Hej ${name},

Din reservation hos PACT har nu legat öppen i ${p.extensionDays} dagar och pallen har ännu inte nått den volym som krävs.

Enligt köpvillkoren (punkt 3) upphör en reservation om pallen inte fylls — men du kan välja att ge pallen ytterligare ${p.extensionDays} dagar. Bekräfta senast inom ${p.replyDays} dagar via länken nedan (ingen inloggning krävs):

${p.confirmUrl}

Om du inte bekräftar inom ${p.replyDays} dagar avslutas reservationen automatiskt. Inget belopp debiteras.

Du kan förlänga igen senare på samma sätt så länge pallen fortfarande väntar på volym.

/PACT`;
  }

  return `Hi ${name},

Your reservation with PACT has now been open for ${p.extensionDays} days and the pallet has not yet reached the required volume.

Under the terms of purchase (section 3), a reservation ends if the pallet does not fill — but you can choose to give the pallet another ${p.extensionDays} days. Please confirm within ${p.replyDays} days using the link below (no login required):

${p.confirmUrl}

If you do not confirm within ${p.replyDays} days, the reservation ends automatically. No amount is charged.

You can extend again later in the same way for as long as the pallet is still waiting on volume.

/PACT`;
}

export function buildExtensionAskHtml(p: ExtensionAskEmailParams): string {
  const name = escapeHtmlBasic(
    p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi"),
  );
  const url = escapeHtmlBasic(p.confirmUrl);
  if (p.locale === "sv") {
    return wrapEmail(
      "Förläng din reservation",
      `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hej ${name},</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Din reservation hos PACT har nu legat öppen i ${p.extensionDays} dagar och pallen har ännu inte nått den volym som krävs.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Enligt köpvillkoren (punkt 3) upphör en reservation om pallen inte fylls — men du kan välja att ge pallen ytterligare ${p.extensionDays} dagar. Bekräfta senast inom ${p.replyDays} dagar via knappen nedan (ingen inloggning krävs).</p>
<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;">Ge reservationen ${p.extensionDays} dagar till</a></p>
<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Eller öppna länken:<br><a href="${url}" style="color:#000;">${url}</a></p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Om du inte bekräftar inom ${p.replyDays} dagar avslutas reservationen automatiskt. Inget belopp debiteras.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0;">Du kan förlänga igen senare på samma sätt så länge pallen fortfarande väntar på volym.</p>`,
    );
  }
  return wrapEmail(
    "Extend your reservation",
    `<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Hi ${name},</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Your reservation with PACT has now been open for ${p.extensionDays} days and the pallet has not yet reached the required volume.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">Under the terms of purchase (section 3), a reservation ends if the pallet does not fill — but you can choose to give the pallet another ${p.extensionDays} days. Please confirm within ${p.replyDays} days using the button below (no login required).</p>
<p style="margin:24px 0;"><a href="${url}" style="display:inline-block;background:#000;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px;font-size:16px;">Give the reservation ${p.extensionDays} more days</a></p>
<p style="color:#666;font-size:14px;line-height:1.6;margin:0 0 16px 0;">Or open this link:<br><a href="${url}" style="color:#000;">${url}</a></p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 16px 0;">If you do not confirm within ${p.replyDays} days, the reservation ends automatically. No amount is charged.</p>
<p style="color:#333;font-size:16px;line-height:1.6;margin:0;">You can extend again later in the same way for as long as the pallet is still waiting on volume.</p>`,
  );
}

export function buildExpiryCancelledText(p: ExpiryCancelledEmailParams): string {
  const name = p.customerName.trim() || (p.locale === "sv" ? "hej" : "hi");
  if (p.locale === "sv") {
    if (p.kind === "max_age") {
      const days = p.maxAgeDays ?? 90;
      return `Hej ${name},

Din reservation hos PACT har avslutats automatiskt enligt köpvillkoren punkt 3, eftersom pallen inte nådde nödvändig volym inom ${days} dagar från din reservation.

Inget belopp har debiterats.

Du är varmt välkommen att lägga en ny reservation när du vill: ${SITE}

/PACT`;
    }
    return `Hej ${name},

Din reservation hos PACT har avslutats automatiskt eftersom vi inte fick en bekräftelse på att du ville förlänga den.

Inget belopp har debiterats. Flaskorna är åter tillgängliga.

Du är varmt välkommen att lägga en ny reservation när du vill: ${SITE}

/PACT`;
  }

  if (p.kind === "max_age") {
    const days = p.maxAgeDays ?? 90;
    return `Hi ${name},

Your reservation with PACT has ended automatically under the terms of purchase section 3, because the pallet did not reach the required volume within ${days} days of your reservation.

No amount has been charged.

You are warmly welcome to place a new reservation whenever you like: ${SITE}

/PACT`;
  }

  return `Hi ${name},

Your reservation with PACT has ended automatically because we did not receive confirmation that you wanted to extend it.

No amount has been charged. The bottles have been released.

You are warmly welcome to place a new reservation whenever you like: ${SITE}

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

/** Copy shown on the no-login confirmation page after a successful click. */
export const EXTENSION_CONFIRM_PAGE_COPY = {
  sv: {
    title: "Tack — din reservation fortsätter",
    body: "Du har bekräftat att din reservation får 30 dagar till. Vi hör av oss igen om pallen fortfarande inte är redo. Inget belopp debiteras nu.",
    cta: "Till pactwines.com",
  },
  en: {
    title: "Thank you — your reservation continues",
    body: "You have confirmed another 30 days for your reservation. We will be in touch again if the pallet is still not ready. No amount is charged now.",
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
