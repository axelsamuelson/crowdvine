/**
 * Shared-pallet close + post-close delivery copy (customer-facing).
 * Pending legal/ops sign-off — change SV/EN here only (no Budbee / carrier brand).
 *
 * Placeholder: `{datum}` = localized charge-deadline date from
 * `formatSharedPalletChargeDeadline`.
 */

/** Swedish — single source for the shared-pallet close/delivery line. */
export const SHARED_PALLET_CLOSE_DELIVERY_COPY_SV =
  "Pallen stänger när den är full, senast {datum}. Leverans sker normalt inom 1–2 veckor efter att pallen stängt, och du får exakt leveransdag när pallen stängt.";

/** English — single source for the shared-pallet close/delivery line. */
export const SHARED_PALLET_CLOSE_DELIVERY_COPY_EN =
  "The pallet closes when full, by {datum} at the latest. Delivery normally takes 1–2 weeks after the pallet closes, and you'll get the exact delivery day when it closes.";

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
