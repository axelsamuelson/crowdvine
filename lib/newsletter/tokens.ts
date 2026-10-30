import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppUrl } from "@/lib/app-url";

const TOKEN_VERSION = "v1";

function signingSecret(): string {
  const secret =
    process.env.NEWSLETTER_UNSUB_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!secret) {
    throw new Error("No secret available for newsletter unsubscribe tokens");
  }
  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", signingSecret())
    .update(payload)
    .digest("base64url");
}

/**
 * Signed unsubscribe token: v1.<base64url(email)>.<sig>
 * No new cookies; opaque to clients.
 */
export function createNewsletterUnsubscribeToken(email: string): string {
  const normalized = email.trim().toLowerCase();
  const emailPart = Buffer.from(normalized, "utf8").toString("base64url");
  const payload = `${TOKEN_VERSION}.${emailPart}`;
  const sig = signPayload(payload);
  return `${payload}.${sig}`;
}

export function verifyNewsletterUnsubscribeToken(
  token: string,
): { ok: true; email: string } | { ok: false; error: string } {
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, error: "invalid_token" };
  const [version, emailPart, sig] = parts;
  if (version !== TOKEN_VERSION || !emailPart || !sig) {
    return { ok: false, error: "invalid_token" };
  }
  const payload = `${version}.${emailPart}`;
  let expected: string;
  try {
    expected = signPayload(payload);
  } catch {
    return { ok: false, error: "misconfigured" };
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "invalid_signature" };
  }
  try {
    const email = Buffer.from(emailPart, "base64url").toString("utf8").trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { ok: false, error: "invalid_email" };
    }
    return { ok: true, email };
  } catch {
    return { ok: false, error: "invalid_email" };
  }
}

export function buildNewsletterUnsubscribeUrl(
  email: string,
  origin?: string,
): string {
  const token = createNewsletterUnsubscribeToken(email);
  const base = (origin?.trim() || getAppUrl()).replace(/\/$/, "");
  return `${base}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}
