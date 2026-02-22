"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueryState, parseAsArrayOf, parseAsString } from "nuqs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { COLOR_MAP, DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { DeleteWineButton } from "@/components/admin/delete-wine-button";
import type { Wine } from "@/lib/actions/wines";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BulkEditsModal } from "./bulk-edits-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const colorColors: Record<string, string> = {
  red: "bg-red-100 text-red-800",
  white: "bg-yellow-100 text-yellow-800",
  rose: "bg-pink-100 text-pink-800",
};

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
  }, [wines, ap, ac, ag, searchQuery]);

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
        case "price":
          return dir * (a.base_price_cents - b.base_price_cents);
        case "created": {
          const ta = new Date(a.created_at || 0).getTime();
          const tb = new Date(b.created_at || 0).getTime();
          return dir * (ta - tb);
        }
        default:
          return 0;
      }
    });
    return list;
  }, [filteredWines, sortBy, sortDir]);

  const filterCount = ap.length + ac.length + ag.length;
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
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Sök vin, producent, druva, färg…"
            className="pl-9 h-10 bg-muted/80 border-muted-foreground/20 focus-visible:ring-primary/40"
            aria-label="Sök viner"
          />
        </div>

        <div className="px-3 py-4 rounded-lg bg-muted">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="font-semibold">
              Producers{" "}
              {ap.length > 0 && (
                <span className="text-foreground/50">({ap.length})</span>
              )}
            </h3>
          </div>
          <Popover open={producerOpen} onOpenChange={setProducerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
              >
                <span>Select producers</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <div className="max-h-56 overflow-y-auto space-y-2">
                {producers.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-2 cursor-pointer text-sm"
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

        <div className="px-3 py-4 rounded-md bg-muted">
          <h3 className="mb-4 font-semibold">
            Color{" "}
            {ac.length > 0 && (
              <span className="text-foreground/50">({ac.length})</span>
            )}
          </h3>
          {availableColors.singleColors.length > 0 || availableColors.dualColors.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {/* Single colors */}
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
                      "rounded-full size-8 ring ring-accent cursor-pointer transition-[outline,box-shadow,opacity] relative overflow-hidden",
                      isOn
                        ? "ring-2 opacity-100 ring-primary/80"
                        : atLeastOneSelected
                          ? "opacity-40 hover:ring-primary/30 hover:opacity-70"
                          : "opacity-100",
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
              {/* Dual colors */}
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
                      "rounded-full size-8 ring ring-accent cursor-pointer transition-[outline,box-shadow,opacity] relative overflow-hidden",
                      isOn
                        ? "ring-2 opacity-100 ring-primary/80"
                        : atLeastOneSelected
                          ? "opacity-40 hover:ring-primary/30 hover:opacity-70"
                          : "opacity-100",
                    )}
                    title={displayName}
                    aria-pressed={isOn}
                    aria-label={`Filter by color: ${displayName}`}
                  >
                    {/* Left half */}
                    <div
                      className="absolute top-0 left-0 w-1/2 h-full"
                      style={{ backgroundColor: c1.value }}
                    />
                    {/* Right half */}
                    <div
                      className="absolute top-0 right-0 w-1/2 h-full"
                      style={{ backgroundColor: c2.value }}
                    />
                    <span className="sr-only">{displayName}</span>
                  </button>
                );
              })}
            </div>
          ) : (
            <span className="text-xs text-foreground/50">—</span>
          )}
        </div>

        <div className="px-3 py-4 rounded-md bg-muted">
          <div className="flex items-baseline justify-between gap-3 mb-4">
            <h3 className="font-semibold">
              Grapes{" "}
              {ag.length > 0 && (
                <span className="text-foreground/50">({ag.length})</span>
              )}
            </h3>
          </div>
          <Popover open={grapesOpen} onOpenChange={setGrapesOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 text-sm font-medium text-foreground hover:text-foreground/80 transition-colors"
              >
                <span>Select grapes</span>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2" align="start">
              <Input
                value={grapeSearch}
                onChange={(e) => setGrapeSearch(e.target.value)}
                placeholder="Search grapes…"
                className="mb-2 h-8 bg-background"
              />
              <div className="max-h-48 overflow-y-auto space-y-2">
                {filteredGrapesList.map((g) => (
                  <label
                    key={g}
                    className="flex items-center gap-2 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={ag.includes(g)}
                      onCheckedChange={() => toggleGrape(g)}
                    />
                    {g}
                  </label>
                ))}
                {filteredGrapesList.length === 0 && (
                  <p className="text-xs text-foreground/50 py-2">No grapes match</p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {hasActiveFiltersOrSearch && (
          <div className="flex items-center">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-foreground/60 hover:text-foreground/80" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              {hasSearch && filterCount > 0 ? "Rensa filter och sök" : hasSearch ? "Rensa sök" : `Rensa (${filterCount})`}
            </Button>
          </div>
        )}
      </div>

      {/* Table - scrollable region so the wine list is always scrollable */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>All Wines</CardTitle>
            <CardDescription>
              {hasActiveFiltersOrSearch
                ? `Visar ${filteredWines.length} av ${wines.length} viner`
                : `Alla vinprodukter`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Sortera:</span>
            <Select
              value={`${sortBy}-${sortDir}`}
              onValueChange={(v) => {
                const [s, d] = v.split("-") as [string, string];
                setSortBy(s);
                setSortDir(d);
              }}
            >
              <SelectTrigger className="w-[200px] h-9 bg-muted/80">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wine-asc">Vin (A→Ö)</SelectItem>
                <SelectItem value="wine-desc">Vin (Ö→A)</SelectItem>
                <SelectItem value="producer-asc">Producent (A→Ö)</SelectItem>
                <SelectItem value="producer-desc">Producent (Ö→A)</SelectItem>
                <SelectItem value="price-asc">Pris (lägst först)</SelectItem>
                <SelectItem value="price-desc">Pris (högst först)</SelectItem>
                <SelectItem value="created-desc">Tillagd (nyast först)</SelectItem>
                <SelectItem value="created-asc">Tillagd (äldst först)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto max-h-[min(60vh,800px)] rounded-md border border-gray-100">
            {sortedWines.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left p-3 font-medium text-sm text-gray-600">Image</th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">Wine</th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">Producer</th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">Color</th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">Price</th>
                    <th className="text-left p-3 font-medium text-sm text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedWines.map((wine) => (
                    <tr key={wine.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3">
                        <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                          <Image
                            src={wine.label_image_path || DEFAULT_WINE_IMAGE_PATH}
                            alt={`${wine.wine_name} ${wine.vintage}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      </td>
                      <td className="p-3">
                        <div>
                          <div className="font-medium text-gray-900">{wine.wine_name}</div>
                          <div className="text-sm text-gray-500">{wine.vintage}</div>
                          <div className="text-xs text-gray-400">{wine.grape_varieties}</div>
                        </div>
                      </td>
                      <td className="p-3 text-gray-900">{wine.producer?.name || "Unknown"}</td>
                      <td className="p-3">
                        <Badge
                          className={
                            colorColors[wine.color as keyof typeof colorColors] ||
                            "bg-gray-100 text-gray-800"
                          }
                        >
                          {wine.color}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium text-gray-900">
                        {Math.ceil(wine.base_price_cents / 100)} SEK
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Link href={`/admin/wines/${wine.id}`}>
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          </Link>
                          <DeleteWineButton wineId={wine.id} wineName={wine.wine_name} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {hasActiveFiltersOrSearch ? "Inga viner matchar filtren eller sökningen" : "Inga viner hittades"}
                </p>
                {hasActiveFiltersOrSearch ? (
                  <Button variant="outline" onClick={clearFilters}>
                    Rensa filter och sök
                  </Button>
                ) : (
                  <Link href="/admin/wines/new">
                    <Button>Add your first wine</Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
