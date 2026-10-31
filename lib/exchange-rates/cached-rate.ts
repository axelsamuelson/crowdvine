import { getAppUrl, getInternalFetchHeaders } from "@/lib/app-url";

const FX_REVALIDATE_SECONDS = 3600;

/**
 * Fetch a FX rate with Next data-cache revalidation (not no-store).
 * Safe for ISR pages — rates are global, not user-specific.
 */
export async function getCachedExchangeRate(
  from: string,
  to: string,
): Promise<number | null> {
  const source = from.trim().toUpperCase();
  const target = to.trim().toUpperCase();
  if (!source || !target) return null;
  if (source === target) return 1;

  try {
    const res = await fetch(
      `${getAppUrl()}/api/exchange-rates?from=${encodeURIComponent(source)}&to=${encodeURIComponent(target)}`,
      {
        next: { revalidate: FX_REVALIDATE_SECONDS },
        headers: getInternalFetchHeaders(),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { rate?: unknown };
    return typeof data.rate === "number" && Number.isFinite(data.rate)
      ? data.rate
      : null;
  } catch {
    return null;
  }
}

export async function getCachedExchangeRateMap(
  currencies: string[],
  to = "SEK",
): Promise<Record<string, number>> {
  const target = to.toUpperCase();
  const rateMap: Record<string, number> = { [target]: 1 };
  const unique = [
    ...new Set(
      currencies
        .map((c) => c.trim().toUpperCase())
        .filter((c) => c && c !== target),
    ),
  ];
  if (unique.length === 0) return rateMap;

  await Promise.all(
    unique.map(async (from) => {
      const rate = await getCachedExchangeRate(from, target);
      if (rate != null) rateMap[from] = rate;
    }),
  );
  return rateMap;
}
