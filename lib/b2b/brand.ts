/**
 * Dirtywine brand / legal constants for B2B inquiry UI + transactional email.
 * Axel: display brand is "Dirtywine" (sender, subject, signature).
 */

export const DIRTYWINE_BRAND_NAME = "Dirtywine" as const;

/** Absolute logo URL used in transactional email (header_logo_dirtywine). */
export const DIRTYWINE_EMAIL_LOGO_URL =
  "https://abrnvjqwpdkodgrtezeg.supabase.co/storage/v1/object/public/uploads/fe06af9d-ee01-418b-8b77-9d1b0c435bac.svg";

export const DIRTYWINE_SITE_ORIGIN = "https://dirtywine.se";

export const DIRTYWINE_PRIVACY_POLICY_URL =
  `${DIRTYWINE_SITE_ORIGIN}/integritetspolicy`;

export const DIRTYWINE_PRIVACY_POLICY_LABEL = "Integritetspolicy";

/**
 * Street address for legal email footer.
 * Until set, the visible placeholder `[ADRESS]` must remain — do not invent an address.
 */
export function getDirtywineLegalAddress(): string {
  const fromEnv = process.env.DIRTYWINE_LEGAL_ADDRESS?.trim();
  return fromEnv || "[ADRESS]";
}

/**
 * Exact legally reviewed customer-email footer (plain text).
 * `{BRAND}` is replaced with DIRTYWINE_BRAND_NAME; address from getDirtywineLegalAddress().
 */
export function getDirtywineInquiryEmailFooterPlain(): string {
  return `${DIRTYWINE_BRAND_NAME} drivs av Axel Samuelson (enskild firma), ${getDirtywineLegalAddress()}, Stockholm · axel@dirtywine.se · ${DIRTYWINE_PRIVACY_POLICY_LABEL} · Du får det här mejlet eftersom du skickade en förfrågan på dirtywine.se.`;
}

export const DIRTYWINE_INQUIRY_FOLLOW_UP =
  "Vi återkommer med bekräftelse och faktura så snart vi kan.";

export const DIRTYWINE_INQUIRY_EMAIL_HEADLINE =
  "Tack, vi har fått din förfrågan";
