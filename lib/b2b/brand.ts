/**
 * Dirtywine brand / legal constants for B2B inquiry UI + transactional email.
 * Axel: From / subject display name stays "Dirtywine" (Resend).
 * Inès: customer email body greeting + footer use "Dirty Wine".
 */

/** From-header / subject brand (Axel — do not change without owner decision). */
export const DIRTYWINE_BRAND_NAME = "Dirtywine" as const;

/** Customer-facing body brand in inquiry confirmation email (greeting + footer). */
export const DIRTYWINE_EMAIL_BODY_BRAND = "Dirty Wine" as const;

/** Absolute logo URL used in transactional email (header_logo_dirtywine). */
export const DIRTYWINE_EMAIL_LOGO_URL =
  "https://abrnvjqwpdkodgrtezeg.supabase.co/storage/v1/object/public/uploads/fe06af9d-ee01-418b-8b77-9d1b0c435bac.svg";

export const DIRTYWINE_SITE_ORIGIN = "https://dirtywine.se";

export const DIRTYWINE_PRIVACY_POLICY_URL =
  `${DIRTYWINE_SITE_ORIGIN}/integritetspolicy`;

export const DIRTYWINE_PRIVACY_POLICY_LABEL = "Integritetspolicy";

/**
 * Street address for legal email footer.
 * Empty / unset → omit address and ", Stockholm" entirely (do not show `[ADRESS]`).
 */
export function getDirtywineLegalAddress(): string | null {
  const fromEnv = process.env.DIRTYWINE_LEGAL_ADDRESS?.trim();
  return fromEnv || null;
}

/**
 * Customer-email footer (plain text).
 * Without address: `Dirty Wine drivs av Axel Samuelson (enskild firma) · axel@… · …`
 * With address: `… (enskild firma), {adress}, Stockholm · axel@… · …`
 */
export function getDirtywineInquiryEmailFooterPlain(): string {
  const address = getDirtywineLegalAddress();
  const entity = address
    ? `${DIRTYWINE_EMAIL_BODY_BRAND} drivs av Axel Samuelson (enskild firma), ${address}, Stockholm`
    : `${DIRTYWINE_EMAIL_BODY_BRAND} drivs av Axel Samuelson (enskild firma)`;
  return `${entity} · axel@dirtywine.se · ${DIRTYWINE_PRIVACY_POLICY_LABEL} · Du får det här mejlet eftersom du skickade en förfrågan på dirtywine.se.`;
}

export const DIRTYWINE_INQUIRY_FOLLOW_UP =
  "Vi återkommer med bekräftelse och faktura inom en arbetsdag.";

export const DIRTYWINE_INQUIRY_EMAIL_HEADLINE =
  "Tack, vi har fått din förfrågan";

/** Customer confirmation email sign-off (body only; From stays Dirtywine). */
export const DIRTYWINE_INQUIRY_EMAIL_SIGNOFF = `Hälsningar, ${DIRTYWINE_EMAIL_BODY_BRAND}`;
