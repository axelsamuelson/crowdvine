"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { COLOR_MAP, DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import type { Wine } from "@/lib/actions/wines";
import { ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BulkEditsModal } from "./bulk-edits-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const colorColors: Record<string, string> = {
  red: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300",
  white: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
  rose: "bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300",
};

const VERDICT_LABELS: Record<"buy" | "maybe" | "pass", string> = {
  buy: "Köp",
  maybe: "Kanske",
  pass: "Nej",
};

const VERDICT_SORT_RANK: Record<"buy" | "maybe" | "pass", number> = {
  buy: 3,
  maybe: 2,
  pass: 1,
};

type SortColumn =
  | "wine"
  | "producer"
  | "color"
  | "status"
  | "rating"
  | "price"
  | "created";

function hasInternalRating(w: Wine): boolean {
  return w.latest_rating_score != null || w.latest_rating_verdict != null;
}

function statusSortRank(w: Wine): number {
  const live = w.is_live !== false;
  const available = w.available_for_sale !== false;
  if (live && available) return 3;
  if (live) return 2;
  return 1;
}

function ratingSortRank(w: Wine): number {
  if (w.latest_rating_score != null) return w.latest_rating_score;
  if (w.latest_rating_verdict) return VERDICT_SORT_RANK[w.latest_rating_verdict];
  return -1;
}

function SortableTh({
  column,
  label,
  sortBy,
  sortDir,
  onSort,
  className,
}: {
  column: SortColumn;
  label: string;
  sortBy: string;
  sortDir: string;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const active = sortBy === column;
  return (
    <th
      className={cn(
        "text-left p-3 font-medium text-xs text-gray-600 dark:text-zinc-400",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          "inline-flex items-center gap-1 rounded-md transition-colors hover:text-gray-900 dark:hover:text-zinc-100",
          active && "text-gray-900 dark:text-zinc-100",
        )}
        aria-sort={
          active ? (sortDir === "desc" ? "descending" : "ascending") : "none"
        }
      >
        {label}
        {active ? (
          sortDir === "desc" ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <span className="h-3.5 w-3.5 shrink-0 opacity-30" aria-hidden>
            <ChevronDown className="h-3.5 w-3.5" />
          </span>
        )}
      </button>
    </th>
  );
}

function WineRatingBadge({
  score,
  verdict,
}: {
  score?: number | null;
  verdict?: "buy" | "maybe" | "pass" | null;
}) {
  if (score == null && verdict == null) {
    return (
      <span className="text-sm text-gray-400 dark:text-zinc-500" aria-label="Inget betyg">
        —
      </span>
    );
  }

  const parts = [
    score != null ? String(score) : null,
    verdict ? VERDICT_LABELS[verdict] : null,
  ].filter(Boolean);

  return (
    <Badge
      className={cn(
        "normal-case tracking-normal",
        verdict === "buy" &&
          "border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
        verdict === "maybe" &&
          "border-transparent bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
        verdict === "pass" &&
          "border-transparent bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
        !verdict &&
          "border-transparent bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
      )}
    >
      {parts.join(" · ")}
    </Badge>
  );
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;
}

function extractGrapes(wines: Wine[]): string[] {
  const set = new Set<string>();
  wines.forEach((w) => {
    (w.grape_varieties || "")
      .split(/[,;]/)
      .map((g) => g.trim())
      .filter(Boolean)
      .forEach((g) => set.add(g));
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

function WineStatusBadges({
  isLive,
  availableForSale,
}: {
  isLive?: boolean;
  availableForSale?: boolean;
}) {
  const live = isLive !== false;
  const available = availableForSale !== false;

  return (
    <div className="flex flex-col gap-1">
      <span
        className={cn(
          "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
          live
            ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
        )}
      >
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            live ? "bg-emerald-500" : "bg-amber-500",
          )}
        />
        {live ? "Live" : "Dold"}
      </span>
      {live ? (
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
            available
              ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-400"
              : "bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400",
          )}
        >
          {available ? "Tillgänglig" : "Slut"}
        </span>
      ) : null}
    </div>
  );
}

export function AdminWinesContent({
  wines,
  initialMargin,
  isMixed,
  initialB2BMargin,
  isB2BMixed,
}: {
  wines: Wine[];
  initialMargin: number | null;
  isMixed: boolean;
  initialB2BMargin: number | null;
  isB2BMixed: boolean;
}) {
  const [ap, setAp] = useQueryState("ap", parseAsArrayOf(parseAsString).withDefault([]));
  const [ac, setAc] = useQueryState("ac", parseAsArrayOf(parseAsString).withDefault([]));
  const [ag, setAg] = useQueryState("ag", parseAsArrayOf(parseAsString).withDefault([]));
  const [ratingFilter, setRatingFilter] = useQueryState(
    "ar",
    parseAsString.withDefault("all"),
  );
  const [searchQuery, setSearchQuery] = useQueryState("q", parseAsString.withDefault(""));
  const [sortBy, setSortBy] = useQueryState("sort", parseAsString.withDefault("wine"));
  const [sortDir, setSortDir] = useQueryState("dir", parseAsString.withDefault("asc"));

  const [producerOpen, setProducerOpen] = useState(false);
  const [grapesOpen, setGrapesOpen] = useState(false);
  const [grapeSearch, setGrapeSearch] = useState("");

  const producers = useMemo(() => {
    const m = new Map<string, string>();
    wines.forEach((w) => {
      if (w.producer_id) m.set(w.producer_id, w.producer?.name || "Unknown");
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [wines]);

  const availableColors = useMemo(() => {
    const singleColors: Array<{ name: string; value: string }> = [];
    const dualColors: Array<[{ name: string; value: string }, { name: string; value: string }]> = [];
    
    wines.forEach((w) => {
      const c = (w.color || "").trim();
      if (!c) return;
      
      const lowerC = c.toLowerCase();
      
      // Check for dual color combinations
      if (c.includes("/") || c.includes("&")) {
        const parts = c.split(/[/&]/).map(p => p.trim().toLowerCase());
        if (parts.length === 2) {
          const [c1, c2] = parts;
          const color1 = { name: capitalize(c1), value: COLOR_MAP[c1] || "#94a3b8" };
          const color2 = { name: capitalize(c2), value: COLOR_MAP[c2] || "#94a3b8" };
          // Check if this combination already exists
          const exists = dualColors.some(
            ([a, b]) => 
              (a.name.toLowerCase() === c1 && b.name.toLowerCase() === c2) ||
              (a.name.toLowerCase() === c2 && b.name.toLowerCase() === c1)
          );
          if (!exists) {
            dualColors.push([color1, color2]);
          }
        }
      } else {
        // Single color
        if (!singleColors.some(sc => sc.name.toLowerCase() === lowerC)) {
          singleColors.push({ 
            name: capitalize(c), 
            value: COLOR_MAP[lowerC] || "#94a3b8" 
          });
        }
      }
    });
    
    // Always include Red/White and Red/Orange dual colors if they don't exist
    const redWhiteExists = dualColors.some(
      ([a, b]) => 
        (a.name.toLowerCase() === "red" && b.name.toLowerCase() === "white") ||
        (a.name.toLowerCase() === "white" && b.name.toLowerCase() === "red")
    );
    if (!redWhiteExists) {
      dualColors.push([
        { name: "Red", value: COLOR_MAP["red"] || "#CE0000" },
        { name: "White", value: COLOR_MAP["white"] || "#FEF3C7" }
      ]);
    }
    
    const redOrangeExists = dualColors.some(
      ([a, b]) => 
        (a.name.toLowerCase() === "red" && b.name.toLowerCase() === "orange") ||
        (a.name.toLowerCase() === "orange" && b.name.toLowerCase() === "red")
    );
    if (!redOrangeExists) {
      dualColors.push([
        { name: "Red", value: COLOR_MAP["red"] || "#CE0000" },
        { name: "Orange", value: COLOR_MAP["orange"] || "#FF8C00" }
      ]);
    }
    
    return { singleColors, dualColors };
  }, [wines]);

  const availableGrapes = useMemo(() => extractGrapes(wines), [wines]);

  const filteredWines = useMemo(() => {
    return wines.filter((w) => {
      if (ap.length && !ap.includes(w.producer_id)) return false;
      if (ac.length) {
        const wc = (w.color || "").trim();
        const wcLower = wc.toLowerCase();
        const matches = ac.some((selectedColor) => {
          const selectedLower = selectedColor.toLowerCase();
          if (wcLower === selectedLower) return true;
          if (selectedColor.includes("/")) {
            const [c1, c2] = selectedColor.split("/").map(c => c.trim().toLowerCase());
            const normalizedWc = wcLower.replace(/[/&]/g, "/");
            return normalizedWc.includes(c1) && normalizedWc.includes(c2);
          }
          if (wc.includes("/") || wc.includes("&")) {
            const parts = wc.split(/[/&]/).map(p => p.trim().toLowerCase());
            return parts.includes(selectedLower);
          }
          return false;
        });
        if (!matches) return false;
      }
      if (ag.length) {
        const wg = (w.grape_varieties || "")
          .split(/[,;]/)
          .map((g) => g.trim().toLowerCase())
          .filter(Boolean);
        if (!ag.some((g) => wg.includes(g.toLowerCase()))) return false;
      }
      if (ratingFilter === "rated" && !hasInternalRating(w)) return false;
      if (ratingFilter === "unrated" && hasInternalRating(w)) return false;
      // Search: match wine name, vintage, producer, grapes, color, handle
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const producerName = (w.producer?.name || "").toLowerCase();
        const wineName = (w.wine_name || "").toLowerCase();
        const vintage = String(w.vintage || "").toLowerCase();
        const grapes = (w.grape_varieties || "").toLowerCase();
        const color = (w.color || "").toLowerCase();
        const handle = (w.handle || "").toLowerCase();
        const match =
          producerName.includes(q) ||
          wineName.includes(q) ||
          vintage.includes(q) ||
          grapes.includes(q) ||
          color.includes(q) ||
          handle.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [wines, ap, ac, ag, ratingFilter, searchQuery]);

  const sortedWines = useMemo(() => {
    const list = [...filteredWines];
    const dir = sortDir === "desc" ? -1 : 1;
    list.sort((a, b) => {
      switch (sortBy) {
        case "wine": {
          const na = `${(a.wine_name || "").toLowerCase()} ${a.vintage || ""}`;
          const nb = `${(b.wine_name || "").toLowerCase()} ${b.vintage || ""}`;
          return dir * na.localeCompare(nb, "sv");
        }
        case "producer": {
          const na = (a.producer?.name || "Unknown").toLowerCase();
          const nb = (b.producer?.name || "Unknown").toLowerCase();
          return dir * na.localeCompare(nb, "sv");
        }
        case "color": {
          const na = (a.color || "").toLowerCase();
          const nb = (b.color || "").toLowerCase();
          return dir * na.localeCompare(nb, "sv");
        }
        case "status": {
          const ra = statusSortRank(a);
          const rb = statusSortRank(b);
          if (ra !== rb) return dir * (ra - rb);
          return dir * (a.wine_name || "").localeCompare(b.wine_name || "", "sv");
        }
        case "rating": {
          const ra = ratingSortRank(a);
          const rb = ratingSortRank(b);
          if (ra !== rb) return dir * (ra - rb);
          return dir * (a.wine_name || "").localeCompare(b.wine_name || "", "sv");
        }
        case "price":
          return dir * (a.base_price_cents - b.base_price_cents);
        case "created": {
          const ta = Date.parse(a.created_at ?? "") || 0;
          const tb = Date.parse(b.created_at ?? "") || 0;
          if (ta !== tb) return dir * (ta - tb);
          return dir * (a.wine_name || "").localeCompare(b.wine_name || "", "sv");
        }
        default:
          return 0;
      }
    });
    return list;
  }, [filteredWines, sortBy, sortDir]);

  const handleColumnSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(column);
    // Sensible default direction when switching column
    const defaultDesc =
      column === "price" || column === "rating" || column === "created";
    setSortDir(defaultDesc ? "desc" : "asc");
  };

  const filterCount =
    ap.length + ac.length + ag.length + (ratingFilter !== "all" ? 1 : 0);
  const hasSearch = searchQuery.trim().length > 0;
  const hasActiveFiltersOrSearch = filterCount > 0 || hasSearch;

  const toggleProducer = (id: string) => {
    setAp(ap.includes(id) ? ap.filter((x) => x !== id) : [...ap, id]);
  };

  const toggleGrape = (g: string) => {
    setAg(ag.includes(g) ? ag.filter((x) => x !== g) : [...ag, g]);
  };

  const toggleColor = (color: { name: string; value: string } | [{ name: string; value: string }, { name: string; value: string }]) => {
    let key: string;
    if (Array.isArray(color)) {
      const [c1, c2] = color;
      key = `${c1.name.toLowerCase()}/${c2.name.toLowerCase()}`;
    } else {
      key = color.name.toLowerCase();
    }
    setAc(ac.includes(key) ? ac.filter((c) => c !== key) : [...ac, key]);
  };

  const clearFilters = () => {
    setAp([]);
    setAc([]);
    setAg([]);
    setRatingFilter("all");
    setSearchQuery("");
    setProducerOpen(false);
    setGrapesOpen(false);
  };

  const filteredGrapesList = grapeSearch.trim()
    ? availableGrapes.filter((g) =>
        g.toLowerCase().includes(grapeSearch.trim().toLowerCase()),
      )
    : availableGrapes;

  return (
    <div className="space-y-4">
      {/* Bulk edits button - opens modal for B2C and B2B margin updates */}
      <div className="flex justify-end">
        <BulkEditsModal
          initialMargin={initialMargin}
          isMixed={isMixed}
          initialB2BMargin={initialB2BMargin}
          isB2BMixed={isB2BMixed}
          filteredWineIds={filteredWines.map((w) => w.id)}
          hasActiveFilters={filterCount > 0 || hasSearch}
        />
      </div>

      {/* Search + Filter bar */}
      <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-3 sm:p-4 dark:border-[#1F1F23] dark:bg-zinc-900/50">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <div className="relative w-full min-w-0 flex-1 sm:min-w-[220px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500 dark:text-zinc-400" />
              <Input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sök vin, producent, druva…"
                className="h-10 rounded-lg border-gray-200 bg-white pl-9 text-gray-900 placeholder:text-gray-500 sm:h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-400"
                aria-label="Sök viner"
              />
            </div>
            {hasActiveFiltersOrSearch ? (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-full shrink-0 gap-1 rounded-lg text-gray-600 hover:text-gray-900 sm:h-9 sm:w-auto dark:text-zinc-400 dark:hover:text-zinc-100"
                onClick={clearFilters}
              >
                <X className="h-3.5 w-3.5" />
                {hasSearch && filterCount > 0
                  ? "Rensa filter och sök"
                  : hasSearch
                    ? "Rensa sök"
                    : `Rensa (${filterCount})`}
              </Button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                Producent
                {ap.length > 0 ? (
                  <span className="ml-1 text-gray-400 dark:text-zinc-500">
                    ({ap.length})
                  </span>
                ) : null}
              </label>
              <Popover open={producerOpen} onOpenChange={setProducerOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 sm:h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className="truncate">
                      {ap.length > 0
                        ? `${ap.length} valda`
                        : "Alla producenter"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
                  align="start"
                >
                  <div className="max-h-56 space-y-2 overflow-y-auto">
                    {producers.map((p) => (
                      <label
                        key={p.id}
                        className="flex cursor-pointer items-center gap-2 text-sm text-gray-900 dark:text-zinc-100"
                      >
                        <Checkbox
                          checked={ap.includes(p.id)}
                          onCheckedChange={() => toggleProducer(p.id)}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                Druvor
                {ag.length > 0 ? (
                  <span className="ml-1 text-gray-400 dark:text-zinc-500">
                    ({ag.length})
                  </span>
                ) : null}
              </label>
              <Popover open={grapesOpen} onOpenChange={setGrapesOpen}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="flex h-10 w-full items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 sm:h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  >
                    <span className="truncate">
                      {ag.length > 0 ? `${ag.length} valda` : "Alla druvor"}
                    </span>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-2 dark:border-zinc-700 dark:bg-zinc-900"
                  align="start"
                >
                  <Input
                    value={grapeSearch}
                    onChange={(e) => setGrapeSearch(e.target.value)}
                    placeholder="Sök druvor…"
                    className="mb-2 h-8 border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                  />
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {filteredGrapesList.map((g) => (
                      <label
                        key={g}
                        className="flex cursor-pointer items-center gap-2 text-sm text-gray-900 dark:text-zinc-100"
                      >
                        <Checkbox
                          checked={ag.includes(g)}
                          onCheckedChange={() => toggleGrape(g)}
                        />
                        {g}
                      </label>
                    ))}
                    {filteredGrapesList.length === 0 && (
                      <p className="py-2 text-xs text-gray-500 dark:text-zinc-400">
                        Inga druvor matchar
                      </p>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                Betyg
              </label>
              <Select
                value={ratingFilter || "all"}
                onValueChange={(v) => setRatingFilter(v)}
              >
                <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-white text-sm text-gray-900 sm:h-9 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alla</SelectItem>
                  <SelectItem value="rated">Bedömda</SelectItem>
                  <SelectItem value="unrated">Ej bedömda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-0 flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                Färg
                {ac.length > 0 ? (
                  <span className="ml-1 text-gray-400 dark:text-zinc-500">
                    ({ac.length})
                  </span>
                ) : null}
              </label>
              <div className="flex h-10 items-center gap-2 overflow-x-auto rounded-lg border border-gray-200 bg-white px-2 sm:h-9 sm:gap-1.5 dark:border-zinc-700 dark:bg-zinc-900">
                {availableColors.singleColors.length > 0 ||
                availableColors.dualColors.length > 0 ? (
                  <>
                    {availableColors.singleColors.map((c) => {
                      const key = c.name.toLowerCase();
                      const isOn = ac.includes(key);
                      const atLeastOneSelected = ac.length > 0;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleColor(c)}
                          className={cn(
                            "relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-full ring transition-[outline,box-shadow,opacity] sm:size-6",
                            isOn
                              ? "opacity-100 ring-2 ring-gray-900 dark:ring-zinc-100"
                              : atLeastOneSelected
                                ? "opacity-40 ring-gray-300 hover:opacity-70 dark:ring-zinc-600"
                                : "opacity-100 ring-gray-300 dark:ring-zinc-600",
                          )}
                          style={{ backgroundColor: c.value }}
                          title={c.name}
                          aria-pressed={isOn}
                          aria-label={`Filter by color: ${c.name}`}
                        >
                          <span className="sr-only">{c.name}</span>
                        </button>
                      );
                    })}
                    {availableColors.dualColors.map(([c1, c2], idx) => {
                      const key = `${c1.name.toLowerCase()}/${c2.name.toLowerCase()}`;
                      const isOn = ac.includes(key);
                      const atLeastOneSelected = ac.length > 0;
                      const displayName = `${c1.name}/${c2.name}`;
                      return (
                        <button
                          key={`dual-${idx}`}
                          type="button"
                          onClick={() => toggleColor([c1, c2])}
                          className={cn(
                            "relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-full ring transition-[outline,box-shadow,opacity] sm:size-6",
                            isOn
                              ? "opacity-100 ring-2 ring-gray-900 dark:ring-zinc-100"
                              : atLeastOneSelected
                                ? "opacity-40 ring-gray-300 hover:opacity-70 dark:ring-zinc-600"
                                : "opacity-100 ring-gray-300 dark:ring-zinc-600",
                          )}
                          title={displayName}
                          aria-pressed={isOn}
                          aria-label={`Filter by color: ${displayName}`}
                        >
                          <div
                            className="absolute left-0 top-0 h-full w-1/2"
                            style={{ backgroundColor: c1.value }}
                          />
                          <div
                            className="absolute right-0 top-0 h-full w-1/2"
                            style={{ backgroundColor: c2.value }}
                          />
                          <span className="sr-only">{displayName}</span>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <span className="px-1 text-xs text-gray-500 dark:text-zinc-400">
                    —
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wine list: cards on mobile, table from md up */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="flex flex-col gap-3 border-b border-gray-200 p-4 dark:border-[#1F1F23] sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              All Wines
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
              {hasActiveFiltersOrSearch
                ? `Visar ${filteredWines.length} av ${wines.length} viner`
                : `Alla vinprodukter`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-1.5 sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <span className="text-xs text-gray-500 dark:text-zinc-400 sm:whitespace-nowrap">
              Sortera:
            </span>
            <Select
              value={`${sortBy}-${sortDir}`}
              onValueChange={(v) => {
                const dash = v.lastIndexOf("-");
                const s = dash === -1 ? v : v.slice(0, dash);
                const d = dash === -1 ? "asc" : v.slice(dash + 1);
                setSortBy(s);
                setSortDir(d);
              }}
            >
              <SelectTrigger className="h-10 w-full rounded-lg border-gray-200 bg-gray-50 text-sm dark:border-zinc-700 dark:bg-zinc-900/70 sm:h-9 sm:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wine-asc">Vin (A→Ö)</SelectItem>
                <SelectItem value="wine-desc">Vin (Ö→A)</SelectItem>
                <SelectItem value="producer-asc">Producent (A→Ö)</SelectItem>
                <SelectItem value="producer-desc">Producent (Ö→A)</SelectItem>
                <SelectItem value="color-asc">Färg (A→Ö)</SelectItem>
                <SelectItem value="color-desc">Färg (Ö→A)</SelectItem>
                <SelectItem value="status-desc">Status (live först)</SelectItem>
                <SelectItem value="status-asc">Status (dold först)</SelectItem>
                <SelectItem value="rating-desc">Betyg (högst först)</SelectItem>
                <SelectItem value="rating-asc">Betyg (lägst först)</SelectItem>
                <SelectItem value="price-asc">Pris (lägst först)</SelectItem>
                <SelectItem value="price-desc">Pris (högst först)</SelectItem>
                <SelectItem value="created-desc">Tillagd (nyast först)</SelectItem>
                <SelectItem value="created-asc">Tillagd (äldst först)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {sortedWines.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="mb-4 text-sm text-gray-500 dark:text-zinc-400">
              {hasActiveFiltersOrSearch
                ? "Inga viner matchar filtren eller sökningen"
                : "Inga viner hittades"}
            </p>
            {hasActiveFiltersOrSearch ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700"
                onClick={clearFilters}
              >
                Rensa filter och sök
              </Button>
            ) : (
              <Link href="/admin/wines/new">
                <Button
                  size="sm"
                  className="rounded-lg bg-gray-900 text-xs font-medium text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Add your first wine
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <>
            {/* Mobile card list */}
            <ul className="divide-y divide-gray-100 dark:divide-zinc-800/50 md:hidden">
              {sortedWines.map((wine) => (
                <li key={wine.id} className="p-4">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800">
                      <Image
                        src={wine.label_image_path || DEFAULT_WINE_IMAGE_PATH}
                        alt={`${wine.wine_name} ${wine.vintage}`}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium leading-snug text-gray-900 dark:text-zinc-100">
                        {wine.wine_name}
                      </div>
                      <div className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
                        {wine.vintage}
                        {wine.producer?.name
                          ? ` · ${wine.producer.name}`
                          : ""}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                            colorColors[wine.color as keyof typeof colorColors] ||
                              "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300",
                          )}
                        >
                          {wine.color}
                        </span>
                        <WineRatingBadge
                          score={wine.latest_rating_score}
                          verdict={wine.latest_rating_verdict}
                        />
                        <span className="text-sm font-medium text-gray-900 dark:text-zinc-100">
                          {Math.ceil(wine.base_price_cents / 100)} SEK
                        </span>
                      </div>
                      <div className="mt-2">
                        <WineStatusBadges
                          isLive={wine.is_live}
                          availableForSale={wine.available_for_sale}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Link
                      href={`/admin/wines/${wine.id}`}
                      className="min-w-0 flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-full rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700"
                      >
                        Edit
                      </Button>
                    </Link>
                    <DeleteWineButton
                      wineId={wine.id}
                      wineName={wine.wine_name}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {/* Desktop table */}
            <div className="hidden max-h-[min(60vh,800px)] overflow-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-zinc-800 dark:bg-zinc-900/70">
                    <th className="p-3 text-left text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Image
                    </th>
                    <SortableTh
                      column="wine"
                      label="Wine"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      column="producer"
                      label="Producer"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      column="color"
                      label="Color"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      column="status"
                      label="Status"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      column="rating"
                      label="Betyg"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <SortableTh
                      column="price"
                      label="Price"
                      sortBy={sortBy}
                      sortDir={sortDir}
                      onSort={handleColumnSort}
                    />
                    <th className="p-3 text-left text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWines.map((wine) => (
                    <tr
                      key={wine.id}
                      className="border-b border-gray-100 hover:bg-gray-50 dark:border-zinc-800/50 dark:hover:bg-zinc-800/50"
                    >
                      <td className="p-3">
                        <div className="relative h-16 w-16 overflow-hidden rounded-lg bg-gray-100 dark:bg-zinc-800">
                          <Image
                            src={
                              wine.label_image_path || DEFAULT_WINE_IMAGE_PATH
                            }
                            alt={`${wine.wine_name} ${wine.vintage}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-zinc-100">
                            {wine.wine_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-zinc-400">
                            {wine.vintage}
                          </div>
                          <div className="text-xs text-gray-400 dark:text-zinc-500">
                            {wine.grape_varieties}
                          </div>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-gray-900 dark:text-zinc-100">
                        {wine.producer?.name || "Unknown"}
                      </td>
                      <td className="p-3">
                        <span
                          className={cn(
                            "inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium",
                            colorColors[
                              wine.color as keyof typeof colorColors
                            ] ||
                              "bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300",
                          )}
                        >
                          {wine.color}
                        </span>
                      </td>
                      <td className="p-3">
                        <WineStatusBadges
                          isLive={wine.is_live}
                          availableForSale={wine.available_for_sale}
                        />
                      </td>
                      <td className="p-3">
                        <WineRatingBadge
                          score={wine.latest_rating_score}
                          verdict={wine.latest_rating_verdict}
                        />
                      </td>
                      <td className="p-3 text-sm font-medium text-gray-900 dark:text-zinc-100">
                        {Math.ceil(wine.base_price_cents / 100)} SEK
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Link href={`/admin/wines/${wine.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="rounded-lg border-gray-200 text-xs font-medium dark:border-zinc-700"
                            >
                              Edit
                            </Button>
                          </Link>
                          <DeleteWineButton
                            wineId={wine.id}
                            wineName={wine.wine_name}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
