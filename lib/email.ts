import { Resend } from "resend";

/** Verified sender in Resend (full RFC form). Override in Vercel / .env.local. */
export function defaultResendFrom(): string {
  return process.env.RESEND_FROM?.trim() || "PACT <noreply@pactwines.com>";
}

/** Customer-facing Reply-To (monitored inbox). Override with RESEND_REPLY_TO. */
export function defaultCustomerReplyTo(): string {
  return process.env.RESEND_REPLY_TO?.trim() || "kund@pactwines.com";
}

/**
 * Low-level transactional send (Resend). Throws on failure so callers can map errors.
 * Set `RESEND_API_KEY` in the environment (Vercel or .env.local).
 * From stays noreply (or RESEND_FROM); Reply-To defaults to kund@ for customer replies.
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = defaultResendFrom(),
  replyTo = defaultCustomerReplyTo(),
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
}) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not set");
  }

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    replyTo,
    ...(text ? { text } : {}),
  });

  if (error) {
    console.error("[Resend] Failed to send email:", error);
    throw new Error(error.message);
  }
  return data;
}
