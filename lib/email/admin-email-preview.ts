import {
  getAccessApprovalEmailTemplate,
  getAccessApprovalEmailText,
  getWelcomeEmailTemplate,
  getWelcomeEmailText,
} from "@/lib/email-templates";
import {
  buildOrderConfirmationHtml,
  buildOrderConfirmationText,
  buildPaymentCancelledHtml,
  buildPaymentCancelledText,
  buildPaymentConfirmedHtml,
  buildPaymentConfirmedText,
  buildPaymentFailedHtml,
  buildPaymentFailedText,
} from "@/lib/sendgrid-service";
import {
  buildPaymentReminderHtml,
  buildPaymentReminderText,
  generatePaymentEmailHTML,
  generatePaymentEmailText,
} from "@/lib/email/pallet-complete";
import {
  digestPayloadToHtml,
  digestPayloadToText,
} from "@/lib/operations-weekly-digest";
import {
  SAMPLE_ACCESS_SIGNUP_URL,
  SAMPLE_DIGEST_PAYLOAD,
  SAMPLE_ORDER_CONFIRMATION,
  SAMPLE_PALLET_READY,
  SAMPLE_PAYMENT_CANCELLED,
  SAMPLE_PAYMENT_CONFIRMED,
  SAMPLE_PAYMENT_FAILED,
  SAMPLE_PAYMENT_REMINDER,
} from "@/lib/email/admin-email-samples";

export const ADMIN_EMAIL_TEMPLATE_IDS = [
  "welcome",
  "access_approved",
  "order_confirmation",
  "payment_confirmed",
  "payment_failed",
  "payment_cancelled",
  "pallet_ready",
  "payment_reminder",
  "operations_digest",
] as const;

export type AdminEmailTemplateId = (typeof ADMIN_EMAIL_TEMPLATE_IDS)[number];

export function isAdminEmailTemplateId(
  id: string,
): id is AdminEmailTemplateId {
  return (ADMIN_EMAIL_TEMPLATE_IDS as readonly string[]).includes(id);
}

export type RenderAdminEmailOptions = {
  /** Shown in welcome template; defaults to a placeholder for preview. */
  recipientEmail?: string;
  recipientDisplayName?: string;
};

export type RenderedAdminEmail = {
  html: string;
  text: string;
  subject: string;
};

const SUBJECTS: Record<AdminEmailTemplateId, string> = {
  welcome: "Welcome to PACT",
  access_approved: "Din åtkomst till PACT är godkänd",
  order_confirmation: `Order Confirmation — ${SAMPLE_ORDER_CONFIRMATION.orderId}`,
  payment_confirmed: "Payment confirmed — your PACT order is on its way",
  payment_failed: "Action required — payment failed for your PACT order",
  payment_cancelled: "Your PACT reservation has been cancelled",
  pallet_ready: "🍷 Your Pallet is Ready",
  payment_reminder: `⏰ Payment Reminder — ${SAMPLE_PAYMENT_REMINDER.hoursRemaining} hours remaining`,
  operations_digest: "Operations — weekly summary",
};

export async function renderAdminEmail(
  templateId: AdminEmailTemplateId,
  opts?: RenderAdminEmailOptions,
): Promise<RenderedAdminEmail> {
  const email =
    opts?.recipientEmail?.trim() || "kund@exempel.se";
  const displayName =
    opts?.recipientDisplayName?.trim() || "Anna Andersson";

  switch (templateId) {
    case "welcome": {
      const html = await getWelcomeEmailTemplate({
        customerEmail: email,
        customerName: displayName,
      });
      const text = await getWelcomeEmailText({
        customerEmail: email,
        customerName: displayName,
      });
      return { html, text, subject: SUBJECTS.welcome };
    }
    case "access_approved": {
      const html = await getAccessApprovalEmailTemplate(SAMPLE_ACCESS_SIGNUP_URL);
      const text = await getAccessApprovalEmailText(SAMPLE_ACCESS_SIGNUP_URL);
      return { html, text, subject: SUBJECTS.access_approved };
    }
    case "order_confirmation": {
      const data = {
        ...SAMPLE_ORDER_CONFIRMATION,
        customerEmail: email,
        customerName: displayName,
      };
      const html = await buildOrderConfirmationHtml(data);
      const text = buildOrderConfirmationText(data);
      return {
        html,
        text,
        subject: SUBJECTS.order_confirmation,
      };
    }
    case "payment_confirmed": {
      const html = buildPaymentConfirmedHtml(SAMPLE_PAYMENT_CONFIRMED);
      const text = buildPaymentConfirmedText(SAMPLE_PAYMENT_CONFIRMED);
      return { html, text, subject: SUBJECTS.payment_confirmed };
    }
    case "payment_failed": {
      const html = buildPaymentFailedHtml(SAMPLE_PAYMENT_FAILED);
      const text = buildPaymentFailedText(SAMPLE_PAYMENT_FAILED);
      return { html, text, subject: SUBJECTS.payment_failed };
    }
    case "payment_cancelled": {
      const html = buildPaymentCancelledHtml(SAMPLE_PAYMENT_CANCELLED);
      const text = buildPaymentCancelledText(SAMPLE_PAYMENT_CANCELLED);
      return { html, text, subject: SUBJECTS.payment_cancelled };
    }
    case "pallet_ready": {
      const html = generatePaymentEmailHTML(SAMPLE_PALLET_READY);
      const text = generatePaymentEmailText(SAMPLE_PALLET_READY);
      return { html, text, subject: SUBJECTS.pallet_ready };
    }
    case "payment_reminder": {
      const params = { ...SAMPLE_PAYMENT_REMINDER, to: email };
      const html = buildPaymentReminderHtml(params);
      const text = buildPaymentReminderText(params);
      return { html, text, subject: SUBJECTS.payment_reminder };
    }
    case "operations_digest": {
      const html = digestPayloadToHtml(SAMPLE_DIGEST_PAYLOAD);
      const text = digestPayloadToText(SAMPLE_DIGEST_PAYLOAD);
      return { html, text, subject: SUBJECTS.operations_digest };
    }
  }
}
