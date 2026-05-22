import type { AppLocale } from "@/lib/i18n/locale";
import type { ResolvedActiveGeoZone } from "@/lib/market/resolve-active-geo-zone";
import type { ResolvedMarket } from "@/lib/market/resolve-market";

/** Single resolved shopping context: geo + market rules + language + display currency. */
export type ShoppingContext = {
  locale: AppLocale;
  /** Locales the user may select in the header (US → en only). */
  availableLocales: AppLocale[];
  intlLocale: string;
  currencyCode: string;
  /** Multiplier: display units per 1 SEK (1 when currency is SEK). */
  sekToDisplayRate: number;
  uiLocalizationEnabled: boolean;
  activeZone: ResolvedActiveGeoZone;
  market: ResolvedMarket;
};
