import { intlLocaleForAppLocale, type AppLocale } from "@/lib/i18n/locale";
import { convertSekForDisplay } from "@/lib/shopping-context/currency-convert";
import type { ShoppingContext } from "@/lib/shopping-context/types";

export type DisplayMoneyDecimals = 0 | 1 | 2;

/** USD prices show one decimal; SEK and others stay whole numbers by default. */
export function displayFractionDigits(currencyCode: string): DisplayMoneyDecimals {
  return currencyCode.trim().toUpperCase() === "USD" ? 1 : 0;
}

export function roundAmountForDisplay(
  amount: number,
  currencyCode: string,
  mode: "ceil" | "round" = "ceil",
): number {
  const digits = displayFractionDigits(currencyCode);
  const factor = 10 ** digits;
  return mode === "round"
    ? Math.round(amount * factor) / factor
    : Math.ceil(amount * factor) / factor;
}

export function formatMoney(
  amount: number,
  currencyCode: string,
  locale: AppLocale,
  options?: { decimals?: DisplayMoneyDecimals; round?: "ceil" | "round" },
): string {
  const decimals = options?.decimals ?? displayFractionDigits(currencyCode);
  const rounded =
    options?.round === "round"
      ? Math.round(amount * 10 ** decimals) / 10 ** decimals
      : Math.ceil(amount * 10 ** decimals) / 10 ** decimals;

  return new Intl.NumberFormat(intlLocaleForAppLocale(locale), {
    style: "currency",
    currency: currencyCode,
    currencyDisplay: "narrowSymbol",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rounded);
}

export type FormatMoneyContext = Pick<
  ShoppingContext,
  "currencyCode" | "locale" | "sekToDisplayRate"
>;

/** Format an amount already in the shopper's display currency. */
export function formatDisplayMoney(
  amount: number,
  ctx: FormatMoneyContext,
  options?: { decimals?: DisplayMoneyDecimals; round?: "ceil" | "round" },
): string {
  return formatMoney(amount, ctx.currencyCode, ctx.locale, options);
}

/** Convert from SEK (storage) then format in the shopper's display currency. */
export function formatSekAsDisplayMoney(
  amountSek: number,
  ctx: FormatMoneyContext,
  options?: { decimals?: DisplayMoneyDecimals; round?: "ceil" | "round" },
): string {
  const display = convertSekForDisplay(
    amountSek,
    ctx.currencyCode,
    ctx.sekToDisplayRate,
  );
  return formatDisplayMoney(display, ctx, options);
}

export function sekToDisplayAmount(
  amountSek: number,
  ctx: FormatMoneyContext,
): number {
  return convertSekForDisplay(
    amountSek,
    ctx.currencyCode,
    ctx.sekToDisplayRate,
  );
}

/** Format a product list price, preferring canonical SEK storage over pre-converted amounts. */
export function formatProductListPrice(
  params: {
    amount: number;
    listCurrencyCode: string;
    basePriceSek?: number | null;
  },
  ctx: FormatMoneyContext,
  options?: { decimals?: DisplayMoneyDecimals; round?: "ceil" | "round" },
): string {
  if (params.basePriceSek != null && Number.isFinite(params.basePriceSek)) {
    return formatSekAsDisplayMoney(params.basePriceSek, ctx, options);
  }

  const listCode = params.listCurrencyCode.trim().toUpperCase();
  const ctxCode = ctx.currencyCode.trim().toUpperCase();

  if (listCode === "SEK") {
    return formatSekAsDisplayMoney(params.amount, ctx, options);
  }
  if (listCode === ctxCode) {
    return formatDisplayMoney(params.amount, ctx, options);
  }

  // Amount is in a foreign currency — format with that currency, not the shopper context.
  return formatMoney(params.amount, listCode, ctx.locale, options);
}
