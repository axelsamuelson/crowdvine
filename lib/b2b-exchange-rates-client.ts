/**
 * Client-side FX lookup for B2B admin (pallet list, etc.).
 */
export async function fetchClientExchangeRatesMap(
  currencies: string[],
): Promise<Record<string, number>> {
  const map: Record<string, number> = { SEK: 1 };
  const toFetch = [...new Set(currencies.filter((c) => c && c !== "SEK"))];
  await Promise.all(
    toFetch.map(async (currency) => {
      try {
        const res = await fetch(
          `/api/exchange-rates?from=${encodeURIComponent(currency)}&to=SEK`,
          { cache: "no-store" },
        );
        if (res.ok) {
          const data = await res.json();
          if (data.rate != null && Number.isFinite(data.rate)) {
            map[currency] = data.rate;
          }
        }
      } catch {
        /* keep fallback */
      }
    }),
  );
  return map;
}
