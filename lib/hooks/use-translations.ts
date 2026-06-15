"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";

import { useShoppingContextOptional } from "@/lib/context/shopping-context-provider";
import { translate } from "@/lib/i18n/messages";
import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";
import { applyLocalePolicyToContext } from "@/lib/shopping-context/apply-locale-policy";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";

/**
 * Translations tied to shopping locale when inside {@link ShoppingContextProvider}.
 * URL paths (/vin, /produkt, …) override context during hydration so PLP links
 * stay locale-correct before the client provider is ready.
 */
export function useTranslations() {
  const pathname = usePathname();
  const ctx = useShoppingContextOptional();
  const pathLocale = localeFromShopPath(pathname);

  const baseContext = ctx?.context ?? fallbackShoppingContext();
  const context = useMemo(() => {
    if (!pathLocale || pathLocale === baseContext.locale) return baseContext;
    return applyLocalePolicyToContext({ ...baseContext, locale: pathLocale });
  }, [baseContext, pathLocale]);

  const locale = context.locale;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );

  return useMemo(
    () =>
      ctx
        ? { ...ctx, context, t }
        : {
            context,
            setLocale: async () => {},
            refresh: async () => {},
            t,
          },
    [ctx, context, t],
  );
}
