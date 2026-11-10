import { sendEmail } from "@/lib/email";
import { escapeHtmlBasic } from "@/lib/email/escape-html";
import { formatSharedPalletCloseDeliveryCopy } from "@/lib/checkout/shared-pallet-close-delivery-copy";
import {
  getWelcomeEmailTemplate,
  getWelcomeEmailText,
} from "./email-templates";
import { getSiteContentByKey } from "./actions/content";
import { getAppUrl } from "./app-url";

// Cache for logo to avoid repeated database calls
let logoCache: { value: string | null; timestamp: number } | null = null;
const LOGO_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

async function getLogoForEmail(): Promise<string | null> {
  // Check cache first
  if (logoCache && Date.now() - logoCache.timestamp < LOGO_CACHE_DURATION) {
    return logoCache.value;
  }

  try {
    const logoUrl = await getSiteContentByKey("header_logo");

    // Update cache
    logoCache = {
      value: logoUrl,
      timestamp: Date.now(),
    };

    return logoUrl;
  } catch (error) {
    console.error("Error fetching logo for email:", error);
    return null;
  }
}

export type SendEmailResult =
  | { ok: true }
  | { ok: false; code: "missing_api_key" | "send_failed"; message: string };

export type SendOrderConfirmationResult =
  | { ok: true }
  | {
      ok: false;
      code: "missing_api_key" | "template_error" | "send_failed";
      message: string;
    };

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  /**
   * Hint for logging only (Resend has no SendGrid-style categories).
   * - `operations_digest` — internal weekly digest
   * - `transactional` — receipts / order confirmation
   * - `undefined` — other admin / transactional mail
   */
  emailKind?: "operations_digest" | "transactional";
}

function formatEmailSendError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim();
  }
  return "Email send failed";
}

export interface OrderConfirmationData {
  customerEmail: string;
  customerName: string;
  orderId: string;
  orderDate: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image?: string;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  /** Promo / code discount in major currency units (SEK). Shown when > 0. */
  discount?: number;
  total: number;
  shippingAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
  /**
   * Shared-pallet charge/close deadline (ISO). When set, confirmation copy
   * shows “senast {datum}” / “by {datum} at the latest”.
   */
  chargeDeadlineAt?: string | null;
  /** Pre-formatted locale label for the deadline (preferred for email body). */
  chargeDeadlineLabel?: string | null;
}

/** Builds order confirmation HTML (logo from site content). */
export async function buildOrderConfirmationHtml(
  data: OrderConfirmationData,
): Promise<string> {
  const logoUrl = await getLogoForEmail();

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="PACT" style="width: 120px; height: auto; max-width: 200px;" />`
    : `<div style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: 2px;">PACT</div>`;
  const deadlineLabel = String(data.chargeDeadlineLabel || "").trim();
  // Owner-approved shared close/delivery copy (same constant as checkout).
  const closeDeliveryCopy = formatSharedPalletCloseDeliveryCopy(
    "en",
    deadlineLabel || null,
  );
  const deadlineHtml = deadlineLabel
    ? `<div class="order-info" style="margin-top: 16px; background: #f8f9fa;">
                <h2 style="margin-top: 0;">Payment timing</h2>
                <p style="margin: 0;"><strong>Charged by ${deadlineLabel} at the latest</strong></p>
                <p style="margin: 8px 0 0; color: #555; font-size: 14px;">
                  We save your card and charge when the shared pallet fills, or by this date at the latest (senast ${deadlineLabel}). You can cancel free of charge until then.
                </p>
              </div>`
    : "";
  const deliveryHtml = `<div class="order-info" style="margin-top: 16px; background: #f8f9fa;">
                <h2 style="margin-top: 0;">Delivery</h2>
                <p style="margin: 0; color: #555; font-size: 14px;">${closeDeliveryCopy}</p>
              </div>`;
  const itemsHtml = data.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 15px; border-bottom: 1px solid #eee;">
          <div style="display: flex; align-items: center;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-right: 15px;">` : ""}
            <div>
              <h4 style="margin: 0 0 5px 0; color: #333;">${item.name}</h4>
              <p style="margin: 0; color: #666; font-size: 14px;">Quantity: ${item.quantity}</p>
            </div>
          </div>
        </td>
        <td style="padding: 15px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">
          ${item.price.toFixed(2)} SEK
        </td>
      </tr>
    `,
    )
    .join("");

  return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Order Confirmation</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, Arial, sans-serif; 
              line-height: 1.6; 
              color: #000000; 
              margin: 0;
              padding: 0;
              background-color: #f5f5f5;
            }
            .container { 
              max-width: 600px; 
              margin: 0 auto; 
              background-color: #ffffff;
            }
            .logo-section {
              text-align: center;
              padding: 40px 20px 20px;
              background-color: #ffffff;
            }
            .logo {
              width: 120px;
              height: auto;
              max-width: 200px;
            }
            .header { 
              background-color: #ffffff; 
              color: #000000; 
              padding: 20px 30px 30px; 
              text-align: center; 
            }
            .header h1 {
              font-size: 28px;
              font-weight: 300;
              margin: 0 0 10px 0;
              letter-spacing: -0.5px;
            }
            .header p {
              font-size: 16px;
              color: #6B7280;
              margin: 0;
            }
            .content { 
              padding: 30px; 
              background-color: #ffffff;
            }
            .order-info { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .total-section { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .shipping-info { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .footer { 
              background-color: #f9fafb; 
              padding: 30px; 
              text-align: center; 
              font-size: 14px; 
              color: #6B7280; 
              border-top: 1px solid #e5e7eb;
            }
            .button { 
              display: inline-block; 
              background-color: #000000; 
              color: #ffffff; 
              padding: 14px 28px; 
              text-decoration: none; 
              border-radius: 4px; 
              margin: 20px 0; 
              font-weight: 500;
              font-size: 16px;
            }
            .button:hover {
              background-color: #1f2937;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo-section">
              ${logoHtml}
            </div>
            
            <div class="header">
              <h1>Order Confirmation</h1>
              <p>Thank you for your order!</p>
            </div>
            
            <div class="content">
              <div class="order-info">
                <h2>Order Details</h2>
                <p><strong>Order ID:</strong> ${data.orderId}</p>
                <p><strong>Order Date:</strong> ${data.orderDate}</p>
                <p><strong>Customer:</strong> ${data.customerName}</p>
              </div>

              ${deadlineHtml}
              ${deliveryHtml}

              <h3>Items Ordered</h3>
              <table class="items-table">
                <thead>
                  <tr style="background: #f8f9fa;">
                    <th style="padding: 15px; text-align: left;">Item</th>
                    <th style="padding: 15px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div class="total-section">
                <h3>Order Summary</h3>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>Subtotal:</span>
                  <span>${data.subtotal.toFixed(2)} SEK</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>Tax:</span>
                  <span>${data.tax.toFixed(2)} SEK</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>Shipping:</span>
                  <span>${data.shipping.toFixed(2)} SEK</span>
                </div>
                ${
                  (data.discount ?? 0) > 0
                    ? `<div style="display: flex; justify-content: space-between; margin: 5px 0;">
                  <span>Discount:</span>
                  <span>−${Number(data.discount).toFixed(2)} SEK</span>
                </div>`
                    : ""
                }
                <hr style="margin: 15px 0;">
                <div style="display: flex; justify-content: space-between; margin: 5px 0; font-size: 18px; font-weight: bold;">
                  <span>Total:</span>
                  <span>${data.total.toFixed(2)} SEK</span>
                </div>
              </div>

              <div class="shipping-info">
                <h3>Shipping Address</h3>
                <p>${data.shippingAddress.name}<br>
                ${data.shippingAddress.street}<br>
                ${data.shippingAddress.postalCode} ${data.shippingAddress.city}<br>
                ${data.shippingAddress.country}</p>
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${getAppUrl()}/profile/reservations" class="button">
                  View your order
                </a>
              </div>

              <p>${
                deadlineLabel
                  ? "We'll email you again when the pallet closes and your card is charged, or if we need a choice from you at the last date."
                  : "We'll send you another email when your order ships."
              } If you have any questions, please don't hesitate to contact us.</p>
              
              <p>Thank you for choosing PACT!</p>
              <p><strong>The PACT Team</strong></p>
            </div>
            
            <div class="footer">
              <p>This email was sent regarding your order ${data.orderId}.</p>
              <p>Säljare: EURPACT OÜ (reg. 17538270), Estland</p>
              <p>Producers And Consumers Together</p>
            </div>
          </div>
        </body>
      </html>
    `;
}

export function buildOrderConfirmationText(data: OrderConfirmationData): string {
  const itemsText = data.items
    .map(
      (item) =>
        `${item.name} (Qty: ${item.quantity}) - ${item.price.toFixed(2)} SEK`,
    )
    .join("\n");
  const deadlineLabel = String(data.chargeDeadlineLabel || "").trim();
  const closeDeliveryCopy = formatSharedPalletCloseDeliveryCopy(
    "en",
    deadlineLabel || null,
  );
  const deadlineBlock = deadlineLabel
    ? `
Payment timing:
Charged by ${deadlineLabel} at the latest (senast ${deadlineLabel}).
We save your card and charge when the shared pallet fills, or by this date. You can cancel free of charge until then.
`
    : "";
  const deliveryBlock = `
Delivery:
${closeDeliveryCopy}
`;

  return `
Order Confirmation - ${data.orderId}

Dear ${data.customerName},

Thank you for your order! Here are the details:

Order ID: ${data.orderId}
Order Date: ${data.orderDate}
${deadlineBlock}${deliveryBlock}
Items Ordered:
${itemsText}

Order Summary:
Subtotal: ${data.subtotal.toFixed(2)} SEK
Tax: ${data.tax.toFixed(2)} SEK
Shipping: ${data.shipping.toFixed(2)} SEK
${
  (data.discount ?? 0) > 0
    ? `Discount: −${Number(data.discount).toFixed(2)} SEK\n`
    : ""
}Total: ${data.total.toFixed(2)} SEK

Shipping Address:
${data.shippingAddress.name}
${data.shippingAddress.street}
${data.shippingAddress.postalCode} ${data.shippingAddress.city}
${data.shippingAddress.country}

${
  deadlineLabel
    ? "We'll email you again when the pallet closes and your card is charged, or if we need a choice from you at the last date."
    : "We'll send you another email when your order ships."
} If you have any questions, please don't hesitate to contact us.

Thank you for choosing PACT!

The PACT Team

---
This email was sent regarding your order ${data.orderId}.
Säljare: EURPACT OÜ (reg. 17538270), Estland
Producers And Consumers Together
    `;
}

interface WelcomeEmailData {
  customerEmail: string;
  customerName: string;
}

class SendGridService {
  async sendEmailDetailed(data: EmailData): Promise<SendEmailResult> {
    if (!process.env.RESEND_API_KEY?.trim()) {
      console.error("❌ RESEND ERROR: API key not configured!");
      console.error(
        "Please set RESEND_API_KEY in Vercel environment variables or .env.local.",
      );
      return {
        ok: false,
        code: "missing_api_key",
        message:
          "RESEND_API_KEY is not set. Add it to .env.local (dev) or the host environment (prod).",
      };
    }

    const from =
      data.from?.trim() ||
      process.env.RESEND_FROM?.trim() ||
      "PACT <noreply@pactwines.com>";
    const textContent = data.text || this.stripHtml(data.html);

    console.log("📧 Sending email via Resend:", {
      to: data.to,
      from,
      subject: data.subject,
      emailKind: data.emailKind ?? "default",
    });

    try {
      await sendEmail({
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: textContent,
        from,
      });
      console.log(`✅ Email sent successfully to ${data.to}`);
      return { ok: true };
    } catch (error: unknown) {
      console.error("❌ Resend / email send error:", error);
      return {
        ok: false,
        code: "send_failed",
        message: formatEmailSendError(error),
      };
    }
  }

  async sendEmail(data: EmailData): Promise<boolean> {
    const r = await this.sendEmailDetailed(data);
    return r.ok;
  }

  async sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
    const r = await this.sendOrderConfirmationDetailed(data);
    return r.ok;
  }

  async sendOrderConfirmationDetailed(
    data: OrderConfirmationData,
  ): Promise<SendOrderConfirmationResult> {
    if (!process.env.RESEND_API_KEY?.trim()) {
      return {
        ok: false,
        code: "missing_api_key",
        message:
          "RESEND_API_KEY is not set. Add it to .env.local (dev) or the host environment (prod).",
      };
    }
    let html: string;
    let text: string;
    try {
      html = await buildOrderConfirmationHtml(data);
      text = buildOrderConfirmationText(data);
    } catch (error: unknown) {
      console.error("❌ Order confirmation template error:", error);
      return {
        ok: false,
        code: "template_error",
        message:
          error instanceof Error ? error.message : "Failed to build email HTML",
      };
    }

    const sent = await this.sendEmailDetailed({
      to: data.customerEmail,
      subject: `Order Confirmation - ${data.orderId}`,
      html,
      text,
      emailKind: "transactional",
    });
    if (sent.ok) return { ok: true };
    return {
      ok: false,
      code: sent.code,
      message: sent.message,
    };
  }

  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const html = await getWelcomeEmailTemplate(data);
    const text = await getWelcomeEmailText(data);

    return this.sendEmail({
      to: data.customerEmail,
      subject: "Welcome to PACT",
      html,
      text,
    });
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }
}

export const sendGridService = new SendGridService();

export { escapeHtmlBasic };

export type PaymentConfirmedEmailBody = {
  reservationId: string;
  amountSek: number;
  palletName: string;
};

export function buildPaymentConfirmedHtml(
  data: PaymentConfirmedEmailBody,
): string {
  const safePallet = escapeHtmlBasic(data.palletName);
  return `<p>Great news! Your payment of <strong>${data.amountSek} kr</strong> has been confirmed for order <strong>${escapeHtmlBasic(data.reservationId)}</strong>.</p><p>Your wines will be delivered via home delivery once the pallet ships.</p><p>Pallet: <strong>${safePallet}</strong></p>`;
}

export function buildPaymentConfirmedText(
  data: PaymentConfirmedEmailBody,
): string {
  return `Great news! Your payment of ${data.amountSek} kr has been confirmed for order ${data.reservationId}. Your wines will be delivered via home delivery once the pallet ships.\n\nPallet: ${data.palletName}`;
}

export type PaymentFailedEmailBody = {
  reservationId: string;
  /** Display name; empty → Hej/Hi fallback. */
  customerName?: string;
  amountSek?: number | null;
  /** Deadline label, e.g. "13 november 2026". */
  payByLabel: string;
  /** Absolute pay / update-card URL. */
  paymentUrl: string;
  locale?: "sv" | "en";
  /** @deprecated Prefer payByLabel + paymentUrl. */
  reason?: string;
  /** @deprecated Replaced by 3-day pay window. */
  retryHours?: 24 | 72;
  /** @deprecated Prefer paymentUrl. */
  profileUrl?: string;
};

function formatFailedAmount(
  amountSek: number | null | undefined,
  locale: "sv" | "en",
): string {
  const n = Number(amountSek);
  if (!Number.isFinite(n) || n < 0) {
    return locale === "sv" ? "beloppet" : "the amount";
  }
  const formatted = new Intl.NumberFormat(
    locale === "sv" ? "sv-SE" : "en-GB",
    { maximumFractionDigits: 0, minimumFractionDigits: 0 },
  ).format(Math.round(n));
  return locale === "sv" ? `${formatted} kr` : `${formatted} SEK`;
}

export function buildPaymentFailedHtml(data: PaymentFailedEmailBody): string {
  const locale = data.locale === "en" ? "en" : "sv";
  const name = escapeHtmlBasic(
    (data.customerName || "").trim() || (locale === "sv" ? "hej" : "hi"),
  );
  const orderId = escapeHtmlBasic(data.reservationId);
  const amount = escapeHtmlBasic(formatFailedAmount(data.amountSek, locale));
  const payBy = escapeHtmlBasic(data.payByLabel);
  const payUrl =
    data.paymentUrl ||
    `${(data.profileUrl || "https://pactwines.com").replace(/\/$/, "")}/profile#payment`;
  const safeUrl = escapeHtmlBasic(payUrl);

  if (locale === "sv") {
    return `<p>Hej ${name},</p><p>Pallen för din order <strong>${orderId}</strong> har stängt, men vi kunde inte dra ${amount} från ditt kort.</p><p>Du har till och med <strong>${payBy}</strong> (3 dagar) på dig att betala. Använd länken nedan för att godkänna betalningen eller byta kort. Vi försöker också dra beloppet igen under tiden.</p><p>Har betalningen inte gått igenom senast ${payBy} avbryts ordern och inget dras.</p><p><a href="${safeUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;">Betala nu</a></p><p style="color:#666;font-size:12px;">EURPACT OÜ · customer@pactwines.com</p>`;
  }

  return `<p>Hi ${name},</p><p>The pallet for your order <strong>${orderId}</strong> has closed, but we couldn't charge ${amount} to your card.</p><p>You have until <strong>${payBy}</strong> (3 days) to pay. Use the link below to approve the payment or change card. We'll also try the charge again in the meantime.</p><p>If payment hasn't gone through by ${payBy}, the order will be cancelled and nothing will be charged.</p><p><a href="${safeUrl}" style="display:inline-block;background:#000;color:#fff;padding:12px 20px;text-decoration:none;border-radius:4px;">Pay now</a></p><p style="color:#666;font-size:12px;">EURPACT OÜ · customer@pactwines.com</p>`;
}

export function buildPaymentFailedText(data: PaymentFailedEmailBody): string {
  const locale = data.locale === "en" ? "en" : "sv";
  const name =
    (data.customerName || "").trim() || (locale === "sv" ? "hej" : "hi");
  const amount = formatFailedAmount(data.amountSek, locale);
  const payUrl =
    data.paymentUrl ||
    `${(data.profileUrl || "https://pactwines.com").replace(/\/$/, "")}/profile#payment`;

  if (locale === "sv") {
    return `Hej ${name},

Pallen för din order ${data.reservationId} har stängt, men vi kunde inte dra ${amount} från ditt kort.

Du har till och med ${data.payByLabel} (3 dagar) på dig att betala. Använd länken nedan för att godkänna betalningen eller byta kort. Vi försöker också dra beloppet igen under tiden.

Har betalningen inte gått igenom senast ${data.payByLabel} avbryts ordern och inget dras.

Betala nu: ${payUrl}

EURPACT OÜ · customer@pactwines.com`;
  }

  return `Hi ${name},

The pallet for your order ${data.reservationId} has closed, but we couldn't charge ${amount} to your card.

You have until ${data.payByLabel} (3 days) to pay. Use the link below to approve the payment or change card. We'll also try the charge again in the meantime.

If payment hasn't gone through by ${data.payByLabel}, the order will be cancelled and nothing will be charged.

Pay now: ${payUrl}

EURPACT OÜ · customer@pactwines.com`;
}

export function paymentFailedSubject(locale: "sv" | "en" = "sv"): string {
  return locale === "sv"
    ? "Vi kunde inte dra betalningen för din order"
    : "We couldn't take payment for your order";
}

export type PaymentCancelledEmailBody = {
  reservationId: string;
  reason: string;
  locale?: "sv" | "en";
  customerName?: string;
};

export function buildPaymentCancelledHtml(
  data: PaymentCancelledEmailBody,
): string {
  const locale = data.locale === "en" ? "en" : "sv";
  const name = escapeHtmlBasic(
    (data.customerName || "").trim() || (locale === "sv" ? "hej" : "hi"),
  );
  const orderId = escapeHtmlBasic(data.reservationId);
  if (locale === "sv") {
    return `<p>Hej ${name},</p><p>Vi har avbrutit din order <strong>${orderId}</strong> eftersom betalningen inte gick igenom inom 3 dagar. Inget belopp har dragits från ditt kort.</p><p>${escapeHtmlBasic(data.reason)}</p><p>Eventuella PACT Points har återförts till ditt konto.</p><p>Vill du vara med på en kommande pall hittar du dem på <a href="https://pactwines.com">pactwines.com</a>.</p><p style="color:#666;font-size:12px;">EURPACT OÜ · customer@pactwines.com</p>`;
  }
  return `<p>Hi ${name},</p><p>We have cancelled your order <strong>${orderId}</strong> because payment did not go through within 3 days. Nothing was charged to your card.</p><p>${escapeHtmlBasic(data.reason)}</p><p>Any PACT Points used on this order have been refunded to your account.</p><p>If you'd like to join a future pallet, you'll find them at <a href="https://pactwines.com">pactwines.com</a>.</p><p style="color:#666;font-size:12px;">EURPACT OÜ · customer@pactwines.com</p>`;
}

export function buildPaymentCancelledText(
  data: PaymentCancelledEmailBody,
): string {
  const locale = data.locale === "en" ? "en" : "sv";
  const name =
    (data.customerName || "").trim() || (locale === "sv" ? "hej" : "hi");
  if (locale === "sv") {
    return `Hej ${name},

Vi har avbrutit din order ${data.reservationId} eftersom betalningen inte gick igenom inom 3 dagar. Inget belopp har dragits från ditt kort.

${data.reason}

Eventuella PACT Points har återförts till ditt konto.

Vill du vara med på en kommande pall hittar du dem på pactwines.com.

EURPACT OÜ · customer@pactwines.com`;
  }
  return `Hi ${name},

We have cancelled your order ${data.reservationId} because payment did not go through within 3 days. Nothing was charged to your card.

${data.reason}

Any PACT Points used on this order have been refunded to your account.

If you'd like to join a future pallet, you'll find them at pactwines.com.

EURPACT OÜ · customer@pactwines.com`;
}

export async function sendPaymentConfirmedEmail({
  to,
  reservationId,
  amountSek,
  palletName,
}: {
  to: string;
  reservationId: string;
  amountSek: number;
  palletName: string;
}): Promise<boolean> {
  const { sendTransactionalEmailOnce } = await import(
    "@/lib/email/claim-email-send"
  );
  const subject = "Payment confirmed — your PACT order is on its way";
  const body: PaymentConfirmedEmailBody = {
    reservationId,
    amountSek,
    palletName,
  };
  const result = await sendTransactionalEmailOnce({
    emailType: "payment_confirmed",
    recipient: to,
    reservationId,
    send: () =>
      sendGridService.sendEmail({
        to,
        subject,
        html: buildPaymentConfirmedHtml(body),
        text: buildPaymentConfirmedText(body),
      }),
  });
  return result === "sent" || result === "skipped";
}

export async function sendPaymentFailedEmail({
  to,
  reservationId,
  payByLabel,
  paymentUrl,
  locale = "sv",
  customerName,
  amountSek,
  reason,
  retryHours,
  profileUrl,
}: {
  to: string;
  reservationId: string;
  payByLabel: string;
  paymentUrl: string;
  locale?: "sv" | "en";
  customerName?: string;
  amountSek?: number | null;
  /** @deprecated */
  reason?: string;
  /** @deprecated */
  retryHours?: 24 | 72;
  /** @deprecated */
  profileUrl?: string;
}): Promise<boolean> {
  const { sendTransactionalEmailOnce } = await import(
    "@/lib/email/claim-email-send"
  );
  const subject = paymentFailedSubject(locale);
  const body: PaymentFailedEmailBody = {
    reservationId,
    payByLabel,
    paymentUrl:
      paymentUrl ||
      `${(profileUrl || "https://pactwines.com").replace(/\/$/, "")}/profile#payment`,
    locale,
    customerName,
    amountSek,
    reason,
    retryHours,
    profileUrl,
  };
  const result = await sendTransactionalEmailOnce({
    emailType: "payment_failed",
    recipient: to,
    reservationId,
    send: () =>
      sendGridService.sendEmail({
        to,
        subject,
        html: buildPaymentFailedHtml(body),
        text: buildPaymentFailedText(body),
      }),
  });
  return result === "sent" || result === "skipped";
}

export async function sendPaymentCancelledEmail({
  to,
  reservationId,
  reason,
  locale = "sv",
  customerName,
}: {
  to: string;
  reservationId: string;
  reason: string;
  locale?: "sv" | "en";
  customerName?: string;
}): Promise<boolean> {
  const { sendTransactionalEmailOnce } = await import(
    "@/lib/email/claim-email-send"
  );
  const subject =
    locale === "sv"
      ? "Din order är avbruten – inget har dragits"
      : "Your order has been cancelled – nothing was charged";
  const body: PaymentCancelledEmailBody = {
    reservationId,
    reason,
    locale,
    customerName,
  };
  const result = await sendTransactionalEmailOnce({
    emailType: "payment_cancelled",
    recipient: to,
    reservationId,
    send: () =>
      sendGridService.sendEmail({
        to,
        subject,
        html: buildPaymentCancelledHtml(body),
        text: buildPaymentCancelledText(body),
      }),
  });
  return result === "sent" || result === "skipped";
}

export type PaymentAuthenticationRequiredBody = {
  reservationId: string;
  authenticateUrl: string;
};

export function buildPaymentAuthenticationRequiredHtml(
  data: PaymentAuthenticationRequiredBody,
): string {
  const safeLink = escapeHtmlBasic(data.authenticateUrl);
  return `<p>Din bank kräver extra verifiering (3D Secure / BankID) för att slutföra betalningen för din PACT-order <strong>${escapeHtmlBasic(data.reservationId)}</strong>.</p><p>Automatiska omförsök räcker inte — du behöver bekräfta betalningen en gång i webbläsaren.</p><p><a href="${data.authenticateUrl}" style="display:inline-block;background:#000000;color:#ffffff;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:500;">Verifiera betalning</a></p><p style="font-size:14px;color:#666;">Om knappen inte fungerar, kopiera länken:<br/><span style="word-break:break-all;">${safeLink}</span></p>`;
}

export function buildPaymentAuthenticationRequiredText(
  data: PaymentAuthenticationRequiredBody,
): string {
  return `Din bank kräver extra verifiering för att slutföra betalningen för din PACT-order ${data.reservationId}.

Automatiska omförsök räcker inte — öppna länken och bekräfta betalningen i webbläsaren:

${data.authenticateUrl}
`;
}

export async function sendPaymentAuthenticationRequiredEmail({
  to,
  reservationId,
  authenticateUrl,
}: {
  to: string;
  reservationId: string;
  authenticateUrl: string;
}): Promise<boolean> {
  const { sendTransactionalEmailOnce } = await import(
    "@/lib/email/claim-email-send"
  );
  const subject = "Verifiera betalningen för din PACT-order";
  const body: PaymentAuthenticationRequiredBody = {
    reservationId,
    authenticateUrl,
  };
  const result = await sendTransactionalEmailOnce({
    emailType: "payment_authentication_required",
    recipient: to,
    reservationId,
    send: () =>
      sendGridService.sendEmail({
        to,
        subject,
        html: buildPaymentAuthenticationRequiredHtml(body),
        text: buildPaymentAuthenticationRequiredText(body),
      }),
  });
  return result === "sent" || result === "skipped";
}
