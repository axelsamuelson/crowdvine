"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { MenuSearchResponse, MenuSearchVenue, MenuSearchWine } from "@/lib/menu-search-types";

const DEBOUNCE_MS = 400;
const CITY = "stockholm";

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

function formatSekPerGlass(n: number): string {
  return `${new Intl.NumberFormat("sv-SE").format(Math.round(n))} kr/gl`;
}

function formatSekPerBottle(n: number): string {
  return `${new Intl.NumberFormat("sv-SE").format(Math.round(n))} kr/fl`;
}

function wineTypeDotClass(wineType: string | null | undefined): string {
  const t = (wineType ?? "").toLowerCase();
  if (t === "red") return "bg-red-700";
  if (t === "white") return "bg-amber-100 ring-1 ring-amber-300";
  if (t === "sparkling") return "bg-yellow-400";
  if (t === "rose") return "bg-rose-400";
  if (t === "orange") return "bg-orange-500";
  return "bg-zinc-400";
}

function WineTypeBadge({ wine }: { wine: MenuSearchWine }) {
  const label = wine.wine_type?.trim() || "okänd typ";
  return (
    <span className="inline-flex items-center gap-1.5 shrink-0" title={label}>
      <span className={`h-2 w-2 rounded-full ${wineTypeDotClass(wine.wine_type)}`} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

function VenueSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 h-7 w-56 rounded-md bg-zinc-200" />
      <div className="mb-4 h-4 w-40 rounded bg-zinc-100" />
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-zinc-100" />
        <div className="h-4 w-[92%] rounded bg-zinc-100" />
        <div className="h-4 w-[78%] rounded bg-zinc-100" />
      </div>
    </div>
  );
}

export default function WineSearchPage() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
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

  const parseOptionalInt = (raw: string): number | null => {
    const s = raw.trim();
    if (s === "") return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) ? n : null;
  };

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
        city: CITY,
        page: "1",
        per_page: "50",
      });
      const minP = parseOptionalInt(minPriceInput);
      const maxP = parseOptionalInt(maxPriceInput);
      if (minP != null) params.set("min_price", String(minP));
      if (maxP != null) params.set("max_price", String(maxP));
      if (wineTypeParam) params.set("wine_type", wineTypeParam);
      if (byGlass) params.set("by_glass", "true");

      const res = await fetch(`/api/menu-search?${params.toString()}`, { method: "GET" });
      const json = (await res.json()) as MenuSearchResponse & { error?: string; message?: string };
      if (!res.ok) {
        throw new Error(json.error || "Sökningen misslyckades");
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, minPriceInput, maxPriceInput, wineTypeParam, byGlass]);

  useEffect(() => {
    void runSearch();
  }, [runSearch]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query.trim());
  };

  const venueCount = data?.venues?.length ?? 0;
  const wineCount = data?.total_matches ?? 0;
  const showIntro = query.trim().length === 0;
  const showEmpty =
    !loading && debouncedQuery.length >= 2 && data && wineCount === 0 && venueCount === 0;
  const showResults = !loading && debouncedQuery.length >= 2 && data && wineCount > 0;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 pt-20 pb-16 md:pt-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <header className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hitta vin i Stockholm</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Sök bland extraherade vinlistor. Priser enligt restaurangens meny.
          </p>
        </header>

        <form onSubmit={onSubmitSearch} className="mb-4">
          <label htmlFor="wine-q" className="sr-only">
            Sök producent, vin eller region
          </label>
          <input
            id="wine-q"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sök på producent, vin eller region..."
            className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3.5 text-base shadow-sm outline-none ring-zinc-400 placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2"
            autoComplete="off"
            enterKeyHint="search"
          />
        </form>

        <div className="mb-6 space-y-5 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
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
                      ? "bg-zinc-900 text-white"
                      : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-zinc-500">
              Flaskpris SEK
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[7rem] flex-1">
                <label htmlFor="min-price" className="mb-1 block text-xs text-zinc-500">
                  Min
                </label>
                <input
                  id="min-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="—"
                  value={minPriceInput}
                  onChange={(e) => setMinPriceInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                />
              </div>
              <div className="min-w-[7rem] flex-1">
                <label htmlFor="max-price" className="mb-1 block text-xs text-zinc-500">
                  Max
                </label>
                <input
                  id="max-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder="—"
                  value={maxPriceInput}
                  onChange={(e) => setMaxPriceInput(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
                />
              </div>
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
          <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
            För bästa resultat: kör migration 150 i Supabase (pg_trgm + sökfunktioner).
          </p>
        )}

        {showIntro && (
          <p className="mb-8 text-center text-sm leading-relaxed text-zinc-600 sm:text-left">
            Sök bland vinlistorna på Stockholms bästa vinkrogar. Hitta var ditt favoritvin finns och vad det
            kostar.
          </p>
        )}

        {!loading && query.trim().length > 0 && debouncedQuery.length < 2 && (
          <p className="mb-6 text-center text-sm text-zinc-500">Skriv minst två tecken för att söka.</p>
        )}

        {loading && (
          <div className="space-y-4" aria-busy="true">
            <VenueSkeleton />
            <VenueSkeleton />
            <VenueSkeleton />
          </div>
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
        )}

        {showResults && (
          <p className="mb-4 text-sm text-zinc-600">
            {wineCount} {wineCount === 1 ? "vin" : "viner"} på {venueCount} {venueCount === 1 ? "ställe" : "ställen"}
          </p>
        )}

        {showEmpty && (
          <p className="rounded-2xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm text-zinc-600">
            Inga träffar för &apos;{debouncedQuery}&apos; — prova ett annat namn eller en region
          </p>
        )}

        {!loading && showResults && (
          <ul className="space-y-8">
            {data!.venues.map((v: MenuSearchVenue) => (
              <li
                key={v.slug}
                className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <h2 className="text-xl font-bold text-zinc-900">{v.name}</h2>
                <p className="mt-1 text-sm text-zinc-500">Uppdaterad {formatDaysAgo(v.extracted_at)}</p>
                <ul className="mt-4 divide-y divide-zinc-100">
                  {v.wines.map((w, idx) => (
                    <li key={`${v.slug}-${idx}`} className="flex flex-col gap-2 py-4 first:pt-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                          <WineTypeBadge wine={w} />
                          <p className="font-medium leading-snug text-zinc-900">
                            {[w.producer, w.wine_name].filter(Boolean).join(" · ") || "—"}
                            {w.vintage?.trim() ? (
                              <span className="font-normal text-zinc-600"> · {w.vintage.trim()}</span>
                            ) : null}
                          </p>
                        </div>
                        {(w.region || w.country) && (
                          <p className="mt-1 pl-4 text-sm text-zinc-500 sm:pl-4">
                            {[w.region, w.country].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-x-4 gap-y-1 pl-4 text-sm sm:justify-end sm:pl-0 sm:text-right">
                        {w.price_glass != null && !Number.isNaN(Number(w.price_glass)) && (
                          <span className="font-medium tabular-nums text-zinc-800">
                            {formatSekPerGlass(Number(w.price_glass))}
                          </span>
                        )}
                        {w.price_bottle != null && !Number.isNaN(Number(w.price_bottle)) && (
                          <span className="font-medium tabular-nums text-zinc-800">
                            {formatSekPerBottle(Number(w.price_bottle))}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
