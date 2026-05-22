import {
  getAppUrl,
  getAppUrlForRequest,
  getInternalFetchHeaders,
} from "@/lib/app-url";
import { intlLocaleForAppLocale } from "@/lib/i18n/locale";
import { getShoppingContextFromRequest } from "@/lib/shopping-context/server";

const RATE_TTL_MS = 60 * 60 * 1000;
const rateCache = new Map<string, { rate: number; expires: number }>();

/** How many display-currency units per 1 SEK (e.g. USD per SEK). */
export async function getSekToDisplayRate(
  currencyCode: string,
): Promise<number> {
  const target = currencyCode.trim().toUpperCase();
  if (!target || target === "SEK") return 1;

  const cached = rateCache.get(target);
  if (cached && cached.expires > Date.now()) return cached.rate;

  try {
    const base = (await getAppUrlForRequest().catch(() => null)) ?? getAppUrl();
    const headers = getInternalFetchHeaders();
    const res = await fetch(
      `${base}/api/exchange-rates?from=SEK&to=${target}`,
      {
        cache: "no-store",
        headers,
        signal: AbortSignal.timeout(8_000),
      },
    );
    if (res.ok) {
      const data = (await res.json()) as { rate?: number };
      if (data?.rate && Number.isFinite(data.rate) && data.rate > 0) {
        rateCache.set(target, {
          rate: data.rate,
          expires: Date.now() + RATE_TTL_MS,
        });
        return data.rate;
      }
    }
  } catch {
    /* fall through */
  }

  // Inverse of common fallbacks in exchange-rates route (USD→SEK etc.)
  const toSek: Record<string, number> = { USD: 10.5, EUR: 11.25, GBP: 13.2 };
  const sekPerUnit = toSek[target];
  if (sekPerUnit && sekPerUnit > 0) {
    const rate = 1 / sekPerUnit;
    rateCache.set(target, { rate, expires: Date.now() + RATE_TTL_MS });
    return rate;
  }

  return 1;
}

export type DisplayCurrencyBundle = {
  currencyCode: string;
  intlLocale: string;
  sekToDisplayRate: number;
};

export async function resolveDisplayCurrency(
  currencyCode?: string,
): Promise<DisplayCurrencyBundle> {
  if (!currencyCode) {
    const ctx = await getShoppingContextFromRequest();
    currencyCode = ctx.currencyCode;
    const sekToDisplayRate = await getSekToDisplayRate(currencyCode);
    return {
      currencyCode,
      intlLocale: ctx.intlLocale,
      sekToDisplayRate,
    };
  }
  const code = currencyCode.trim().toUpperCase() || "SEK";
  const sekToDisplayRate = await getSekToDisplayRate(code);
  return {
    currencyCode: code,
    intlLocale: intlLocaleForAppLocale("en"),
    sekToDisplayRate,
  };
}
