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

/** Enforce zone locale + display currency rules (e.g. US → en + USD) on a snapshot. */
export function applyLocalePolicyToContext(ctx: ShoppingContext): ShoppingContext {
  const availableLocales = availableAppLocalesForZone(
    ctx.activeZone,
    ctx.uiLocalizationEnabled,
  );
  const locale = clampAppLocaleForZone(
    ctx.locale,
    ctx.activeZone,
    ctx.uiLocalizationEnabled,
  );
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
