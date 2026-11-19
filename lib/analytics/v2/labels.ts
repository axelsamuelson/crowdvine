/**
 * Swedish labels and sv-SE formatters for Analytics V2 admin UI.
 */

import type { AnalyticsPageType } from "@/lib/analytics/v2/page-types";

export const CHANNEL_LABELS_SV: Record<string, string> = {
  organic: "Organisk sök",
  direct: "Direkt",
  social: "Socialt",
  referral: "Hänvisning",
  ai: "AI-assistent",
  internal: "Intern",
  paid: "Kampanj",
};

/** Alias for admin filter bar. */
export const CHANNEL_LABELS = CHANNEL_LABELS_SV;

export const DEVICE_LABELS_SV: Record<string, string> = {
  mobile: "Mobil",
  desktop: "Dator",
  tablet: "Surfplatta",
};

/** Alias for admin filter bar. */
export const DEVICE_LABELS = DEVICE_LABELS_SV;

export const MARKET_LABELS_SV: Record<string, string> = {
  all: "Alla marknader",
  SE: "Sverige",
  other: "Övriga",
  unknown: "Okänt land",
};

export const LANDING_TYPE_LABELS_SV: Record<AnalyticsPageType, string> = {
  start: "Start",
  plp: "Produktlista",
  pdp: "Produktsida",
  guide: "Guide",
  checkout: "Kassa",
  account: "Konto",
  producer: "Producent",
  other: "Övrigt",
};

export const CHECKOUT_STEP_LABELS_SV: Record<string, string> = {
  postal: "Postnummer",
  delivery: "Leverans",
  age_terms: "Ålder och villkor",
  payment: "Betalning",
};

/** Known checkout_abandoned.abandon_reason codes → Swedish. */
export const ABANDON_REASON_LABELS_SV: Record<string, string> = {
  incomplete_fields: "Ofullständiga fält",
  left_checkout: "Lämnade kassan",
  validation_error: "Valideringsfel",
  postal_out_of_zone: "Postnummer utanför zon",
  market_not_available: "Marknad ej tillgänglig",
  carrier_unconfigured: "Transportör saknas",
  payment_error: "Betalfel",
  login_wall: "Inloggningsvägg",
  flag_off: "Funktion avstängd",
};

export const FULFILLMENT_LABELS_SV: Record<string, string> = {
  shared_pallet: "Delad pall",
  pallet: "Delad pall",
  shared: "Delad pall",
  direct_box: "Direktleverans",
};

export function channelLabelSv(channel: string | null | undefined): string {
  if (!channel) return "Okänd kanal";
  return CHANNEL_LABELS_SV[channel] ?? channel;
}

export function deviceLabelSv(device: string | null | undefined): string {
  if (!device) return "Okänd enhet";
  return DEVICE_LABELS_SV[device] ?? device;
}

export function marketLabelSv(market: string | null | undefined): string {
  if (!market || market === "all") return MARKET_LABELS_SV.all;
  if (market === "SE") return MARKET_LABELS_SV.SE;
  if (market === "other") return MARKET_LABELS_SV.other;
  if (market === "unknown") return MARKET_LABELS_SV.unknown;
  return market;
}

export function landingTypeLabelSv(
  type: string | null | undefined,
): string {
  if (!type) return LANDING_TYPE_LABELS_SV.other;
  return (
    LANDING_TYPE_LABELS_SV[type as AnalyticsPageType] ?? type
  );
}

export function checkoutStepLabelSv(step: string | null | undefined): string {
  if (!step) return "Okänt steg";
  return CHECKOUT_STEP_LABELS_SV[step] ?? step;
}

export function abandonReasonLabelSv(
  reason: string | null | undefined,
): string {
  if (!reason) return "Okänd orsak";
  return ABANDON_REASON_LABELS_SV[reason] ?? reason;
}

export function fulfillmentLabelSv(
  channel: string | null | undefined,
): string {
  if (!channel) return "Delad pall";
  return FULFILLMENT_LABELS_SV[channel] ?? channel;
}

/** Alias used by overview panel. */
export const labelFulfillment = fulfillmentLabelSv;

const svNumber = new Intl.NumberFormat("sv-SE");
const svPercent = new Intl.NumberFormat("sv-SE", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const svSek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** e.g. 1040 → "1 040" */
export function formatSvNumber(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return svNumber.format(n);
}

/**
 * Fraction 0–1 → "4,0 %". Pass already-scaled percent (e.g. 4 for 4%) via
 * `{ asPercent: true }`.
 */
export function formatSvPercent(
  value: number | null | undefined,
  opts?: { asPercent?: boolean },
): string {
  if (value == null || Number.isNaN(value)) return "—";
  const fraction = opts?.asPercent ? value / 100 : value;
  // Intl percent puts a non-breaking space before % in sv-SE.
  return svPercent.format(fraction);
}

/** e.g. 5362.63 → "5 362,63 kr" */
export function formatSvSek(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return "—";
  return svSek.format(n);
}
