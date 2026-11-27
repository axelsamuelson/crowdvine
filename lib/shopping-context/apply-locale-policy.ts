import {
  availableAppLocalesForZone,
  clampAppLocaleForZone,
} from "@/lib/i18n/locale-policy";
import { intlLocaleForAppLocale } from "@/lib/i18n/locale";
import {
  fallbackSekToDisplayRate,
  resolveDisplayCurrencyCode,
} from "@/lib/shopping-context/currency-policy";
import type { ShoppingContext } from "@/lib/shopping-context/types";

/**
 * Server HTML stays on the locale already chosen from the URL or cookie,
 * and on SEK. Ship-to never rewrites the language.
 */
export function applyLocalePolicyToContext(ctx: ShoppingContext): ShoppingContext {
  const availableLocales = ctx.uiLocalizationEnabled
    ? (["sv", "en"] as const)
    : availableAppLocalesForZone(ctx.activeZone, false);
  const locale = ctx.uiLocalizationEnabled
    ? ctx.locale
    : clampAppLocaleForZone(ctx.locale, ctx.activeZone, false);
  const currencyCode = resolveDisplayCurrencyCode({
    zoneCurrencyCode: ctx.activeZone.currencyCode,
    marketCurrencyCode: ctx.market.currencyCode,
    countryCode: ctx.activeZone.countryCode,
    marketCode: ctx.activeZone.marketCode,
  });
  const sekToDisplayRate =
    currencyCode === ctx.currencyCode
      ? ctx.sekToDisplayRate
      : fallbackSekToDisplayRate(currencyCode);

  return {
    ...ctx,
    locale,
    availableLocales,
    intlLocale: intlLocaleForAppLocale(locale),
    currencyCode,
    sekToDisplayRate,
  };
}
