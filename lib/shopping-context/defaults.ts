import {
  DEFAULT_APP_LOCALE,
  intlLocaleForAppLocale,
  type AppLocale,
} from "@/lib/i18n/locale";
import { applyLocalePolicyToContext } from "@/lib/shopping-context/apply-locale-policy";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";
import type { ResolvedMarket } from "@/lib/market/resolve-market";
import type { ShoppingContext } from "@/lib/shopping-context/types";

/** Unknown country. Never Sweden, and never allowed to check out. */
const FALLBACK_ZONE: ResolvedActiveGeoZone = {
  geoZoneId: null,
  marketCode: "UN",
  countryCode: "XX",
  regionCode: null,
  city: null,
  displayName: "Unknown",
  zoneType: "country",
  eligibilityStatus: "interest_only",
  currencyCode: "SEK",
  source: "default",
  canStartCampaign: false,
  canReserveConditionally: false,
  canCheckoutNormally: false,
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
  // EU retail floor; production sets markets.age_minimum=20 for EU.
  ageMinimum: 20,
  termsVersion: null,
  countryRole: "checkout_eligible",
  isCheckoutEligible: false,
  isConditionalReservationEligible: false,
  isBrowseOnly: false,
};

/** Used when a client component renders outside ShoppingContextProvider (e.g. admin previews). */
export function fallbackShoppingContext(
  locale: AppLocale = DEFAULT_APP_LOCALE,
): ShoppingContext {
  return applyLocalePolicyToContext({
    locale,
    availableLocales: [],
    intlLocale: intlLocaleForAppLocale(locale),
    currencyCode: "SEK",
    sekToDisplayRate: 1,
    uiLocalizationEnabled: true,
    activeZone: FALLBACK_ZONE,
    market: FALLBACK_MARKET,
  });
}
