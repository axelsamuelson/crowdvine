import {
  intlLocaleForAppLocale,
  isAppLocale,
  parseLocaleCookie,
  type AppLocale,
} from "@/lib/i18n/locale";
import {
  FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED,
  isUiLocalizationEnabled,
} from "@/lib/localization";
import {
  resolveActiveGeoZoneAnonymous,
  resolveActiveGeoZoneForUser,
  type ResolvedActiveGeoZone,
} from "@/lib/market/resolve-active-geo-zone";
import { resolveMarketForCountry } from "@/lib/market/resolve-market";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { applyLocalePolicyToContext } from "@/lib/shopping-context/apply-locale-policy";
import { resolveDisplayCurrencyCode } from "@/lib/shopping-context/currency-policy";
import { getSekToDisplayRate } from "@/lib/shopping-context/display-currency";
import type { ShoppingContext } from "@/lib/shopping-context/types";

export type ResolveShoppingContextInput = {
  userId?: string | null;
  host?: string | null;
  searchParams?: { get: (key: string) => string | null } | null;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  /** Locale implied by /vin (sv) or /wine (en) shop paths — wins over cookie. */
  pathLocale?: AppLocale | null;
};

async function loadUserPreferredLocale(
  userId: string,
): Promise<AppLocale | null> {
  try {
    const sb = getSupabaseAdmin();
    const { data, error } = await sb
      .from("profiles")
      .select("preferred_locale")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("[shopping-context] preferred_locale:", error.message);
      return null;
    }
    const raw = (data as { preferred_locale?: unknown } | null)?.preferred_locale;
    if (typeof raw === "string" && isAppLocale(raw)) return raw;
    return null;
  } catch (e) {
    console.warn("[shopping-context] preferred_locale load failed:", e);
    return null;
  }
}

/**
 * Language comes only from the URL when the path has one.
 * Zone, market, Accept-Language and preferred_locale do not change it.
 * Locale-less routes (`/checkout`, `/profile`) follow the last language URL
 * stored in the locale cookie, otherwise Swedish.
 */
export function resolveAppLocale(params: {
  uiLocalizationEnabled: boolean;
  marketLocale: string;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  userPreferred?: AppLocale | null;
  activeZone: ResolvedActiveGeoZone;
  pathLocale?: AppLocale | null;
  /** Signed-in profile. Guests have no preferred_locale row. */
  hasUser?: boolean;
}): AppLocale {
  // Dirtywine (localization off): fixed Swedish UI — not DEFAULT_APP_LOCALE (en).
  if (!params.uiLocalizationEnabled) {
    return FIXED_LOCALE_WHEN_LOCALIZATION_DISABLED;
  }
  if (params.pathLocale) return params.pathLocale;
  return parseLocaleCookie(params.cookieLocale) ?? "sv";
}

export async function resolveShoppingContext(
  input: ResolveShoppingContextInput,
): Promise<ShoppingContext> {
  const host = input.host ?? null;
  const uiLocalizationEnabled = isUiLocalizationEnabled(
    host,
    input.searchParams ?? null,
  );

  const activeZone = input.userId
    ? await resolveActiveGeoZoneForUser(input.userId)
    : await resolveActiveGeoZoneAnonymous();

  const market = await resolveMarketForCountry({
    countryCode: activeZone.countryCode,
    regionCode: activeZone.regionCode,
  });

  const userPreferred = input.userId
    ? await loadUserPreferredLocale(input.userId)
    : null;

  const locale = resolveAppLocale({
    uiLocalizationEnabled,
    marketLocale: market.locale,
    cookieLocale: input.cookieLocale,
    acceptLanguage: input.acceptLanguage,
    userPreferred,
    activeZone,
    pathLocale: input.pathLocale ?? null,
    hasUser: Boolean(input.userId),
  });

  const currencyCode = resolveDisplayCurrencyCode({
    zoneCurrencyCode: activeZone.currencyCode,
    marketCurrencyCode: market.currencyCode,
    countryCode: activeZone.countryCode,
    marketCode: activeZone.marketCode,
  });
  const sekToDisplayRate = await getSekToDisplayRate(currencyCode);

  return applyLocalePolicyToContext({
    locale,
    availableLocales: [],
    intlLocale: intlLocaleForAppLocale(locale),
    currencyCode,
    sekToDisplayRate,
    uiLocalizationEnabled,
    activeZone,
    market,
  });
}

/** Stripe API currency (lowercase ISO 4217). */
export function stripeCurrencyFromContext(ctx: ShoppingContext): string {
  return ctx.currencyCode.trim().toLowerCase() || "sek";
}
