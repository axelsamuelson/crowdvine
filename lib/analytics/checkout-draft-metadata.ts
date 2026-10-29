import type { ZoneDeliveryLines } from "@/lib/checkout/user-zone-delivery-template";

/**
 * Privacy-safe checkout field snapshot for analytics.
 * Never includes name, email, phone, street, city, or birth date — only booleans
 * and non-PII codes (country/region) plus postal digits when relevant.
 */
export type CheckoutFieldFlags = {
  has_full_name: boolean;
  has_email: boolean;
  has_phone: boolean;
  has_street: boolean;
  has_city: boolean;
  has_postal: boolean;
  country_code: string | null;
  region_code: string | null;
};

/** Snapshot of which checkout form fields are filled (no PII values). */
export function deliveryLinesForAnalytics(
  lines: ZoneDeliveryLines | null | undefined,
): CheckoutFieldFlags {
  if (!lines) {
    return {
      has_full_name: false,
      has_email: false,
      has_phone: false,
      has_street: false,
      has_city: false,
      has_postal: false,
      country_code: null,
      region_code: null,
    };
  }
  const filled = (v: string | null | undefined) => Boolean((v ?? "").trim());
  return {
    has_full_name: filled(lines.fullName),
    has_email: filled(lines.email),
    has_phone: filled(lines.phone),
    has_street: filled(lines.street),
    has_city: filled(lines.city),
    has_postal: filled(lines.postal),
    country_code: filled(lines.countryCode)
      ? (lines.countryCode ?? "").trim().toUpperCase()
      : null,
    region_code: filled(lines.regionCode)
      ? (lines.regionCode ?? "").trim().toUpperCase()
      : null,
  };
}

export function normalizePostalDraft(raw: string | null | undefined): string {
  return (raw ?? "").trim().replace(/\s+/g, "");
}

/** Digits-only postal draft for analytics (no letters/spaces). */
export function postalDigitsOnly(raw: string | null | undefined): string {
  return (raw ?? "").replace(/\D/g, "");
}

export function postalDraftAnalytics(raw: string | null | undefined): {
  /** Digits only — never store spaced/formatted postcodes with other personal data. */
  postal_digits: string;
  digits: number;
  complete: boolean;
} | null {
  const digitsOnly = postalDigitsOnly(raw);
  if (!digitsOnly) return null;
  return {
    postal_digits: digitsOnly,
    digits: digitsOnly.length,
    complete: /^\d{5}$/.test(digitsOnly),
  };
}

/**
 * Infer missing required fields for the current checkout step (for abandon reason).
 */
export function missingCheckoutFields(
  step: string,
  flags: CheckoutFieldFlags,
  extras?: { has_dob?: boolean; has_terms?: boolean },
): string[] {
  const missing: string[] = [];
  if (step === "postal" || step === "delivery") {
    if (!flags.has_postal) missing.push("postal");
  }
  if (step === "delivery") {
    if (!flags.has_street) missing.push("street");
    if (!flags.has_city) missing.push("city");
    if (!flags.has_full_name) missing.push("full_name");
    if (!flags.has_email) missing.push("email");
  }
  if (step === "age_terms") {
    if (!extras?.has_dob) missing.push("date_of_birth");
    if (!extras?.has_terms) missing.push("terms");
  }
  return missing;
}

/** Compact summary for admin event timelines (privacy-safe). */
export function formatCheckoutDraftSummary(meta: Record<string, unknown>): string {
  const parts: string[] = [];

  const reason =
    typeof meta.abandon_reason === "string"
      ? meta.abandon_reason
      : typeof meta.reason === "string"
        ? meta.reason
        : null;
  const field = typeof meta.field === "string" ? meta.field : null;
  const code = typeof meta.code === "string" ? meta.code : null;
  if (reason) {
    const detail = [field, code].filter(Boolean).join("/");
    parts.push(detail ? `${reason} (${detail})` : reason);
  } else if (code) {
    parts.push(field ? `${code} · ${field}` : code);
  }

  const filledLabels: string[] = [];
  if (meta.has_full_name === true) filledLabels.push("namn");
  if (meta.has_email === true) filledLabels.push("e-post");
  if (meta.has_phone === true) filledLabels.push("telefon");
  if (meta.has_street === true) filledLabels.push("gata");
  if (meta.has_city === true) filledLabels.push("ort");
  if (meta.has_postal === true || meta.postal_complete === true) {
    filledLabels.push("postnr");
  }
  if (filledLabels.length > 0) {
    parts.push(`ifyllt: ${filledLabels.join(", ")}`);
  }

  const postalDigits =
    typeof meta.postal_digits === "string"
      ? meta.postal_digits.trim()
      : typeof meta.postal === "string" && /^\d+$/.test(meta.postal.trim())
        ? meta.postal.trim()
        : "";
  const postalIncomplete =
    Boolean(postalDigits) &&
    (meta.postal_complete === false || meta.complete === false);
  if (postalDigits) {
    const digitCount =
      typeof meta.digits === "number"
        ? meta.digits
        : postalDigits.replace(/\D/g, "").length;
    if (postalIncomplete) {
      parts.push(`postnr ${postalDigits} (${digitCount} siffror, ofullständigt)`);
    } else {
      parts.push(`postnr ${postalDigits}`);
    }
  }

  if (meta.has_date_of_birth === true || meta.dob_filled === true) {
    parts.push("födelsedatum ifyllt");
  }

  if (typeof meta.step === "string" && meta.step.trim() && parts.length === 0) {
    parts.push(`steg: ${meta.step}`);
  } else if (
    typeof meta.phase === "string" &&
    meta.phase.trim() &&
    parts.length === 0
  ) {
    parts.push(`fas: ${meta.phase}`);
  }

  const requiredQty =
    typeof meta.required_quantity === "number"
      ? meta.required_quantity
      : typeof meta.needed_total === "number"
        ? meta.needed_total
        : null;
  if (requiredQty != null && requiredQty > 0) {
    parts.push(`krav: ${requiredQty} flaskor`);
  }

  return parts.join(" · ");
}
