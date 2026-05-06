import { escapeHtmlBasic } from "@/lib/email/escape-html";

export type CampaignEmailContent = {
  /** Shown as headline inside the body (usually same as subject). */
  subject: string;
  /** Plain text from the admin form; escaped and broken into paragraphs. */
  messagePlain: string;
};

function plainToHtmlParagraphs(messagePlain: string): string {
  const blocks = messagePlain
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);
  if (blocks.length === 0) {
    return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">(Inget meddelande)</p>`;
  }
  return blocks
    .map((block) => {
      const withBreaks = escapeHtmlBasic(block).replace(/\n/g, "<br />");
      return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#333;">${withBreaks}</p>`;
    })
    .join("");
}

/**
 * Simple HTML layout for admin campaign mail (plain message + PACT chrome).
 */
export function buildCampaignEmailHtml(content: CampaignEmailContent): string {
  const title = escapeHtmlBasic(content.subject);
  const body = plainToHtmlParagraphs(content.messagePlain);
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f5;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
          <tr>
            <td style="padding:28px 24px 8px;text-align:center;background:#0f0f12;">
              <div style="font-size:22px;font-weight:600;letter-spacing:0.06em;color:#ffffff;">PACT</div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;">
              <h1 style="margin:0 0 20px;font-size:20px;font-weight:600;color:#111;">${title}</h1>
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 28px;border-top:1px solid #e5e7eb;background:#f9fafb;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:#6b7280;">
                Du får detta mail som registrerad användare på pactwines.com
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildCampaignEmailText(content: CampaignEmailContent): string {
  return `${content.subject}\n\n${content.messagePlain}\n\n---\nDu får detta mail som registrerad användare på pactwines.com`;
}
