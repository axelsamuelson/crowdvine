import {
  appLocaleFromMarketLocale,
  intlLocaleForAppLocale,
  isAppLocale,
  localeFromAcceptLanguage,
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

function isSwedenZone(
  zone: Pick<ResolvedActiveGeoZone, "countryCode">,
): boolean {
  return (zone.countryCode ?? "").trim().toUpperCase() === "SE";
}

/**
 * Locale for the shopping context.
 *
 * Swedish shoppers (Sweden zone) stay on Swedish for locale-less routes
 * (`/checkout`, `/profile`). `markets.locale` is `en` for EU, and
 * Accept-Language / a cookie written by visiting `/wine` must not flip
 * those pages to English. An English URL still wins. A saved
 * `profiles.preferred_locale` wins for signed-in users. Guests can pin
 * English with the locale cookie (the language switcher).
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
  const fromCookie = parseLocaleCookie(params.cookieLocale);
  const fromPreferred = params.userPreferred ?? null;
  const fromAccept = localeFromAcceptLanguage(params.acceptLanguage);
  const clamp = (locale: AppLocale) =>
    clampAppLocaleForZone(
      locale,
      params.activeZone,
      params.uiLocalizationEnabled,
    );

  if (params.pathLocale) return clamp(params.pathLocale);
  if (fromPreferred) return clamp(fromPreferred);

  if (isSwedenZone(params.activeZone)) {
    if (params.hasUser) return clamp("sv");
    if (fromCookie) return clamp(fromCookie);
    return clamp("sv");
  }

  const picked =
    fromCookie ?? fromAccept ?? appLocaleFromMarketLocale(params.marketLocale);
  return clamp(picked);
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
