"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MenuSearchResponse, MenuSearchVenue } from "@/lib/menu-search-types";

const DEBOUNCE_MS = 400;
const WINE_TABS: { id: string; label: string; apiValue: string | null }[] = [
  { id: "all", label: "Alla", apiValue: null },
  { id: "red", label: "Rött", apiValue: "red" },
  { id: "white", label: "Vitt", apiValue: "white" },
  { id: "sparkling", label: "Mousserande", apiValue: "sparkling" },
  { id: "rose", label: "Rosé", apiValue: "rose" },
  { id: "orange", label: "Orange", apiValue: "orange" },
];

function formatDaysAgo(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const days = Math.floor((Date.now() - t) / (86400 * 1000));
  if (days <= 0) return "idag";
  if (days === 1) return "1 dag sedan";
  return `${days} dagar sedan`;
}

function formatPrice(n: number | null, currency: string | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  const cur = currency?.trim() || "SEK";
  return `${Math.round(n)} ${cur}`;
}

export default function AdminWineSearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(5000);
  const [wineTab, setWineTab] = useState("all");
  const [byGlass, setByGlass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MenuSearchResponse | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  const wineTypeParam = useMemo(() => {
    const tab = WINE_TABS.find((w) => w.id === wineTab);
    return tab?.apiValue ?? null;
  }, [wineTab]);

  const runSearch = useCallback(async () => {
    const q = debouncedQuery;
    if (q.length < 2) {
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q,
        city: "stockholm",
        page: "1",
        per_page: "50",
      });
      if (minPrice > 0) params.set("min_price", String(minPrice));
      if (maxPrice < 5000) params.set("max_price", String(maxPrice));
      if (wineTypeParam) params.set("wine_type", wineTypeParam);
      if (byGlass) params.set("by_glass", "true");

      const res = await fetch(`/api/menu-search?${params.toString()}`, { method: "GET" });
      const json = (await res.json()) as MenuSearchResponse & { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(json.error || "Sökningen misslyckades");
      }
      if ("message" in json && json.venues?.length === 0) {
        setData(null);
        setError(null);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, minPrice, maxPrice, wineTypeParam, byGlass]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query.trim());
  };

  const venueCount = data?.venues?.length ?? 0;
  const wineCount = data?.total_matches ?? 0;

  return (
    <div className="min-h-0 flex-1 overflow-auto bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Hitta vin i Stockholm</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Sök bland extraherade vinlistor (Starwinelist). Priser enligt restaurangens meny.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="mb-6">
          <label htmlFor="wine-q" className="sr-only">
            Sök producent, vin eller region
          </label>
          <input
            id="wine-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök på producent, vin eller region..."
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-base shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
            autoComplete="off"
            enterKeyHint="search"
          />
        </form>

        <div className="mb-8 space-y-5 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Flaskpris (SEK)</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="flex-1">
                <label className="text-xs text-zinc-500">Min {minPrice}</label>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={minPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMinPrice(v);
                    if (v > maxPrice) setMaxPrice(v);
                  }}
                  className="mt-1 block w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-zinc-500">Max {maxPrice}</label>
                <input
                  type="range"
                  min={0}
                  max={5000}
                  step={50}
                  value={maxPrice}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setMaxPrice(v);
                    if (v < minPrice) setMinPrice(v);
                  }}
                  className="mt-1 block w-full accent-zinc-900 dark:accent-zinc-100"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">Typ</p>
            <div className="flex flex-wrap gap-2">
              {WINE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWineTab(tab.id)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    wineTab === tab.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={byGlass}
              onChange={(e) => setByGlass(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-400 text-zinc-900 focus:ring-zinc-500"
            />
            Endast glasvin
          </label>
        </div>

        {data?._fallback && (
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            För bästa resultat: kör migration 149 (pg_trgm) i Supabase så används fulltextsökning i databasen.
          </p>
        )}

        {loading && (
          <div className="space-y-4" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="mb-3 h-6 w-48 rounded bg-zinc-200 dark:bg-zinc-700" />
                <div className="mb-2 h-4 w-32 rounded bg-zinc-100 dark:bg-zinc-800" />
                <div className="h-4 w-full rounded bg-zinc-100 dark:bg-zinc-800" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
            {error}
          </p>
        )}

        {!loading && debouncedQuery.length >= 2 && data && (
          <>
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
              {wineCount} {wineCount === 1 ? "vin" : "viner"} på {venueCount}{" "}
              {venueCount === 1 ? "ställe" : "ställen"}
            </p>
            {venueCount === 0 && (
              <p className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-8 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                Inga träffar för &apos;{debouncedQuery}&apos; — prova ett annat namn
              </p>
            )}
            <ul className="space-y-6">
              {data.venues.map((v: MenuSearchVenue) => (
                <li
                  key={v.slug}
                  className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{v.name}</h2>
                  <p className="mt-1 text-sm text-zinc-500">Uppdaterad {formatDaysAgo(v.extracted_at)}</p>
                  <ul className="mt-4 divide-y divide-zinc-100 dark:divide-zinc-800">
                    {v.wines.map((w, idx) => (
                      <li key={`${v.slug}-${idx}`} className="flex flex-col gap-1 py-3 first:pt-0 sm:flex-row sm:justify-between">
                        <div>
                          <p className="font-medium text-zinc-900 dark:text-zinc-100">
                            {[w.producer, w.wine_name].filter(Boolean).join(" — ") || "—"}
                          </p>
                          <p className="text-sm text-zinc-500">
                            {[w.vintage, w.region, w.country].filter(Boolean).join(" · ") || null}
                          </p>
                        </div>
                        <div className="shrink-0 text-sm sm:text-right">
                          {w.price_bottle != null && (
                            <p>
                              Flaska: <span className="font-medium">{formatPrice(w.price_bottle, w.currency)}</span>
                            </p>
                          )}
                          {w.price_glass != null && (
                            <p>
                              Glas: <span className="font-medium">{formatPrice(w.price_glass, w.currency)}</span>
                            </p>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </>
        )}

        {!loading && debouncedQuery.length < 2 && query.length > 0 && (
          <p className="text-center text-sm text-zinc-500">Skriv minst två tecken för att söka.</p>
        )}
      </div>
    </div>
  );
}
