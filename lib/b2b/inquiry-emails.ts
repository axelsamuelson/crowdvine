import {
  defaultCustomerReplyTo,
  defaultResendFrom,
  sendEmail,
} from "@/lib/email";
import {
  b2bInquiryCopy,
  type B2bInquiryCopyLocale,
} from "@/lib/b2b/inquiry-copy";
import { getB2bInquiryNotifyEmail } from "@/lib/b2b/flags";
import type { B2bInquiryNormalized } from "@/lib/b2b/inquiry-validation";

/** Prefer verified Resend sender; Reply-To Dirtywine inbox for human follow-up. */
const REPLY_DIRTYWINE = "axel@dirtywine.se";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function linesSummary(lines: B2bInquiryNormalized["lines"]): string {
  return lines
    .map((l) => `• ${l.wineTitle} × ${l.quantity}`)
    .join("\n");
}

export async function sendB2bInquiryCustomerEmail(opts: {
  to: string;
  locale?: B2bInquiryCopyLocale;
}): Promise<void> {
  const copy = b2bInquiryCopy(opts.locale ?? "sv");
  const text = [
    copy.emailBodyCustomer,
    "",
    copy.emailPrivacyLine,
    "",
    copy.emailSignOff,
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
      <p>${escapeHtml(copy.emailBodyCustomer)}</p>
      <p style="font-size: 0.875rem; color: #555;">
        ${escapeHtml(copy.emailPrivacyLine)}
      </p>
      <p>${escapeHtml(copy.emailSignOff).replace(/\n/g, "<br/>")}</p>
    </div>
  `.trim();

  await sendEmail({
    to: opts.to,
    subject: copy.emailSubjectCustomer,
    html,
    text,
    from: defaultResendFrom(),
    replyTo: REPLY_DIRTYWINE || defaultCustomerReplyTo(),
  });
}

export async function sendB2bInquiryInternalNotify(opts: {
  inquiryId: string;
  value: B2bInquiryNormalized;
  /** Override for tests / preview — never use customer addresses here. */
  to?: string;
}): Promise<void> {
  const to = opts.to?.trim() || getB2bInquiryNotifyEmail();
  const v = opts.value;
  const subject = `[B2B förfrågan] ${v.companyName} (${opts.inquiryId.slice(0, 8)})`;
  const text = [
    `Ny B2B-förfrågan från dirtywine.se`,
    ``,
    `ID: ${opts.inquiryId}`,
    `Företag: ${v.companyName}`,
    `Org.nr: ${v.organizationNumber}`,
    `Kontakt: ${v.contactName}`,
    `E-post: ${v.email}`,
    `Telefon: ${v.phone}`,
    `Adress: ${v.deliveryAddress}`,
    `Postnummer: ${v.postalCode}`,
    `Önskat leveransdatum: ${v.desiredDeliveryDate ?? "—"}`,
    `Meddelande: ${v.message ?? "—"}`,
    ``,
    `Rader:`,
    linesSummary(v.lines),
    ``,
    `Admin: /admin/b2b-inquiries`,
  ].join("\n");

  const html = `<pre style="font-family: system-ui, sans-serif; white-space: pre-wrap;">${escapeHtml(text)}</pre>`;

  await sendEmail({
    to,
    subject,
    html,
    text,
    from: defaultResendFrom(),
    replyTo: v.email,
  });
}
