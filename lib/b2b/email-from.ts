/**
 * Dirtywine / B2B transactional From header.
 *
 * Resend probe (2026-10-31): `dirtywine.se` is NOT a verified sending domain
 * (`validation_error: The dirtywine.se domain is not verified`).
 * `Dirtywine <noreply@pactwines.com>` succeeds on the verified pactwines.com domain.
 *
 * Override with `DIRTYWINE_RESEND_FROM` (full RFC "Name <email>" form) once
 * dirtywine.se is verified in Resend — e.g. `Dirtywine <noreply@dirtywine.se>`.
 */
export const DIRTYWINE_RESEND_FROM_DEFAULT =
  "Dirtywine <noreply@pactwines.com>";

export function getDirtywineResendFrom(): string {
  const fromEnv = process.env.DIRTYWINE_RESEND_FROM?.trim();
  return fromEnv || DIRTYWINE_RESEND_FROM_DEFAULT;
}

export function getDirtywineReplyTo(): string {
  return (
    process.env.DIRTYWINE_RESEND_REPLY_TO?.trim() || "axel@dirtywine.se"
  );
}
