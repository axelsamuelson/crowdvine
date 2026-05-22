/** Supported UI languages (message catalogs). */
export type AppLocale = "en" | "sv";

export const LOCALE_COOKIE = "pact_locale";

export const DEFAULT_APP_LOCALE: AppLocale = "en";

const APP_LOCALES = new Set<AppLocale>(["en", "sv"]);

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value != null && APP_LOCALES.has(value as AppLocale);
}

/** BCP 47 tag for Intl (dates, numbers, currency). */
export function intlLocaleForAppLocale(locale: AppLocale): string {
  return locale === "sv" ? "sv-SE" : "en-GB";
}

/** Stripe Elements / Checkout locale. */
export function stripeLocaleForAppLocale(locale: AppLocale): string {
  return locale === "sv" ? "sv" : "en";
}

/** Map markets.locale (e.g. en-US) → AppLocale. */
export function appLocaleFromMarketLocale(marketLocale: string | null | undefined): AppLocale {
  const raw = (marketLocale ?? "").trim().toLowerCase();
  if (raw.startsWith("sv")) return "sv";
  return "en";
}

export function parseLocaleCookie(
  value: string | null | undefined,
): AppLocale | null {
  const v = (value ?? "").trim().toLowerCase();
  return isAppLocale(v) ? v : null;
}

export function localeFromAcceptLanguage(
  header: string | null | undefined,
): AppLocale | null {
  if (!header?.trim()) return null;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]?.trim().toLowerCase() ?? "";
    if (tag.startsWith("sv")) return "sv";
    if (tag.startsWith("en")) return "en";
  }
  return null;
}
