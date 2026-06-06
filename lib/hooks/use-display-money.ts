"use client";

import { useCallback, useMemo } from "react";
import { useShoppingContextOptional } from "@/lib/context/shopping-context-provider";
import { fallbackShoppingContext } from "@/lib/shopping-context/defaults";
import {
  formatDisplayMoney,
  formatSekAsDisplayMoney,
  sekToDisplayAmount,
  type FormatMoneyContext,
} from "@/lib/shopping-context/format";

export function useDisplayMoney() {
  const ctx =
    useShoppingContextOptional()?.context ?? fallbackShoppingContext();

  const moneyCtx: FormatMoneyContext = useMemo(
    () => ({
      currencyCode: ctx.currencyCode,
      locale: ctx.locale,
      sekToDisplayRate: ctx.sekToDisplayRate,
    }),
    [ctx.currencyCode, ctx.locale, ctx.sekToDisplayRate],
  );

  const formatDisplay = useCallback(
    (
      amount: number,
      options?: { decimals?: 0 | 1 | 2; round?: "ceil" | "round" },
    ) => formatDisplayMoney(amount, moneyCtx, options),
    [moneyCtx],
  );

  const formatSek = useCallback(
    (
      amountSek: number,
      options?: { decimals?: 0 | 1 | 2; round?: "ceil" | "round" },
    ) => formatSekAsDisplayMoney(amountSek, moneyCtx, options),
    [moneyCtx],
  );

  const toDisplay = useCallback(
    (amountSek: number) => sekToDisplayAmount(amountSek, moneyCtx),
    [moneyCtx],
  );

  return {
    currencyCode: ctx.currencyCode,
    locale: ctx.locale,
    sekToDisplayRate: ctx.sekToDisplayRate,
    formatDisplay,
    formatSek,
    toDisplay,
  };
}
