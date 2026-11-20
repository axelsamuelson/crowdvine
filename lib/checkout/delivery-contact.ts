/**
 * Checkout delivery/contact field gates (display + auto-save).
 * Keep collapse / save / age-unlock prerequisites aligned — never treat
 * `test@` as a complete email or skip phone when collapsing to "saved".
 */

/** Same shape as ensure-session / common checkout email checks. */
export function isCheckoutEmailComplete(raw: string | null | undefined): boolean {
  const email = (raw ?? "").trim();
  if (!email || email.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Delivery phone: at least 6 significant chars after trim (matches form UI). */
export function isCheckoutPhoneComplete(raw: string | null | undefined): boolean {
  return (raw ?? "").trim().length >= 6;
}

export type CheckoutContactFields = {
  fullName?: string | null;
  email?: string | null;
  phone?: string | null;
};

/**
 * Name + valid email + phone — required before address step collapses
 * to the saved summary (and before auto-save).
 */
export function isCheckoutContactComplete(
  fields: CheckoutContactFields | null | undefined,
): boolean {
  if (!fields) return false;
  const nameOk = (fields.fullName ?? "").trim().length > 1;
  return (
    nameOk &&
    isCheckoutEmailComplete(fields.email) &&
    isCheckoutPhoneComplete(fields.phone)
  );
}

/**
 * Why the address/compliance handoff is still blocked (privacy-safe codes only).
 * Returns null when contact is complete.
 */
export function checkoutContactBlockReason(
  fields: CheckoutContactFields | null | undefined,
): "missing_name" | "missing_email" | "invalid_email" | "missing_phone" | null {
  if (!fields) return "missing_name";
  if ((fields.fullName ?? "").trim().length <= 1) return "missing_name";
  const email = (fields.email ?? "").trim();
  if (!email) return "missing_email";
  if (!isCheckoutEmailComplete(email)) return "invalid_email";
  if (!isCheckoutPhoneComplete(fields.phone)) return "missing_phone";
  return null;
}
