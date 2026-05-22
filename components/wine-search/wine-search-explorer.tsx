"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import type { MenuSearchGroupedWine, MenuSearchResponse, MenuSearchVenueRef } from "@/lib/menu-search-types";

const DEBOUNCE_MS = 400;
const CITY = "stockholm";
const PER_PAGE = 50;

const WINE_TABS: { id: string; label: string; apiValue: string | null }[] = [
  { id: "all", label: "Alla", apiValue: null },
  { id: "red", label: "Rött", apiValue: "red" },
  { id: "white", label: "Vitt", apiValue: "white" },
  { id: "sparkling", label: "Mousserande", apiValue: "sparkling" },
  { id: "rose", label: "Rosé", apiValue: "rose" },
  { id: "orange", label: "Orange", apiValue: "orange" },
];

type SortKey = "producer" | "price_bottle" | "price_glass" | "places" | "relevance" | "newest";
type SortDir = "asc" | "desc";
type ColumnSortKey = "producer" | "price_bottle" | "price_glass" | "places";

function formatDaysAgo(iso: string | null): string {
  if (!iso) return "—";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const days = Math.floor((Date.now() - t) / (86400 * 1000));
  if (days <= 0) return "idag";
  if (days === 1) return "1 dag sedan";
  return `${days} dagar sedan`;
}

function formatSek(n: number | null): string {
  if (n == null || Number.isNaN(n)) return "—";
  return `${new Intl.NumberFormat("sv-SE").format(Math.round(n))} kr`;
}

function wineTypeDotClass(wineType: string | null | undefined): string {
  const t = (wineType ?? "").toLowerCase();
  if (t === "red") return "bg-red-600";
  if (t === "white") return "bg-amber-100 ring-1 ring-amber-300";
  if (t === "sparkling") return "bg-blue-500";
  if (t === "rose") return "bg-pink-400";
  if (t === "orange") return "bg-orange-500";
  return "bg-zinc-400";
}

function wineTypeLabelSv(wineType: string | null | undefined): string {
  const t = (wineType ?? "").toLowerCase();
  const map: Record<string, string> = {
    red: "Rött",
    white: "Vitt",
    sparkling: "Mousserande",
    rose: "Rosé",
    orange: "Orange",
    sweet: "Sött",
    fortified: "Starkvin",
    non_alcoholic: "Alkoholfritt",
    unknown: "Okänd",
  };
  return map[t] ?? (wineType?.trim() || "Okänd");
}

function formatSekRange(min: number | null, max: number | null): string {
  if (min == null && max == null) return "—";
  if (min != null && max != null && min !== max) {
    return `${new Intl.NumberFormat("sv-SE").format(Math.round(min))}–${new Intl.NumberFormat("sv-SE").format(Math.round(max))} kr`;
  }
  const n = min ?? max;
  return formatSek(n);
}

function venueLinksCell(
  venues: MenuSearchVenueRef[],
  isAdmin: boolean,
  maxShow: number,
): ReactNode {
  if (!venues.length) return <span className="text-zinc-500">—</span>;
  const show = venues.slice(0, maxShow);
  const rest = venues.length - show.length;
  const linkClass = isAdmin
    ? "text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600 dark:text-zinc-50 dark:decoration-zinc-600 dark:hover:decoration-zinc-400"
    : "text-zinc-900 underline decoration-zinc-300 underline-offset-2 hover:decoration-zinc-600";
  return (
    <div className="flex flex-col gap-1">
      {show.map((v) => {
        const sl = v.starwinelist_slug?.trim();
        const url = sl ? `https://starwinelist.com/wine-place/${encodeURIComponent(sl)}` : null;
        const tip = `Uppdaterad ${formatDaysAgo(v.extracted_at)}`;
        return (
          <span key={v.document_id} className="block">
            {url ? (
              <a href={url} target="_blank" rel="noopener noreferrer" title={tip} className={`text-sm font-medium ${linkClass}`}>
                {v.venue_name}
              </a>
            ) : (
              <span title={tip} className={`text-sm font-medium ${isAdmin ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-900"}`}>
                {v.venue_name}
              </span>
            )}
          </span>
        );
      })}
      {rest > 0 ? (
        <span className={`text-xs ${isAdmin ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-500"}`}>+{rest} till</span>
      ) : null}
    </div>
  );
}

function distinctVenueCountOnPage(rows: MenuSearchGroupedWine[]): number {
  const ids = new Set<string>();
  for (const w of rows) {
    for (const v of w.venues) {
      ids.add(v.document_id);
    }
  }
  return ids.size;
}

function normKey(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function TableSkeleton({ isAdmin }: { isAdmin: boolean }) {
  const bar = isAdmin ? "bg-zinc-200 dark:bg-zinc-700" : "bg-zinc-200";
  const cell = isAdmin ? "bg-zinc-100 dark:bg-zinc-800" : "bg-zinc-100";
  return (
    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
      <thead>
        <tr className={`border-b ${isAdmin ? "border-zinc-200 bg-zinc-100/80 dark:border-zinc-800 dark:bg-zinc-900/80" : "border-zinc-200 bg-zinc-100/80"}`}>
          {Array.from({ length: 9 }).map((_, i) => (
            <th key={i} className="px-3 py-2 font-medium text-zinc-500">
              <div className={`h-4 w-16 animate-pulse rounded ${bar}`} />
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {Array.from({ length: 6 }).map((_, r) => (
          <tr key={r} className={isAdmin ? "border-b border-zinc-100 dark:border-zinc-800" : "border-b border-zinc-100"}>
            {Array.from({ length: 9 }).map((__, c) => (
              <td key={c} className="px-3 py-3">
                <div
                  className={`h-4 animate-pulse rounded ${cell}`}
                  style={{ width: `${60 + ((r + c) % 4) * 12}%` }}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function WineSearchExplorer() {
  const isAdmin = true;
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [maxSlider, setMaxSlider] = useState(8000);
  const [wineTab, setWineTab] = useState("all");
  const [byGlass, setByGlass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MenuSearchResponse | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  useEffect(() => {
    if (debouncedQuery.length === 0) {
      setSortKey("newest");
      setSortDir("desc");
    } else {
      setSortKey("relevance");
      setSortDir("desc");
    }
  }, [debouncedQuery]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, minPriceInput, maxPriceInput, maxSlider, wineTab, byGlass, sortKey, sortDir]);

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

  const runFetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        q: debouncedQuery,
        city: CITY,
        page: String(page),
        per_page: String(PER_PAGE),
      });
      const minP = parseOptionalInt(minPriceInput);
      const maxFromInput = parseOptionalInt(maxPriceInput);
      const maxFromSlider = maxSlider >= 8000 ? null : maxSlider;
      const maxP = maxFromInput ?? maxFromSlider;
      if (minP != null) params.set("min_price", String(minP));
      if (maxP != null) params.set("max_price", String(maxP));
      if (wineTypeParam) params.set("wine_type", wineTypeParam);
      if (byGlass) params.set("by_glass", "true");
      params.set("sort", sortKey);
      params.set("sort_dir", sortDir);

      const res = await fetch(`/api/menu-search?${params.toString()}`, {
        method: "GET",
        credentials: "include",
      });
      const json = (await res.json()) as MenuSearchResponse & { error?: string };
      if (!res.ok) {
        throw new Error(json.error || "Kunde inte hämta data");
      }
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Något gick fel");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, page, minPriceInput, maxPriceInput, maxSlider, wineTypeParam, byGlass, sortKey, sortDir]);

  useEffect(() => {
    void runFetch();
  }, [runFetch]);

  const onSubmitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedQuery(query.trim());
  };

  const groupedRows = useMemo(() => data?.grouped_wines ?? [], [data?.grouped_wines]);

  const toggleSort = (key: ColumnSortKey) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    }
  };

  const totalWines = data?.total_matches ?? 0;
  const krogarOnPage = distinctVenueCountOnPage(groupedRows);
  const totalPages = Math.max(1, Math.ceil(totalWines / PER_PAGE));

  const SortIndicator = ({ active, dir }: { active: boolean; dir: SortDir }) =>
    active ? <span className="ml-0.5 text-zinc-500 tabular-nums dark:text-zinc-400">{dir === "asc" ? "▲" : "▼"}</span> : null;

  const shell =
    isAdmin
      ? "min-h-0 text-zinc-900 dark:text-zinc-50"
      : "min-h-screen bg-zinc-50 pb-20 pt-20 text-zinc-900 md:pt-24";

  const stickyWrap =
    isAdmin
      ? "sticky top-0 z-10 -mx-4 border-b border-zinc-200/80 bg-zinc-50/95 px-4 py-3 shadow-sm backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/95 sm:-mx-6 sm:px-6"
      : "sticky top-16 z-30 -mx-4 border-b border-zinc-200/80 bg-zinc-50/95 px-4 py-3 shadow-sm backdrop-blur-md sm:-mx-6 sm:px-6 md:top-[4.5rem]";

  const inputClass = isAdmin
    ? "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-base shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/30 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-500"
    : "w-full rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-base shadow-sm outline-none placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-400/30";

  const tabActive = isAdmin
    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
    : "bg-zinc-900 text-white";
  const tabIdle = isAdmin
    ? "bg-zinc-200/80 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
    : "bg-zinc-200/80 text-zinc-700 hover:bg-zinc-200";

  const tableCard = isAdmin
    ? "overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
    : "overflow-x-auto rounded-xl border border-zinc-200 bg-white shadow-sm";

  const theadRow = isAdmin ? "border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50" : "border-b border-zinc-200 bg-zinc-50";
  const thText = isAdmin ? "font-semibold text-zinc-700 dark:text-zinc-200" : "font-semibold text-zinc-700";

  return (
    <div className={shell}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Hitta vin i Stockholm</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Sök bland extraherade vinlistor (Starwinelist / menydata).
          </p>
        </header>

        <div className={stickyWrap}>
          <form onSubmit={onSubmitSearch} className="mb-3">
            <label htmlFor={isAdmin ? "admin-wine-q" : "wine-q"} className="sr-only">
              Sök producent, vin eller region
            </label>
            <input
              id={isAdmin ? "admin-wine-q" : "wine-q"}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Producent, vin eller region..."
              className={inputClass}
              autoComplete="off"
              enterKeyHint="search"
            />
          </form>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {WINE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setWineTab(tab.id)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium sm:px-3 sm:text-sm ${
                    wineTab === tab.id ? tabActive : tabIdle
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <label className={`flex cursor-pointer items-center gap-2 text-sm ${isAdmin ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-700"}`}>
                <input
                  type="checkbox"
                  checked={byGlass}
                  onChange={(e) => setByGlass(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-400 text-zinc-900 dark:border-zinc-600"
                />
                På glas
              </label>

              <div className="hidden min-w-[12rem] flex-1 flex-col gap-1 lg:flex lg:max-w-xs">
                <label htmlFor={isAdmin ? "admin-max-slider" : "max-slider"} className={isAdmin ? "text-xs text-zinc-500 dark:text-zinc-400" : "text-xs text-zinc-500"}>
                  Max flaskpris (slider)
                </label>
                <input
                  id={isAdmin ? "admin-max-slider" : "max-slider"}
                  type="range"
                  min={200}
                  max={8000}
                  step={50}
                  value={Math.min(maxSlider, 8000)}
                  onChange={(e) => setMaxSlider(Number(e.target.value))}
                  className={`w-full ${isAdmin ? "accent-zinc-900 dark:accent-zinc-100" : "accent-zinc-900"}`}
                />
                <span className={isAdmin ? "text-xs text-zinc-500 dark:text-zinc-400" : "text-xs text-zinc-500"}>
                  {maxSlider >= 8000 ? "Ingen maxgräns" : `≤ ${new Intl.NumberFormat("sv-SE").format(maxSlider)} kr`}
                </span>
              </div>

              <div className="hidden flex-wrap items-end gap-2 md:flex">
                <div>
                  <label htmlFor={isAdmin ? "admin-min-p" : "min-p"} className={`mb-0.5 block text-xs ${isAdmin ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-500"}`}>
                    Min flaska
                  </label>
                  <input
                    id={isAdmin ? "admin-min-p" : "min-p"}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="—"
                    value={minPriceInput}
                    onChange={(e) => setMinPriceInput(e.target.value)}
                    className={
                      isAdmin
                        ? "w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        : "w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                    }
                  />
                </div>
                <div>
                  <label htmlFor={isAdmin ? "admin-max-p" : "max-p"} className={`mb-0.5 block text-xs ${isAdmin ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-500"}`}>
                    Max flaska
                  </label>
                  <input
                    id={isAdmin ? "admin-max-p" : "max-p"}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="—"
                    value={maxPriceInput}
                    onChange={(e) => setMaxPriceInput(e.target.value)}
                    className={
                      isAdmin
                        ? "w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                        : "w-24 rounded-lg border border-zinc-300 bg-white px-2 py-1.5 text-sm"
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <p className={isAdmin ? "my-4 text-sm text-zinc-600 dark:text-zinc-400" : "my-4 text-sm text-zinc-600"}>
          Visar {groupedRows.length} unika viner från {krogarOnPage} krogar på denna sida
          {totalWines > PER_PAGE ? (
            <span className={isAdmin ? "text-zinc-500 dark:text-zinc-500" : "text-zinc-500"}>
              {" "}
              · sida {data?.page ?? page} ({totalWines} unika totalt)
            </span>
          ) : null}
        </p>

        {data?._fallback && (
          <p className={isAdmin ? "mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200" : "mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900"}>
            Reservläge: kör migration 153 i Supabase (grupperad sökning + serverside-sortering).
          </p>
        )}

        {error && (
          <p className={isAdmin ? "mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200" : "mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800"}>
            {error}
          </p>
        )}

        <div className={tableCard}>
          {loading ? (
            <div className="p-2">
              <TableSkeleton isAdmin={isAdmin} />
            </div>
          ) : (
            <table className="w-full min-w-[880px] border-collapse text-left text-sm">
              <thead>
                <tr className={theadRow}>
                  <th className={`px-3 py-2.5 ${thText}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort("producer")}
                      className="inline-flex items-center hover:text-zinc-900 dark:hover:text-white"
                    >
                      Producent
                      <SortIndicator active={sortKey === "producer"} dir={sortDir} />
                    </button>
                  </th>
                  <th className={`px-3 py-2.5 ${thText}`}>Vin</th>
                  <th className={`hidden px-3 py-2.5 md:table-cell ${thText}`}>Årgång</th>
                  <th className={`px-3 py-2.5 ${thText}`}>Typ</th>
                  <th className={`hidden px-3 py-2.5 lg:table-cell ${thText}`}>Region</th>
                  <th className={`hidden px-3 py-2.5 md:table-cell ${thText}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort("price_glass")}
                      className="inline-flex items-center hover:text-zinc-900 dark:hover:text-white"
                    >
                      Glas
                      <SortIndicator active={sortKey === "price_glass"} dir={sortDir} />
                    </button>
                  </th>
                  <th className={`hidden px-3 py-2.5 md:table-cell ${thText}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort("price_bottle")}
                      className="inline-flex items-center hover:text-zinc-900 dark:hover:text-white"
                    >
                      Flaska
                      <SortIndicator active={sortKey === "price_bottle"} dir={sortDir} />
                    </button>
                  </th>
                  <th className={`px-3 py-2.5 md:hidden ${thText}`}>Glas / Flaska</th>
                  <th className={`px-3 py-2.5 text-center tabular-nums ${thText}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort("places")}
                      className="inline-flex items-center hover:text-zinc-900 dark:hover:text-white"
                    >
                      Ställen
                      <SortIndicator active={sortKey === "places"} dir={sortDir} />
                    </button>
                  </th>
                  <th className={`min-w-[10rem] px-3 py-2.5 ${thText}`}>Krogar</th>
                </tr>
              </thead>
              <tbody>
                {!loading && groupedRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className={
                        isAdmin
                          ? "px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400"
                          : "px-4 py-10 text-center text-sm text-zinc-500"
                      }
                    >
                      Inga viner matchar dina filter. Prova bredare prisintervall, avmarkera &quot;På glas&quot;, eller sök utan ord för att bläddra allt som är indexerat.
                    </td>
                  </tr>
                )}
                {groupedRows.map((row, idx) => {
                  const rowKey = `${normKey(row.producer)}|${normKey(row.wine_name)}|${normKey(row.vintage)}|${idx}`;
                  const tdMuted = isAdmin ? "text-zinc-500 dark:text-zinc-400" : "text-zinc-500";
                  const tdMain = isAdmin ? "text-zinc-900 dark:text-zinc-50" : "text-zinc-900";
                  const tdWine = isAdmin ? "text-zinc-800 dark:text-zinc-100" : "text-zinc-800";
                  const menuTip = `Senast meny: ${formatDaysAgo(row.newest_menu_at)}`;
                  return (
                    <tr
                      key={rowKey}
                      title={menuTip}
                      className={isAdmin ? "border-b border-zinc-100 last:border-0 dark:border-zinc-800" : "border-b border-zinc-100 last:border-0"}
                    >
                      <td className={`max-w-[10rem] px-3 py-2.5 font-semibold sm:max-w-none ${tdMain}`}>
                        {row.producer?.trim() || "—"}
                      </td>
                      <td className={`max-w-[12rem] px-3 py-2.5 sm:max-w-none ${tdWine}`}>
                        {row.wine_name?.trim() || "—"}
                      </td>
                      <td className={`hidden px-3 py-2.5 md:table-cell ${tdMuted}`}>
                        {row.vintage?.trim() || ""}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className={`inline-block h-2 w-2 shrink-0 rounded-full ${wineTypeDotClass(row.wine_type)}`}
                            aria-hidden
                          />
                          <span className={isAdmin ? "text-zinc-700 dark:text-zinc-200" : "text-zinc-700"}>
                            {wineTypeLabelSv(row.wine_type)}
                          </span>
                        </span>
                      </td>
                      <td className={`hidden max-w-[8rem] px-3 py-2.5 lg:table-cell lg:max-w-none ${tdMuted}`}>
                        {[row.region, row.country].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className={`hidden px-3 py-2.5 tabular-nums md:table-cell ${tdWine}`}>
                        {formatSekRange(row.price_glass_min, row.price_glass_max)}
                      </td>
                      <td className={`hidden px-3 py-2.5 tabular-nums md:table-cell ${tdWine}`}>
                        {formatSekRange(row.price_bottle_min, row.price_bottle_max)}
                      </td>
                      <td className={`px-3 py-2.5 md:hidden ${tdWine}`}>
                        <span className="tabular-nums text-xs sm:text-sm">
                          {formatSekRange(row.price_glass_min, row.price_glass_max)}/gl ·{" "}
                          {formatSekRange(row.price_bottle_min, row.price_bottle_max)}/fl
                        </span>
                      </td>
                      <td className={`px-3 py-2.5 text-center tabular-nums ${tdWine}`}>{row.place_count}</td>
                      <td className="max-w-[14rem] px-3 py-2.5 sm:max-w-[18rem]">
                        {venueLinksCell(row.venues, isAdmin, 3)}
                        <p className={`mt-1 text-xs ${tdMuted}`}>{menuTip}</p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {!loading && totalWines > 0 && (
          <div
            className={
              isAdmin
                ? "mt-6 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-4 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row"
                : "mt-6 flex flex-col items-center justify-between gap-3 border-t border-zinc-200 pt-4 text-sm text-zinc-600 sm:flex-row"
            }
          >
            <p>
              Sida {data?.page ?? page} av {totalPages} · {totalWines} unika viner totalt
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={
                  isAdmin
                    ? "rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
                    : "rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                }
              >
                Föregående
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className={
                  isAdmin
                    ? "rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900"
                    : "rounded-lg border border-zinc-300 bg-white px-4 py-2 font-medium disabled:cursor-not-allowed disabled:opacity-40"
                }
              >
                Nästa
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
