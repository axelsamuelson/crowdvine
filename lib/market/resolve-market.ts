import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { normalizeProfileCountry, type CountryMarketMode } from "@/lib/countries";
import { isUsConditionalReservationsEnabledServer } from "@/lib/market/feature-flags";

export type CheckoutMode =
  | "disabled"
  | "interest_only"
  | "conditional_reservation"
  | "normal_checkout";

export type PaymentCaptureMode = "manual" | "automatic" | "admin_approved";

export type CountryRole =
  | "browse_only"
  | "checkout_eligible"
  | "conditional_eligible"
  | "blocked";

export type ResolvedMarket = {
  marketCode: string;
  marketName: string;
  countryCode: string;
  regionCode?: string | null;
  currencyCode: string;
  locale: string;
  checkoutMode: CheckoutMode;
  paymentCaptureMode: PaymentCaptureMode;
  ageMinimum?: number | null;
  termsVersion?: string | null;
  countryRole: CountryRole;
  isCheckoutEligible: boolean;
  isConditionalReservationEligible: boolean;
  isBrowseOnly: boolean;
  reason?: string;
};

type MarketRow = {
  code: string;
  name: string;
  default_country_code: string | null;
  currency_code: string;
  locale: string;
  checkout_mode: string;
  payment_capture_mode: string;
  age_minimum: number | null;
  terms_version: string | null;
  is_active: boolean;
};

type MarketCountryRow = {
  market_code: string;
  country_code: string;
  role: string;
};

const DISABLED: ResolvedMarket = {
  marketCode: "UNKNOWN",
  marketName: "Unknown",
  countryCode: "",
  regionCode: null,
  currencyCode: "SEK",
  locale: "en",
  checkoutMode: "disabled",
  paymentCaptureMode: "manual",
  ageMinimum: null,
  termsVersion: null,
  countryRole: "blocked",
  isCheckoutEligible: false,
  isConditionalReservationEligible: false,
  isBrowseOnly: false,
  reason: undefined,
};

function isCheckoutMode(x: string): x is CheckoutMode {
  return (
    x === "disabled" ||
    x === "interest_only" ||
    x === "conditional_reservation" ||
    x === "normal_checkout"
  );
}

function isPaymentCaptureMode(x: string): x is PaymentCaptureMode {
  return x === "manual" || x === "automatic" || x === "admin_approved";
}

function isCountryRole(x: string): x is CountryRole {
  return (
    x === "browse_only" ||
    x === "checkout_eligible" ||
    x === "conditional_eligible" ||
    x === "blocked"
  );
}

/** Map resolver outcome to legacy {@link CountryMarketMode} for diff logging. */
export function legacyMarketModeFromResolved(
  r: ResolvedMarket,
): CountryMarketMode {
  if (r.checkoutMode === "normal_checkout" && r.isCheckoutEligible) {
    return "normal_checkout";
  }
  if (
    r.checkoutMode === "conditional_reservation" &&
    r.isConditionalReservationEligible
  ) {
    return "conditional_reservation";
  }
  return "unsupported";
}

export async function resolveMarketForCountry(params: {
  countryCode: string;
  regionCode?: string | null;
}): Promise<ResolvedMarket> {
  const normalized = normalizeProfileCountry(params.countryCode);
  if (!normalized) {
    return {
      ...DISABLED,
      countryCode: String(params.countryCode ?? "").trim().toUpperCase() || "",
      regionCode: params.regionCode ?? null,
      reason: "Country could not be normalized to ISO alpha-2",
    };
  }

  const cc = normalized.toUpperCase();
  const sb = getSupabaseAdmin();

  const { data: mcRow, error: mcErr } = await sb
    .from("market_countries")
    .select("market_code, country_code, role")
    .eq("country_code", cc)
    .maybeSingle();

  if (mcErr) {
    console.error("[resolveMarket] market_countries query:", mcErr.message);
    return {
      ...DISABLED,
      countryCode: cc,
      regionCode: params.regionCode ?? null,
      reason: `market_countries query failed: ${mcErr.message}`,
    };
  }

  if (!mcRow || typeof mcRow.market_code !== "string") {
    return {
      ...DISABLED,
      countryCode: cc,
      regionCode: params.regionCode ?? null,
      reason: "No market_countries row for this country",
    };
  }

  const mc = mcRow as MarketCountryRow;
  if (!isCountryRole(mc.role)) {
    return {
      ...DISABLED,
      countryCode: cc,
      regionCode: params.regionCode ?? null,
      reason: `Invalid market_countries.role: ${mc.role}`,
    };
  }

  const { data: market, error: mErr } = await sb
    .from("markets")
    .select("*")
    .eq("code", mc.market_code)
    .maybeSingle();

  if (mErr || !market) {
    console.error("[resolveMarket] markets query:", mErr?.message);
    return {
      ...DISABLED,
      countryCode: cc,
      regionCode: params.regionCode ?? null,
      reason: mErr?.message ?? "Market not found",
    };
  }

  const m = market as MarketRow;
  if (!m.is_active) {
    return {
      ...DISABLED,
      marketCode: m.code,
      marketName: m.name,
      countryCode: cc,
      regionCode: params.regionCode ?? null,
      currencyCode: m.currency_code,
      locale: m.locale,
      checkoutMode: "disabled",
      paymentCaptureMode: isPaymentCaptureMode(m.payment_capture_mode)
        ? m.payment_capture_mode
        : "manual",
      ageMinimum: m.age_minimum,
      termsVersion: m.terms_version,
      countryRole: mc.role,
      isCheckoutEligible: false,
      isConditionalReservationEligible: false,
      isBrowseOnly: true,
      reason: "Market is inactive",
    };
  }

  if (!isCheckoutMode(m.checkout_mode) || !isPaymentCaptureMode(m.payment_capture_mode)) {
    return {
      ...DISABLED,
      countryCode: cc,
      regionCode: params.regionCode ?? null,
      reason: "Invalid markets.checkout_mode or payment_capture_mode",
    };
  }

  let checkoutMode: CheckoutMode = m.checkout_mode;
  let countryRole: CountryRole = mc.role;
  let isCheckoutEligible =
    mc.role === "checkout_eligible" && checkoutMode === "normal_checkout";
  let isConditionalReservationEligible =
    mc.role === "conditional_eligible" &&
    checkoutMode === "conditional_reservation";
  let isBrowseOnly = mc.role === "browse_only";
  let reason: string | undefined;

  if (mc.role === "blocked") {
    isCheckoutEligible = false;
    isConditionalReservationEligible = false;
    isBrowseOnly = false;
    checkoutMode = "disabled";
    reason = "Country is blocked for this market";
  }

  // Feature flag: US conditional must not proceed without explicit env enablement.
  if (
    cc === "US" &&
    isConditionalReservationEligible &&
    !isUsConditionalReservationsEnabledServer()
  ) {
    isConditionalReservationEligible = false;
    isCheckoutEligible = false;
    isBrowseOnly = true;
    checkoutMode = "disabled";
    reason =
      "US conditional reservations are disabled (set ENABLE_US_CONDITIONAL_RESERVATIONS=true to enable)";
  }

  return {
    marketCode: m.code,
    marketName: m.name,
    countryCode: cc,
    regionCode: params.regionCode ?? null,
    currencyCode: m.currency_code,
    locale: m.locale,
    checkoutMode,
    paymentCaptureMode: m.payment_capture_mode,
    ageMinimum: m.age_minimum,
    termsVersion: m.terms_version,
    countryRole,
    isCheckoutEligible,
    isConditionalReservationEligible,
    isBrowseOnly:
      isBrowseOnly ||
      (!isCheckoutEligible &&
        !isConditionalReservationEligible &&
        checkoutMode !== "normal_checkout"),
    reason,
  };
}
