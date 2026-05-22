"use client";

import { useCallback, useMemo } from "react";
import { useShoppingContextOptional } from "@/lib/context/shopping-context-provider";
import { translate } from "@/lib/i18n/messages";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";

/**
 * Translations tied to shopping locale when inside {@link ShoppingContextProvider}.
 * Falls back to English when the provider is absent (admin, isolated previews).
 */
export function useTranslations() {
  const ctx = useShoppingContextOptional();
  const locale = ctx?.context.locale ?? fallbackShoppingContext().locale;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    [locale],
  );

  return useMemo(
    () =>
      ctx ?? {
        context: fallbackShoppingContext(),
        setLocale: async () => {},
        refresh: async () => {},
        t,
      },
    [ctx, t],
  );
}
