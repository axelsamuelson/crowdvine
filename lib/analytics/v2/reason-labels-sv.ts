/**
 * Swedish display texts for Analytics V2 reason / step codes (Saga bilaga C).
 * Codes stay machine-readable in data; UI shows these labels with code in tooltip.
 */

export const CHECKOUT_STEP_REASON_LABELS_SV: Record<string, string> = {
  postal: "Postnummer",
  delivery: "Leverans",
  age_terms: "Ålder och villkor",
  payment: "Betalning",
};

/** checkout_abandoned step vocabulary → V2 step (or pre-checkout). */
export const ABANDON_STEP_MAP: Record<
  string,
  { mapped: string | null; label: string }
> = {
  cart: { mapped: null, label: "Varukorg (före kassan)" },
  postal: { mapped: "postal", label: "Postnummer" },
  delivery: { mapped: "delivery", label: "Leverans" },
  terms: { mapped: "age_terms", label: "Ålder och villkor" },
  age_terms: { mapped: "age_terms", label: "Ålder och villkor" },
  payment: { mapped: "payment", label: "Betalning" },
  confirm: { mapped: "payment", label: "Betalning (bekräftelse)" },
};

export const CHECKOUT_BLOCK_REASON_LABELS_SV: Record<string, string> = {
  missing_name: "Namn saknas",
  missing_email: "E-postadress saknas",
  invalid_email: "Ogiltig e-postadress",
  missing_phone: "Telefonnummer saknas",
  address_not_persisted: "Adressen kunde inte sparas",
  zone_required: "Adressen saknar leveranszon",
  pallet_required: "Ingen pall vald",
  delivery_not_selected: "Inget leveranssätt valt",
  direct_box_carrier_unconfigured: "Direktleverans saknar fraktbolag",
  quote_loading: "Fraktpriset beräknas fortfarande",
  quote_error: "Fraktberäkningen misslyckades",
  quote_missing: "Fraktpris saknas",
  quote_channel_mismatch: "Fraktpriset gäller ett annat leveranssätt",
  direct_box_shipping_pending: "Frakten för direktleverans beräknas",
  direct_box_shipping_unquoted: "Frakten för direktleverans saknar pris",
  direct_box_pact_rate_forbidden: "PACT-fraktpriset gäller inte direktleverans",
  purchase_disabled: "Köp är inte möjligt just nu",
};

export const SHIPPING_QUOTE_DELIVERY_LABELS_SV: Record<string, string> = {
  direct_box: "Direktleverans",
  shared_pallet: "Delad pall",
  all: "Alla leveranssätt",
};

export const SHIPPING_QUOTE_REASON_LABELS_SV: Record<string, string> = {
  auth_required: "Inte inloggad när frakten beräknades",
  quote_error: "Fraktberäkningen misslyckades",
  quote_timeout: "Fraktberäkningen tog för lång tid",
  quote_stale: "Fraktpriset var inaktuellt",
  unknown: "Okänt fraktfel",
};

export const SHIPPING_PREVIEW_REASON_LABELS_SV: Record<string, string> = {
  preview_error: "Fraktförhandsvisningen misslyckades",
  preview_timeout: "Fraktförhandsvisningen tog för lång tid",
  rate_missing: "Fraktpris saknas för marknaden",
  invalid_request: "Ogiltig förfrågan om frakt",
  unknown: "Okänt fraktfel",
};

export const ADD_TO_CART_FAILED_REASON_LABELS_SV: Record<string, string> = {
  http_error: "Kunde inte lägga i varukorgen (serverfel)",
  empty_cart: "Varukorgen var tom efter försöket",
  network_error: "Kunde inte lägga i varukorgen (nätverksfel)",
  unknown: "Okänd orsak",
};

export const CART_VALIDATION_FAILED_REASON_LABELS_SV: Record<string, string> = {
  minimum_bottle_count: "För få flaskor (sexflaskorsregeln)",
};

/** Align with bilaga C; supersedes shorter etapp-1 abandon labels where they differ. */
export const ABANDON_REASON_LABELS_SV_V2: Record<string, string> = {
  incomplete_fields: "Ofullständiga fält",
  validation_error: "Felaktiga uppgifter",
  left_checkout: "Lämnade kassan",
  no_pickup_for_cart: "Ingen leverans möjlig för varukorgen",
  login_wall: "Stoppades av inloggning",
  postal_out_of_zone: "Postnummer utanför zon",
  market_not_available: "Marknad ej tillgänglig",
  carrier_unconfigured: "Transportör saknas",
  payment_error: "Betalfel",
  flag_off: "Funktion avstängd",
};

export const ABANDON_CODE_LABELS_SV: Record<string, string> = {
  fields_incomplete: "Ofullständiga fält",
  setup_intent_failed: "Kortet kunde inte sparas",
  age_under_minimum: "Under åldersgränsen",
  login_required: "Inloggning krävs",
  no_pickup_for_cart: "Ingen leverans möjlig för varukorgen",
};

export const ABANDON_TRIGGER_LABELS_SV: Record<string, string> = {
  pagehide: "Lämnade eller stängde sidan",
  visibility_hidden: "Bytte flik eller app",
};

export const CHECKOUT_FIELD_LABELS_SV: Record<string, string> = {
  postal: "Postnummer",
  street: "Gatuadress",
  full_name: "Namn",
  email: "E-post",
  date_of_birth: "Födelsedatum",
  terms: "Villkor",
  card: "Kort",
  delivery: "Leveranssätt",
  auth: "Inloggning",
};

export const CHECKOUT_ERROR_CODE_LABELS_SV: Record<string, string> = {
  setup_intent_failed: "Kortet kunde inte sparas",
  age_under_minimum: "Under åldersgränsen",
  nonexistent_date: "Födelsedatumet finns inte",
  postal_invalid: "Ogiltigt postnummer",
  no_pickup_for_cart: "Ingen leverans möjlig för varukorgen",
  incomplete_number: "Kortnumret är ofullständigt",
};

const UNKNOWN = "Okänd orsak";

/** Label for a machine code; unknown → "Okänd orsak" (show code in tooltip). */
export function reasonLabelSv(
  code: string | null | undefined,
  map: Record<string, string>,
): string {
  if (!code) return UNKNOWN;
  return map[code] ?? UNKNOWN;
}

export function checkoutBlockReasonLabelSv(
  code: string | null | undefined,
): string {
  return reasonLabelSv(code, CHECKOUT_BLOCK_REASON_LABELS_SV);
}

export function shippingQuoteReasonLabelSv(
  code: string | null | undefined,
): string {
  return reasonLabelSv(code, SHIPPING_QUOTE_REASON_LABELS_SV);
}

export function shippingPreviewReasonLabelSv(
  code: string | null | undefined,
): string {
  return reasonLabelSv(code, SHIPPING_PREVIEW_REASON_LABELS_SV);
}

export function shippingDeliveryTypeLabelSv(
  code: string | null | undefined,
): string {
  if (!code) return UNKNOWN;
  return SHIPPING_QUOTE_DELIVERY_LABELS_SV[code] ?? UNKNOWN;
}

export function abandonReasonLabelSvV2(
  code: string | null | undefined,
): string {
  return reasonLabelSv(code, ABANDON_REASON_LABELS_SV_V2);
}

export function addToCartFailedReasonLabelSv(
  code: string | null | undefined,
): string {
  return reasonLabelSv(code, ADD_TO_CART_FAILED_REASON_LABELS_SV);
}
