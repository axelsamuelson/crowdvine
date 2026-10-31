import { sendEmail } from "@/lib/email";
import {
  b2bInquiryCopy,
  type B2bInquiryCopyLocale,
} from "@/lib/b2b/inquiry-copy";
import { getB2bInquiryNotifyEmail } from "@/lib/b2b/flags";
import {
  getDirtywineReplyTo,
  getDirtywineResendFrom,
} from "@/lib/b2b/email-from";
import type { B2bInquiryNormalized } from "@/lib/b2b/inquiry-validation";

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

export function buildB2bInquiryCustomerEmail(opts?: {
  locale?: B2bInquiryCopyLocale;
}): { subject: string; html: string; text: string; from: string; replyTo: string } {
  const copy = b2bInquiryCopy(opts?.locale ?? "sv");
  const text = [
    copy.emailBodyCustomer,
    "",
    copy.emailPrivacyLine,
    "",
    copy.emailSignOff,
  ].join("\n");

  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111; max-width: 40rem;">
      <p style="margin: 0 0 1rem;">${escapeHtml(copy.emailBodyCustomer)}</p>
      <p style="font-size: 0.875rem; color: #555; margin: 0 0 1rem;">
        ${escapeHtml(copy.emailPrivacyLine)}
      </p>
      <p style="margin: 0;">${escapeHtml(copy.emailSignOff).replace(/\n/g, "<br/>")}</p>
    </div>
  `.trim();

  return {
    subject: copy.emailSubjectCustomer,
    html,
    text,
    from: getDirtywineResendFrom(),
    replyTo: getDirtywineReplyTo(),
  };
}

export function buildB2bInquiryInternalNotify(opts: {
  inquiryId: string;
  value: B2bInquiryNormalized;
}): { subject: string; html: string; text: string; from: string; replyTo: string } {
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

  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111; max-width: 40rem;">
      <p style="margin: 0 0 0.75rem; font-weight: 600;">Ny B2B-förfrågan från dirtywine.se</p>
      <pre style="white-space: pre-wrap; margin: 0; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.875rem;">${escapeHtml(text)}</pre>
    </div>
  `.trim();

  return {
    subject,
    html,
    text,
    from: getDirtywineResendFrom(),
    replyTo: v.email,
  };
}

export async function sendB2bInquiryCustomerEmail(opts: {
  to: string;
  locale?: B2bInquiryCopyLocale;
}): Promise<void> {
  const built = buildB2bInquiryCustomerEmail({ locale: opts.locale });
  await sendEmail({
    to: opts.to,
    subject: built.subject,
    html: built.html,
    text: built.text,
    from: built.from,
    replyTo: built.replyTo,
  });
}

export async function sendB2bInquiryInternalNotify(opts: {
  inquiryId: string;
  value: B2bInquiryNormalized;
  /** Override for tests / preview — never use customer addresses here. */
  to?: string;
}): Promise<void> {
  const to = opts.to?.trim() || getB2bInquiryNotifyEmail();
  const built = buildB2bInquiryInternalNotify({
    inquiryId: opts.inquiryId,
    value: opts.value,
  });
  await sendEmail({
    to,
    subject: built.subject,
    html: built.html,
    text: built.text,
    from: built.from,
    replyTo: built.replyTo,
  });
}
