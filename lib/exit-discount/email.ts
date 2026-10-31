import { sendEmail } from "@/lib/email";
import {
  EXIT_DISCOUNT_PERCENT,
  exitDiscountEmailMode,
} from "@/lib/exit-discount/config";
import {
  EXIT_DISCOUNT_EMAIL_FOOTER,
  exitDiscountEmailBodyLines,
} from "@/lib/exit-discount/offer-copy";
import { buildNewsletterUnsubscribeUrl } from "@/lib/newsletter/tokens";

const FROM_CUSTOMER = "PACT <customer@pactwines.com>";

/** Same asset as the site header logo (absolute https for email clients). */
export const EXIT_DISCOUNT_EMAIL_LOGO_URL =
  "https://abrnvjqwpdkodgrtezeg.supabase.co/storage/v1/object/public/uploads/cb044b3f-a2df-4d1c-89e3-e39854bc87ec.svg";

const LINK_STYLE = "color:#111111;text-decoration:underline;";

/** Bulletproof CTA: dark fill, white text, ≥44px, 8px radius. */
function buildChooseWinesButtonHtml(): string {
  const href = "https://pactwines.com/vin";
  return `
<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:20px 0;">
  <tr>
    <td align="left" bgcolor="#171717" style="border-radius:8px;background-color:#171717;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:44px;v-text-anchor:middle;width:160px;" arcsize="18%" stroke="f" fillcolor="#171717">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:system-ui,sans-serif;font-size:16px;font-weight:600;">Välj viner</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${href}"
         style="display:inline-block;background-color:#171717;color:#ffffff;font-family:system-ui,sans-serif;font-size:16px;font-weight:600;line-height:44px;min-height:44px;text-align:center;text-decoration:none;padding:0 24px;border-radius:8px;mso-hide:all;">
        Välj viner
      </a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`.trim();
}

export function buildExitDiscountEmailHtml(opts: {
  code: string;
  percent: number;
  expiresLabel: string;
  unsubUrl?: string | null;
}): string {
  const unsubBlock = opts.unsubUrl
    ? `<p style="font-size:0.875rem;color:#555555;line-height:1.5;margin:16px 0 0;">
         Du har valt att få vårt nyhetsbrev.
         <a href="${opts.unsubUrl}" style="${LINK_STYLE}">Avregistrera dig här</a>.
       </p>`
    : "";

  return `
<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111111;max-width:560px;">
  <p style="margin:0 0 20px;">
    <img src="${EXIT_DISCOUNT_EMAIL_LOGO_URL}" alt="PACT" width="96" height="32"
         style="display:block;height:32px;width:auto;max-height:32px;border:0;outline:none;text-decoration:none;" />
  </p>
  <p style="margin:0 0 12px;">Hej!</p>
  <p style="margin:0 0 8px;">Här är din personliga rabattkod:</p>
  <div style="margin:0 0 8px;padding:14px 16px;background-color:#f4f4f5;border:1px solid #d4d4d8;border-radius:6px;">
    <span style="font-size:1.25rem;font-weight:700;letter-spacing:0.04em;user-select:all;-webkit-user-select:all;">${opts.code}</span>
  </div>
  <p style="margin:0 0 16px;">Ange koden i kassan.</p>
  <p style="margin:0 0 4px;">
    Den ger <strong>${opts.percent}&nbsp;%</strong> på vinet i din första reservation
    och gäller till <strong>${opts.expiresLabel}</strong>.
  </p>
  ${buildChooseWinesButtonHtml()}
  <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#71717a;">
    Koden kan användas en gång och kan inte kombineras med PACT Points.
    Den gäller inte Meigoon Box. Gäller vinet, inte frakten.
  </p>
  ${unsubBlock}
  <p style="margin:24px 0 0;font-size:12px;line-height:1.5;color:#71717a;">
    ${EXIT_DISCOUNT_EMAIL_FOOTER.replace(
      "customer@pactwines.com",
      `<a href="mailto:customer@pactwines.com" style="${LINK_STYLE}">customer@pactwines.com</a>`,
    ).replace(
      "pactwines.com.",
      `<a href="https://pactwines.com" style="${LINK_STYLE}">pactwines.com</a>.`,
    )}
  </p>
</div>`.trim();
}

export async function sendExitDiscountEmail(opts: {
  to: string;
  code: string;
  expiresAt: Date;
  includeNewsletter: boolean;
  origin?: string;
}): Promise<void> {
  const expiresLabel = opts.expiresAt.toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const unsubUrl = opts.includeNewsletter
    ? buildNewsletterUnsubscribeUrl(opts.to, opts.origin)
    : null;

  const subject = `Din ${EXIT_DISCOUNT_PERCENT} % rabattkod från PACT`;
  const textLines = exitDiscountEmailBodyLines({
    code: opts.code,
    percent: EXIT_DISCOUNT_PERCENT,
    expiresLabel,
  });
  if (unsubUrl) {
    textLines.push(
      ``,
      `Du har valt att få vårt nyhetsbrev. Avregistrera dig här: ${unsubUrl}`,
    );
  }

  const html = buildExitDiscountEmailHtml({
    code: opts.code,
    percent: EXIT_DISCOUNT_PERCENT,
    expiresLabel,
    unsubUrl,
  });

  const mode = exitDiscountEmailMode();
  if (mode === "off" || mode === "log") {
    console.info("[exit-discount] email suppressed", {
      mode,
      to: opts.to,
      subject,
      code: opts.code,
      expires_at: opts.expiresAt.toISOString(),
    });
    return;
  }

  await sendEmail({
    to: opts.to,
    subject,
    html,
    text: textLines.join("\n"),
    from: FROM_CUSTOMER,
    replyTo: "customer@pactwines.com",
  });
}
