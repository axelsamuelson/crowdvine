import {
  localeFromLangQuery,
  type AppLocale,
} from "@/lib/i18n/locale";
import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";

export type RequestUiLocaleResolution = {
  /** Locale implied by path pairs (/vin vs /wine, /villkor vs /terms, …). */
  pathLocale: AppLocale | null;
  /** Explicit `?lang=sv|en` from email/landing links. */
  queryLocale: AppLocale | null;
  /**
   * Effective UI locale for this request: path wins over `?lang=`.
   * Does not imply persisting `pact_locale`.
   */
  uiLocale: AppLocale | null;
  /**
   * Only path pairs may write `pact_locale`. `?lang=` is request-scoped UI only
   * and must not set or overwrite the cookie, market, or currency.
   */
  shouldPersistLocaleCookie: boolean;
};

/**
 * Resolve request UI locale without mutating cookies/market/currency.
 * Path pairs take precedence; `?lang=` is a fallback for locale-neutral routes.
 */
export function resolveRequestUiLocale(
  pathname: string,
  search?: string | { get: (key: string) => string | null } | null,
): RequestUiLocaleResolution {
  const pathLocale = localeFromShopPath(pathname);
  const queryLocale = localeFromLangQuery(search ?? null);
  return {
    pathLocale,
    queryLocale,
    uiLocale: pathLocale ?? queryLocale,
    shouldPersistLocaleCookie: pathLocale != null,
  };
}
