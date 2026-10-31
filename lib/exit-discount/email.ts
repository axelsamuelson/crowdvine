import { sendEmail } from "@/lib/email";
import {
  EXIT_DISCOUNT_PERCENT,
  exitDiscountEmailMode,
} from "@/lib/exit-discount/config";
import { exitDiscountEmailBodyLines } from "@/lib/exit-discount/offer-copy";
import { buildNewsletterUnsubscribeUrl } from "@/lib/newsletter/tokens";

const FROM_CUSTOMER = "PACT <customer@pactwines.com>";

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
  textLines.push(``, `Hälsningar`, `PACT`, `customer@pactwines.com`);

  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111;">
      <p>Hej!</p>
      <p>Här är din personliga rabattkod:</p>
      <p style="font-size: 1.25rem; font-weight: 700; letter-spacing: 0.04em;">${opts.code}</p>
      <p>
        Den ger <strong>${EXIT_DISCOUNT_PERCENT}&nbsp;%</strong> på vinet i din första reservation
        (inte på frakten) och gäller till <strong>${expiresLabel}</strong>.
        Koden kan användas en gång och kan inte kombineras med PACT Points.
        Den gäller inte Meigoon Box.
      </p>
      <p>Använd den i kassan på <a href="https://pactwines.com">pactwines.com</a>.</p>
      ${
        unsubUrl
          ? `<p style="font-size: 0.875rem; color: #555;">
               Du har valt att få vårt nyhetsbrev.
               <a href="${unsubUrl}">Avregistrera dig här</a>.
             </p>`
          : ""
      }
      <p>Hälsningar<br/>PACT<br/>
        <a href="mailto:customer@pactwines.com">customer@pactwines.com</a>
      </p>
    </div>
  `.trim();

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
