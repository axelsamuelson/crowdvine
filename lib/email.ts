import { Resend } from "resend";

/** Verified sender in Resend (full RFC form). Override in Vercel / .env.local. */
export function defaultResendFrom(): string {
  return process.env.RESEND_FROM?.trim() || "PACT <noreply@pactwines.com>";
}

/**
 * Low-level transactional send (Resend). Throws on failure so callers can map errors.
 * Set `RESEND_API_KEY` in the environment (Vercel or .env.local).
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = defaultResendFrom(),
}: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
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
    ...(text ? { text } : {}),
  });

  if (error) {
    console.error("[Resend] Failed to send email:", error);
    throw new Error(error.message);
  }
  return data;
}
