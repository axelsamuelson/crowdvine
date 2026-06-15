import {
  appLocaleFromMarketLocale,
  DEFAULT_APP_LOCALE,
  intlLocaleForAppLocale,
  isAppLocale,
  localeFromAcceptLanguage,
  parseLocaleCookie,
  type AppLocale,
} from "@/lib/i18n/locale";
import { isUiLocalizationEnabled } from "@/lib/localization";
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
import { clampAppLocaleForZone } from "@/lib/i18n/locale-policy";

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

function resolveAppLocale(params: {
  uiLocalizationEnabled: boolean;
  marketLocale: string;
  cookieLocale?: string | null;
  acceptLanguage?: string | null;
  userPreferred?: AppLocale | null;
  activeZone: ResolvedActiveGeoZone;
  pathLocale?: AppLocale | null;
}): AppLocale {
  if (!params.uiLocalizationEnabled) return DEFAULT_APP_LOCALE;
  // Explicit browser choice (language switcher) wins over stored profile default.
  const fromCookie = parseLocaleCookie(params.cookieLocale);
  const fromPreferred = params.userPreferred;
  const fromAccept = localeFromAcceptLanguage(params.acceptLanguage);
  const picked =
    params.pathLocale ??
    fromCookie ??
    fromPreferred ??
    fromAccept ??
    appLocaleFromMarketLocale(params.marketLocale);
  return clampAppLocaleForZone(
    picked,
    params.activeZone,
    params.uiLocalizationEnabled,
  );
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
