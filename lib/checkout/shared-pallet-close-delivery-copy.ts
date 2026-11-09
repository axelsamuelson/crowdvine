/**
 * Shared-pallet close + post-close delivery copy (customer-facing).
 * Owner-approved — change SV/EN here only (no Budbee / carrier brand).
 * Also used on order confirmation page + confirmation email.
 *
 * Placeholder: `{datum}` = localized charge-deadline date from
 * `formatSharedPalletChargeDeadline`.
 */

/** Swedish — single source for the shared-pallet close/delivery line. */
export const SHARED_PALLET_CLOSE_DELIVERY_COPY_SV =
  "Pallen stänger när den är full, senast {datum}. Leverans sker normalt inom 2–3 veckor efter att pallen stängt och alltid senast 30 dagar efter. När pallen har skickats får du ett beräknat leveransfönster, och leveransdagen när vinet nått Sverige.";

/** English — single source for the shared-pallet close/delivery line. */
export const SHARED_PALLET_CLOSE_DELIVERY_COPY_EN =
  "The pallet closes when full, by {datum} at the latest. Delivery normally takes 2–3 weeks after the pallet closes and always within 30 days. Once the pallet has shipped you'll get an estimated delivery window, and the delivery day once the wine has reached Sweden.";

/**
 * Direct-box delivery label: home delivery only — no carrier brand, no ETA
 * (carrier contract unsigned; DIRECT may still be OFF in production).
 */
export const DIRECT_BOX_DELIVERY_COPY_SV = "Hemleverans";
export const DIRECT_BOX_DELIVERY_COPY_EN = "Home delivery";

function applyDatum(template: string, datum: string): string {
  return template.replace(/\{datum\}/g, datum);
}

/**
 * Format the shared-pallet close/delivery line for the given locale.
 * When `datum` is missing, drops the "senast {datum}" / "by {datum}…" clause
 * but keeps the same delivery explanation (still one SV/EN source template).
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

  if (locale === "en") {
    return template
      .replace(/, by \{datum\} at the latest/i, "")
      .replace(/\{datum\}/g, "");
  }
  return template
    .replace(/, senast \{datum\}/i, "")
    .replace(/\{datum\}/g, "");
}

export function directBoxDeliveryCopy(locale: "sv" | "en"): string {
  return locale === "en"
    ? DIRECT_BOX_DELIVERY_COPY_EN
    : DIRECT_BOX_DELIVERY_COPY_SV;
}
