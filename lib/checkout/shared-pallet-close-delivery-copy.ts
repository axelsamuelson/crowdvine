/**
 * Shared-pallet close + post-close delivery copy (customer-facing).
 * Owner-approved full text — change SV/EN here for confirmation page + email.
 * Checkout uses the shorter CHECKOUT_* two-line helpers (no window/day sentence).
 *
 * Placeholder: `{datum}` = localized charge-deadline date from
 * `formatSharedPalletChargeDeadline`.
 */

/** Swedish — full copy for confirmation page + email. */
export const SHARED_PALLET_CLOSE_DELIVERY_COPY_SV =
  "Pallen stänger när den är full, senast {datum}. Leverans sker normalt inom 2–3 veckor efter att pallen stängt och alltid senast 30 dagar efter. När pallen har skickats får du ett beräknat leveransfönster, och leveransdagen när vinet nått Sverige.";

/** English — full copy for confirmation page + email. */
export const SHARED_PALLET_CLOSE_DELIVERY_COPY_EN =
  "The pallet closes when full, by {datum} at the latest. Delivery normally takes 2–3 weeks after the pallet closes and always within 30 days. Once the pallet has shipped you'll get an estimated delivery window, and the delivery day once the wine has reached Sweden.";

/** Checkout-only close line (design lead — two short lines). */
export const CHECKOUT_PALLET_CLOSE_LINE_SV =
  "Pallen stänger när den är full, senast {datum}.";
export const CHECKOUT_PALLET_CLOSE_LINE_EN =
  "The pallet closes when full, by {datum} at the latest.";

/** Checkout-only delivery line (no window / delivery-day sentence). */
export const CHECKOUT_PALLET_DELIVERY_LINE_SV =
  "Leverans normalt 2–3 veckor därefter, alltid inom 30 dagar.";
export const CHECKOUT_PALLET_DELIVERY_LINE_EN =
  "Delivery normally 2–3 weeks after that, always within 30 days.";

/**
 * Direct-box delivery label: home delivery only — no carrier brand, no ETA
 * (carrier contract unsigned; DIRECT may still be OFF in production).
 */
export const DIRECT_BOX_DELIVERY_COPY_SV = "Hemleverans";
export const DIRECT_BOX_DELIVERY_COPY_EN = "Home delivery";

function applyDatum(template: string, datum: string): string {
  return template.replace(/\{datum\}/g, datum);
}

function omitMissingDatum(
  locale: "sv" | "en",
  template: string,
): string {
  if (locale === "en") {
    return template
      .replace(/, by \{datum\} at the latest/i, "")
      .replace(/\{datum\}/g, "");
  }
  return template
    .replace(/, senast \{datum\}/i, "")
    .replace(/\{datum\}/g, "");
}

/**
 * Full close/delivery copy (confirmation page + email).
 * When `datum` is missing, drops the date clause only.
 */
export function formatSharedPalletCloseDeliveryCopy(
  locale: "sv" | "en",
  datum: string | null | undefined,
): string {
  const template =
    locale === "en"
      ? SHARED_PALLET_CLOSE_DELIVERY_COPY_EN
      : SHARED_PALLET_CLOSE_DELIVERY_COPY_SV;
  const d = typeof datum === "string" ? datum.trim() : "";
  if (d) return applyDatum(template, d);
  return omitMissingDatum(locale, template);
}

/**
 * Checkout delivery block: exactly two short lines (close + delivery).
 * No debit/charge line — charge timing lives only in the binding legal line.
 */
export function formatCheckoutPalletDeliveryLines(
  locale: "sv" | "en",
  datum: string | null | undefined,
): { closeLine: string; deliveryLine: string } {
  const closeTemplate =
    locale === "en"
      ? CHECKOUT_PALLET_CLOSE_LINE_EN
      : CHECKOUT_PALLET_CLOSE_LINE_SV;
  const deliveryLine =
    locale === "en"
      ? CHECKOUT_PALLET_DELIVERY_LINE_EN
      : CHECKOUT_PALLET_DELIVERY_LINE_SV;
  const d = typeof datum === "string" ? datum.trim() : "";
  const closeLine = d
    ? applyDatum(closeTemplate, d)
    : omitMissingDatum(locale, closeTemplate);
  return { closeLine, deliveryLine };
}

export function directBoxDeliveryCopy(locale: "sv" | "en"): string {
  return locale === "en"
    ? DIRECT_BOX_DELIVERY_COPY_EN
    : DIRECT_BOX_DELIVERY_COPY_SV;
}
