import { sendEmail } from "@/lib/email";
import { getAppUrl, getB2BAppUrl } from "@/lib/app-url";
import {
  DIRTYWINE_BRAND_NAME,
  DIRTYWINE_EMAIL_LOGO_URL,
  DIRTYWINE_INQUIRY_EMAIL_HEADLINE,
  DIRTYWINE_INQUIRY_FOLLOW_UP,
  DIRTYWINE_PRIVACY_POLICY_LABEL,
  DIRTYWINE_PRIVACY_POLICY_URL,
  getDirtywineInquiryEmailFooterPlain,
} from "@/lib/b2b/brand";
import { getB2bInquiryNotifyEmail } from "@/lib/b2b/flags";
import {
  getDirtywineReplyTo,
  getDirtywineResendFrom,
} from "@/lib/b2b/email-from";
import type { B2bInquiryNormalized } from "@/lib/b2b/inquiry-validation";

const LINK_STYLE = "color:#111111;text-decoration:underline;";
const MUTED = "#71717a";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Format öre → "1 140 kr" (sv-SE, whole kronor). */
export function formatInquirySekFromCents(cents: number): string {
  const kronor = Math.round(cents) / 100;
  return (
    new Intl.NumberFormat("sv-SE", {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(kronor) + " kr"
  );
}

export function inquiryLinesTotals(lines: B2bInquiryNormalized["lines"]): {
  bottles: number;
  totalCents: number;
} {
  let bottles = 0;
  let totalCents = 0;
  for (const line of lines) {
    bottles += line.quantity;
    const unit = line.unitPriceCents ?? 0;
    totalCents += unit * line.quantity;
  }
  return { bottles, totalCents };
}

function linesSummaryText(lines: B2bInquiryNormalized["lines"]): string {
  return lines
    .map((l) => {
      const unit = l.unitPriceCents ?? 0;
      const lineTotal = unit * l.quantity;
      return `• ${l.wineTitle} × ${l.quantity} — ${formatInquirySekFromCents(lineTotal)}`;
    })
    .join("\n");
}

function footerHtml(): string {
  const addressPlain = getDirtywineInquiryEmailFooterPlain();
  // Replace privacy label with a link; keep [ADRESS] / address as plain text.
  const withLink = addressPlain.replace(
    DIRTYWINE_PRIVACY_POLICY_LABEL,
    `<a href="${DIRTYWINE_PRIVACY_POLICY_URL}" style="${LINK_STYLE}">${DIRTYWINE_PRIVACY_POLICY_LABEL}</a>`,
  );
  return `<p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:${MUTED};">${withLink}</p>`;
}

export function buildB2bInquiryCustomerEmail(opts: {
  value: B2bInquiryNormalized;
}): {
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo: string;
} {
  const v = opts.value;
  const { bottles, totalCents } = inquiryLinesTotals(v.lines);
  const subject = `${DIRTYWINE_INQUIRY_EMAIL_HEADLINE} – ${DIRTYWINE_BRAND_NAME}`;
  const delivery = v.desiredDeliveryDate ?? "—";
  const linesBlock = linesSummaryText(v.lines);
  const totalLabel = `Totalt: ${bottles} flaskor · ${formatInquirySekFromCents(totalCents)} exkl. moms`;

  const text = [
    DIRTYWINE_INQUIRY_EMAIL_HEADLINE,
    "",
    `Företag: ${v.companyName}`,
    `Önskat leveransdatum: ${delivery}`,
    "",
    "Din förfrågan:",
    linesBlock,
    totalLabel,
    "",
    DIRTYWINE_INQUIRY_FOLLOW_UP,
    "",
    `Hälsningar`,
    DIRTYWINE_BRAND_NAME,
    "",
    getDirtywineInquiryEmailFooterPlain(),
    DIRTYWINE_PRIVACY_POLICY_URL,
  ].join("\n");

  const lineRowsHtml = v.lines
    .map((l) => {
      const unit = l.unitPriceCents ?? 0;
      const lineTotal = unit * l.quantity;
      return `<tr>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;font-size:14px;">${escapeHtml(l.wineTitle)} × ${l.quantity}</td>
        <td style="padding:8px 0;border-bottom:1px solid #e4e4e7;font-size:14px;text-align:right;white-space:nowrap;">${escapeHtml(formatInquirySekFromCents(lineTotal))}</td>
      </tr>`;
    })
    .join("");

  const html = `
<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111111;max-width:560px;">
  <p style="margin:0 0 20px;">
    <img src="${DIRTYWINE_EMAIL_LOGO_URL}" alt="${escapeHtml(DIRTYWINE_BRAND_NAME)}" width="140" height="56"
         style="display:block;height:32px;width:auto;max-height:32px;border:0;outline:none;text-decoration:none;" />
  </p>
  <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;letter-spacing:-0.02em;">
    ${escapeHtml(DIRTYWINE_INQUIRY_EMAIL_HEADLINE)}
  </h1>
  <p style="margin:0 0 4px;font-size:14px;"><strong>Företag:</strong> ${escapeHtml(v.companyName)}</p>
  <p style="margin:0 0 16px;font-size:14px;"><strong>Önskat leveransdatum:</strong> ${escapeHtml(delivery)}</p>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;margin:0 0 8px;">
    ${lineRowsHtml}
  </table>
  <p style="margin:0 0 4px;font-size:12px;color:${MUTED};">Priser exkl. moms</p>
  <p style="margin:0 0 20px;font-size:14px;font-weight:600;">${escapeHtml(totalLabel)}</p>
  <p style="margin:0 0 20px;">${escapeHtml(DIRTYWINE_INQUIRY_FOLLOW_UP)}</p>
  <p style="margin:0;">Hälsningar<br/>${escapeHtml(DIRTYWINE_BRAND_NAME)}</p>
  ${footerHtml()}
</div>`.trim();

  return {
    subject,
    html,
    text,
    from: getDirtywineResendFrom(),
    replyTo: getDirtywineReplyTo(),
  };
}

export function buildB2bInquiryInternalNotify(opts: {
  inquiryId: string;
  value: B2bInquiryNormalized;
}): {
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo: string;
} {
  const v = opts.value;
  const { bottles, totalCents } = inquiryLinesTotals(v.lines);
  const adminPath = `/admin/b2b-inquiries`;
  // Admin UI lives on the platform app (PACT); fall back to B2B origin in local.
  const adminBase = getAppUrl().includes("localhost")
    ? getB2BAppUrl()
    : getAppUrl();
  const adminUrl = `${adminBase.replace(/\/$/, "")}${adminPath}`;
  const orderValue = formatInquirySekFromCents(totalCents);
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
    linesSummaryText(v.lines),
    `Ordervärde: ${orderValue} exkl. moms (${bottles} flaskor)`,
    ``,
    `Admin: ${adminUrl}`,
  ].join("\n");

  const html = `
<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111111;max-width:40rem;">
  <p style="margin:0 0 0.75rem;font-weight:600;">Ny B2B-förfrågan från dirtywine.se</p>
  <pre style="white-space:pre-wrap;margin:0 0 1rem;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:0.875rem;">${escapeHtml(
    text.replace(`Admin: ${adminUrl}`, "").trimEnd(),
  )}</pre>
  <p style="margin:0 0 0.5rem;font-size:14px;">
    <strong>Ordervärde:</strong> ${escapeHtml(orderValue)} exkl. moms (${bottles} flaskor)
  </p>
  <p style="margin:0;font-size:14px;">
    <a href="${escapeHtml(adminUrl)}" style="${LINK_STYLE}">Öppna i admin</a>
    <span style="color:${MUTED};"> (${escapeHtml(adminUrl)})</span>
  </p>
</div>`.trim();

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
  value: B2bInquiryNormalized;
}): Promise<void> {
  const built = buildB2bInquiryCustomerEmail({ value: opts.value });
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
