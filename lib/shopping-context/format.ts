import { intlLocaleForAppLocale, type AppLocale } from "@/lib/i18n/locale";
import { convertSekForDisplay } from "@/lib/shopping-context/currency-convert";
import type { ShoppingContext } from "@/lib/shopping-context/types";

export function formatMoney(
  amount: number,
  currencyCode: string,
  locale: AppLocale,
  options?: { decimals?: 0 | 2; round?: "ceil" | "round" },
): string {
  const decimals = options?.decimals ?? 0;
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
  options?: { decimals?: 0 | 2; round?: "ceil" | "round" },
): string {
  return formatMoney(amount, ctx.currencyCode, ctx.locale, options);
}

/** Convert from SEK (storage) then format in the shopper's display currency. */
export function formatSekAsDisplayMoney(
  amountSek: number,
  ctx: FormatMoneyContext,
  options?: { decimals?: 0 | 2; round?: "ceil" | "round" },
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
