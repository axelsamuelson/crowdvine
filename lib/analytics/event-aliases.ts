/**
 * Canonical analytics event_type names + backward-compat aliases.
 *
 * Emit only canonical names going forward. When reading historical
 * user_events rows, run canonicalizeEventType() so old and new collapse.
 */

/** Legacy event_type → canonical event_type */
export const LEGACY_EVENT_TYPE_ALIASES: Readonly<Record<string, string>> = {
  signup_started: "auth_email_step_shown",
  signup_completed: "auth_email_step_completed",
  signup_abandoned: "auth_email_step_abandoned",
  payment_failed: "checkout_confirm_failed",
  age_verification_shown: "age_confirmation_shown",
  age_verification_passed: "age_confirmed",
  age_verification_failed: "age_confirmation_failed",
};

/** All known spellings (legacy + canonical) for a canonical type — for SQL `.in()` filters. */
export function eventTypeQueryVariants(canonical: string): string[] {
  const variants = new Set<string>([canonical]);
  for (const [legacy, canon] of Object.entries(LEGACY_EVENT_TYPE_ALIASES)) {
    if (canon === canonical) variants.add(legacy);
  }
  return [...variants];
}

export function canonicalizeEventType(raw: string): string {
  return LEGACY_EVENT_TYPE_ALIASES[raw] ?? raw;
}

/** Swedish labels for admin analytics timelines (canonical or legacy). */
const EVENT_TYPE_LABELS_SV: Readonly<Record<string, string>> = {
  auth_email_step_shown: "Inloggningssteg visat (e-post)",
  auth_email_step_completed: "Inloggning via e-post klar",
  auth_email_step_abandoned: "Inloggningssteg övergivet",
  auth_email_link_sent: "Inloggningslänk skickad",
  checkout_delivery_captured: "Leveransuppgifter sparade",
  checkout_confirm_failed: "Checkout-bekräftelse misslyckades",
  age_confirmation_shown: "Åldersbekräftelse visad",
  age_confirmed: "Ålder bekräftad",
  age_confirmation_failed: "Åldersbekräftelse underkänd",
  checkout_started: "Checkout startad",
  checkout_step_viewed: "Checkout-steg visat",
  checkout_abandoned: "Checkout övergiven",
  reservation_completed: "Reservation skapad",
  terms_accepted: "Köpvillkor godkända",
  add_to_cart: "Tillagd i varukorg",
  remove_from_cart: "Borttagen från varukorg",
  cart_opened: "Varukorg öppnad",
  page_view: "Sidvisning",
  product_viewed: "Produktvy",
  product_list_viewed: "Produktlista",
  signup_started: "Inloggningssteg visat (e-post)",
  signup_completed: "Inloggning via e-post klar",
  signup_abandoned: "Inloggningssteg övergivet",
  payment_failed: "Checkout-bekräftelse misslyckades",
  age_verification_shown: "Åldersbekräftelse visad",
  age_verification_passed: "Ålder bekräftad",
  age_verification_failed: "Åldersbekräftelse underkänd",
};

export function eventTypeLabelSv(raw: string): string {
  const canonical = canonicalizeEventType(raw);
  return EVENT_TYPE_LABELS_SV[raw] ?? EVENT_TYPE_LABELS_SV[canonical] ?? canonical;
}

/** Phase labels for checkout_step_viewed metadata.phase */
export function checkoutPhaseLabelSv(phase: string | null | undefined): string {
  if (!phase) return "okänd";
  if (phase === "delivery") return "leverans";
  if (phase === "payment_ready") return "betalning";
  return phase;
}
