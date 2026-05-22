import { DEFAULT_APP_LOCALE } from "@/lib/i18n/locale";
import { applyLocalePolicyToContext } from "@/lib/shopping-context/apply-locale-policy";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";
import type { ResolvedMarket } from "@/lib/market/resolve-market";
import type { ShoppingContext } from "@/lib/shopping-context/types";

const FALLBACK_ZONE: ResolvedActiveGeoZone = {
  geoZoneId: null,
  marketCode: "EU",
  countryCode: "SE",
  regionCode: null,
  city: null,
  displayName: "Sweden",
  zoneType: "country",
  eligibilityStatus: "normal_checkout",
  currencyCode: "SEK",
  source: "default",
  canStartCampaign: true,
  canReserveConditionally: false,
  canCheckoutNormally: true,
};

const FALLBACK_MARKET: ResolvedMarket = {
  marketCode: "EU",
  marketName: "Europe",
  countryCode: "SE",
  regionCode: null,
  currencyCode: "SEK",
  locale: "en",
  checkoutMode: "normal_checkout",
  paymentCaptureMode: "automatic",
  ageMinimum: null,
  termsVersion: null,
  countryRole: "checkout_eligible",
  isCheckoutEligible: true,
  isConditionalReservationEligible: false,
  isBrowseOnly: false,
};

/** Used when a client component renders outside ShoppingContextProvider (e.g. admin previews). */
export function fallbackShoppingContext(): ShoppingContext {
  return applyLocalePolicyToContext({
    locale: DEFAULT_APP_LOCALE,
    availableLocales: [],
    intlLocale: "en-GB",
    currencyCode: "SEK",
    sekToDisplayRate: 1,
    uiLocalizationEnabled: true,
    activeZone: FALLBACK_ZONE,
    market: FALLBACK_MARKET,
  });
}
