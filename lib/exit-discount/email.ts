import { sendEmail } from "@/lib/email";
import {
  EXIT_DISCOUNT_PERCENT,
  exitDiscountEmailMode,
} from "@/lib/exit-discount/config";
import {
  EXIT_DISCOUNT_EMAIL_FOOTER,
  exitDiscountEmailBodyLines,
} from "@/lib/exit-discount/offer-copy";

const FROM_CUSTOMER = "PACT <customer@pactwines.com>";

const LINK_STYLE = "color:#111111;text-decoration:underline;";

/**
 * Transactional email: discount code only (+ required legal footer).
 * No marketing CTA, browse links, or promotional copy.
 */
export function buildExitDiscountEmailHtml(opts: { code: string }): string {
  return `
<div style="font-family:system-ui,sans-serif;line-height:1.5;color:#111111;max-width:560px;">
  <p style="margin:0 0 8px;">Din rabattkod:</p>
  <div style="margin:0 0 20px;padding:14px 16px;background-color:#f4f4f5;border:1px solid #d4d4d8;border-radius:6px;">
    <span style="font-size:1.25rem;font-weight:700;letter-spacing:0.04em;user-select:all;-webkit-user-select:all;">${opts.code}</span>
  </div>
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
  /** @deprecated Newsletter must not add marketing content to this email. */
  includeNewsletter?: boolean;
  origin?: string;
}): Promise<void> {
  void opts.expiresAt;
  void opts.includeNewsletter;
  void opts.origin;

  const subject = `Din ${EXIT_DISCOUNT_PERCENT} % rabattkod från PACT`;
  const textLines = exitDiscountEmailBodyLines({ code: opts.code });
  const html = buildExitDiscountEmailHtml({ code: opts.code });

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
