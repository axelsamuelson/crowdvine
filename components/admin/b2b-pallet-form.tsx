"use client";

import { useState, useEffect, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Trash2, ChevronsUpDown, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  collectCurrenciesNeedingRates,
  computePalletCostSummary,
  formatSekFromCents,
  getPalletLineCost,
  getWineCostCentsExVat,
} from "@/lib/b2b-wine-cost";
import { fetchClientExchangeRatesMap } from "@/lib/b2b-exchange-rates-client";
import {
  computePalletColorCounts,
  wineColorDotClass,
} from "@/lib/wine-color";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { ADMIN_ACTIVE_SWITCH_CLASS } from "@/lib/admin-form-styles";

const inputClass =
  "h-10 border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500";
const inputSmClass =
  "h-8 text-sm border-gray-200 bg-white text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";
const labelClass = "text-sm font-medium text-gray-700 dark:text-zinc-300";
const sectionClass =
  "rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-[#1F1F23] dark:bg-zinc-950/60";
const hintClass = "text-xs text-gray-500 dark:text-zinc-400";
const selectTriggerClass =
  "h-9 w-full border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100";

interface Wine {
  id: string;
  wine_name: string;
  vintage: string;
  color?: string | null;
  cost_amount?: number;
  cost_currency?: string;
  exchange_rate?: number;
  alcohol_tax_cents?: number;
  producers?: { name: string } | null;
  costCentsExVat?: number;
}

interface PalletItem {
  wine_id: string;
  wine?: Wine;
  quantity: number;
  cost_cents_override: number | null;
}

function getWineSearchLabel(w: Wine): string {
  const name = [w.wine_name, w.vintage].filter(Boolean).join(" ");
  const producer = w.producers?.name;
  return producer ? `${name} — ${producer}` : name;
}

export default function B2BPalletForm({ shipmentId }: { shipmentId?: string }) {
  const router = useRouter();
  const isEdit = !!shipmentId;

  const [name, setName] = useState("");
  const [shippedAt, setShippedAt] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [palletCostCents, setPalletCostCents] = useState<number | "">("");
  const [isActive, setIsActive] = useState(false);
  const [items, setItems] = useState<PalletItem[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wineComboboxOpen, setWineComboboxOpen] = useState(false);
  const [wineSearchQuery, setWineSearchQuery] = useState("");
  const [wineProducerFilter, setWineProducerFilter] = useState("");
  const [wineColorFilter, setWineColorFilter] = useState("");
  const [showProducerSummary, setShowProducerSummary] = useState(false);
  const [expandedProducers, setExpandedProducers] = useState<Set<string>>(
    new Set(),
  );
  const [fxRates, setFxRates] = useState<Record<string, number>>({ SEK: 1 });

  useEffect(() => {
    const fetchWines = async () => {
      try {
        const res = await fetch("/api/admin/wines/with-cost");
        if (res.ok) {
          const data = await res.json();
          setWines(data);
          const currencies = collectCurrenciesNeedingRates(data);
          if (currencies.length > 0) {
            const rates = await fetchClientExchangeRatesMap(currencies);
            setFxRates({ SEK: 1, ...rates });
          }
        }
      } catch (err) {
        console.error("Failed to fetch wines:", err);
        toast.error("Kunde inte hämta viner");
      } finally {
        setLoading(false);
      }
    };
    fetchWines();
  }, []);

  useEffect(() => {
    if (isEdit && shipmentId) {
      const fetchShipment = async () => {
        try {
          const res = await fetch(
            `/api/admin/b2b-pallet-shipments/${shipmentId}`,
          );
          if (res.ok) {
            const data = await res.json();
            setName(data.name || "");
            setShippedAt(
              data.shipped_at
                ? format(new Date(data.shipped_at), "yyyy-MM-dd")
                : "",
            );
            setDeliveredAt(
              data.delivered_at
                ? format(new Date(data.delivered_at), "yyyy-MM-dd")
                : "",
            );
            setPalletCostCents(
              data.cost_cents != null ? data.cost_cents : "",
            );
            setIsActive(data.is_active === true);
            const mapped = (data.b2b_pallet_shipment_items || []).map(
              (it: {
                wine_id: string;
                wines?: Wine;
                quantity?: number;
                cost_cents_override: number | null;
              }) => ({
                wine_id: it.wine_id,
                wine: it.wines,
                quantity: it.quantity || 0,
                cost_cents_override: it.cost_cents_override,
              }),
            );
            setItems(mapped);
          } else {
            toast.error("Kunde inte hämta pallen");
          }
        } catch {
          toast.error("Kunde inte hämta pallen");
        }
      };
      fetchShipment();
    }
  }, [isEdit, shipmentId]);

  const addWine = (wine: Wine) => {
    if (items.some((i) => i.wine_id === wine.id)) {
      toast.error("Vinet finns redan i listan");
      return;
    }
    setItems([
      ...items,
      {
        wine_id: wine.id,
        wine,
        quantity: 1,
        cost_cents_override: null,
      },
    ]);
    setWineComboboxOpen(false);
  };

  const removeItem = (wineId: string) => {
    setItems(items.filter((i) => i.wine_id !== wineId));
  };

  const updateItem = (
    wineId: string,
    updates: Partial<Pick<PalletItem, "quantity" | "cost_cents_override">>,
  ) => {
    setItems(
      items.map((i) => (i.wine_id === wineId ? { ...i, ...updates } : i)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Ange ett namn för pallen");
      return;
    }
    if (items.length === 0) {
      toast.error("Lägg till minst ett vin");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        shipped_at: shippedAt || null,
        delivered_at: deliveredAt || null,
        cost_cents: palletCostCents !== "" ? palletCostCents : null,
        is_active: isActive,
        items: items.map((i) => ({
          wine_id: i.wine_id,
          quantity: i.quantity,
          cost_cents_override:
            i.cost_cents_override != null ? i.cost_cents_override : null,
        })),
      };

      const url = isEdit
        ? `/api/admin/b2b-pallet-shipments/${shipmentId}`
        : "/api/admin/b2b-pallet-shipments";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Något gick fel");
      }

      toast.success(isEdit ? "Pallen uppdaterad" : "Pallen skapad");
      router.push(`/admin/pallets?tab=b2b&_=${Date.now()}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Något gick fel");
    } finally {
      setSaving(false);
    }
  };

  const availableWines = wines.filter(
    (w) => !items.some((i) => i.wine_id === w.id),
  );

  const producerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const w of availableWines) {
      const n = w.producers?.name?.trim();
      if (n) names.add(n);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "sv"));
  }, [availableWines]);

  const colorOptions = useMemo(() => {
    const colors = new Set<string>();
    for (const w of availableWines) {
      const c = w.color?.trim();
      if (c) colors.add(c);
    }
    return Array.from(colors).sort((a, b) => a.localeCompare(b, "sv"));
  }, [availableWines]);

  const filteredAvailableWines = useMemo(() => {
    let list = availableWines;
    if (wineProducerFilter) {
      list = list.filter((w) => w.producers?.name === wineProducerFilter);
    }
    if (wineColorFilter) {
      list = list.filter((w) => (w.color?.trim() || "") === wineColorFilter);
    }
    const q = wineSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((w) =>
        getWineSearchLabel(w).toLowerCase().includes(q),
      );
    }
    return list;
  }, [
    availableWines,
    wineSearchQuery,
    wineProducerFilter,
    wineColorFilter,
  ]);

  const hasWineFilters =
    wineSearchQuery.trim() !== "" ||
    wineProducerFilter !== "" ||
    wineColorFilter !== "";

  const palletCostCentsNum =
    palletCostCents === "" ? 0 : Number(palletCostCents) || 0;

  const costSummary = useMemo(
    () =>
      computePalletCostSummary(
        items.map((item) => {
          const wineForCost =
            wines.find((w) => w.id === item.wine_id) ?? item.wine;
          return {
            quantity: item.quantity,
            cost_cents_override: item.cost_cents_override,
            wine: wineForCost,
          };
        }),
        palletCostCentsNum,
        fxRates,
      ),
    [items, wines, palletCostCentsNum, fxRates],
  );

  const colorCounts = useMemo(
    () =>
      computePalletColorCounts(
        items.map((item) => ({
          quantity: item.quantity,
          wine: wines.find((w) => w.id === item.wine_id) ?? item.wine,
        })),
      ),
    [items, wines],
  );

  const producerSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        bottles: number;
        wines: Array<{
          wine_id: string;
          wine: Wine | undefined;
          quantity: number;
        }>;
      }
    >();
    for (const item of items) {
      const wineForCost =
        wines.find((w) => w.id === item.wine_id) ?? item.wine;
      const producer =
        wineForCost?.producers?.name?.trim() || "Okänd producent";
      const curr = map.get(producer) ?? { bottles: 0, wines: [] };
      curr.bottles += item.quantity;
      curr.wines.push({
        wine_id: item.wine_id,
        wine: wineForCost,
        quantity: item.quantity,
      });
      map.set(producer, curr);
    }
    return Array.from(map.entries())
      .map(([name, stats]) => ({
        name,
        bottles: stats.bottles,
        wineCount: stats.wines.length,
        wines: [...stats.wines].sort((a, b) => {
          const labelA = a.wine
            ? `${a.wine.wine_name} ${a.wine.vintage}`
            : a.wine_id;
          const labelB = b.wine
            ? `${b.wine.wine_name} ${b.wine.vintage}`
            : b.wine_id;
          return labelA.localeCompare(labelB, "sv");
        }),
      }))
      .sort(
        (a, b) =>
          b.bottles - a.bottles || a.name.localeCompare(b.name, "sv"),
      );
  }, [items, wines]);

  const toggleProducerExpanded = (producerName: string) => {
    setExpandedProducers((prev) => {
      const next = new Set(prev);
      if (next.has(producerName)) next.delete(producerName);
      else next.add(producerName);
      return next;
    });
  };

  if (loading && !isEdit) {
    return (
      <div className="max-w-6xl space-y-6">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-gray-200 dark:bg-zinc-800" />
        <div className="h-96 animate-pulse rounded-xl bg-gray-100 dark:bg-zinc-900/80" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <header className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          asChild
          className="text-gray-600 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <Link href="/admin/pallets?tab=b2b">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {isEdit ? "Redigera pall" : "Ny pall"}
          </h1>
          <p className="mt-0.5 text-sm text-gray-500 dark:text-zinc-400">
            Dirty Wine · Vinleverans
          </p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Pallinformation
            </h2>
            <p className={cn("mt-0.5", hintClass)}>
              Namn och datum för leveransen
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className={labelClass}>
                Namn
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="t.ex. Pallet 2024-01"
                className={inputClass}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="shipped_at" className={labelClass}>
                  Skickad
                </Label>
                <Input
                  id="shipped_at"
                  type="date"
                  value={shippedAt}
                  onChange={(e) => setShippedAt(e.target.value)}
                  className={cn(inputClass, "[color-scheme:light] dark:[color-scheme:dark]")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivered_at" className={labelClass}>
                  Ankommen
                </Label>
                <Input
                  id="delivered_at"
                  type="date"
                  value={deliveredAt}
                  onChange={(e) => setDeliveredAt(e.target.value)}
                  className={cn(inputClass, "[color-scheme:light] dark:[color-scheme:dark]")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pallet_cost" className={labelClass}>
                Palkostnad (ex moms)
              </Label>
              <Input
                id="pallet_cost"
                type="number"
                min={0}
                step={0.01}
                value={
                  palletCostCents === ""
                    ? ""
                    : (palletCostCents / 100).toFixed(2)
                }
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setPalletCostCents(
                    isNaN(val) || val < 0 ? "" : Math.round(val * 100),
                  );
                }}
                placeholder="t.ex. 5000 (SEK)"
                className={cn(inputClass, "max-w-[200px]")}
              />
              <p className={hintClass}>
                Transport, frakt och övriga kostnader för pallen i SEK
              </p>
            </div>
            <div className="flex items-start justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <div className="space-y-1">
                <Label htmlFor="is_active" className={labelClass}>
                  Aktiv i lager
                </Label>
                <p className={hintClass}>
                  När pallen är aktiv räknas vinet in i B2B-lager på dirtywine.se.
                  Nya pallar är inaktiva tills du aktiverar dem.
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={setIsActive}
                className={ADMIN_ACTIVE_SWITCH_CLASS}
              />
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-5">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">
              Viner på pallen
            </h2>
            <p className={cn("mt-0.5", hintClass)}>
              Sök och lägg till viner. Kostnad hämtas från databasen men kan
              ändras per rad.
            </p>
          </div>
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <Popover
                open={wineComboboxOpen}
                onOpenChange={(open) => {
                  setWineComboboxOpen(open);
                  if (!open) {
                    setWineSearchQuery("");
                    setWineProducerFilter("");
                    setWineColorFilter("");
                  }
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={wineComboboxOpen}
                    className="h-11 w-full justify-between border-gray-200 bg-white font-normal text-gray-900 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700/80 sm:flex-1"
                  >
                    <span className="truncate text-gray-500 dark:text-zinc-400">
                      Sök vin att lägga till...
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
              <PopoverContent
                className="w-[var(--radix-popover-trigger-width)] border-gray-200 bg-white p-0 dark:border-zinc-700 dark:bg-zinc-900"
                align="start"
                onWheelCapture={(e) => e.stopPropagation()}
              >
                <div className="space-y-2 border-b border-gray-200 p-2 dark:border-zinc-700">
                  <Input
                    placeholder="Sök namn, årgång eller producent..."
                    value={wineSearchQuery}
                    onChange={(e) => setWineSearchQuery(e.target.value)}
                    className={cn(inputClass, "h-10")}
                    autoFocus
                  />
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 dark:text-zinc-400">
                        Producent
                      </Label>
                      <Select
                        value={wineProducerFilter || "__all__"}
                        onValueChange={(v) =>
                          setWineProducerFilter(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Alla producenter" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                          <SelectItem value="__all__">Alla producenter</SelectItem>
                          {producerOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 dark:text-zinc-400">
                        Färg
                      </Label>
                      <Select
                        value={wineColorFilter || "__all__"}
                        onValueChange={(v) =>
                          setWineColorFilter(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Alla färger" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                          <SelectItem value="__all__">Alla färger</SelectItem>
                          {colorOptions.map((color) => (
                            <SelectItem key={color} value={color}>
                              <span className="inline-flex items-center gap-2">
                                <span
                                  className={cn(
                                    "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                                    wineColorDotClass(color),
                                  )}
                                  aria-hidden
                                />
                                {color}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {hasWineFilters && filteredAvailableWines.length > 0 && (
                    <p className={hintClass}>
                      {filteredAvailableWines.length} av {availableWines.length}{" "}
                      viner
                    </p>
                  )}
                </div>
                <div
                  className="max-h-[min(70vh,20rem)] overflow-y-auto overscroll-contain"
                  onWheel={(e) => e.stopPropagation()}
                >
                  {availableWines.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
                      Alla viner är tillagda
                    </p>
                  ) : filteredAvailableWines.length === 0 ? (
                    <p className="py-6 text-center text-sm text-gray-500 dark:text-zinc-400">
                      {hasWineFilters
                        ? "Inga viner matchar filtren."
                        : "Inga viner hittades."}
                    </p>
                  ) : (
                    filteredAvailableWines.map((w) => (
                      <button
                        key={w.id}
                        type="button"
                        onClick={() => {
                          addWine(w);
                          setWineSearchQuery("");
                        }}
                        className="flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                      >
                        <span
                          className={cn(
                            "mt-1.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                            wineColorDotClass(w.color),
                          )}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 truncate">
                          <span className="font-medium">
                            {w.wine_name} {w.vintage}
                          </span>
                          {w.producers?.name && (
                            <span className="text-gray-500 dark:text-zinc-400">
                              {" "}
                              · {w.producers.name}
                            </span>
                          )}
                          {w.color?.trim() && (
                            <span className="text-gray-400 dark:text-zinc-500">
                              {" "}
                              · {w.color}
                            </span>
                          )}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

              {items.length > 0 && (
                <Tabs
                  value={showProducerSummary ? "producers" : "wines"}
                  onValueChange={(v) =>
                    setShowProducerSummary(v === "producers")
                  }
                  className="shrink-0"
                >
                  <TabsList className="h-auto rounded-lg border border-zinc-800 bg-zinc-900/70 p-1">
                    <TabsTrigger
                      value="wines"
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 data-[state=active]:bg-[#0F0F12] data-[state=active]:text-zinc-100"
                    >
                      Viner
                    </TabsTrigger>
                    <TabsTrigger
                      value="producers"
                      className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 data-[state=active]:bg-[#0F0F12] data-[state=active]:text-zinc-100"
                    >
                      Producenter
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>

            {items.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
                  <ScrollArea className="h-[min(400px,50vh)]">
                    {showProducerSummary ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 hover:bg-transparent dark:border-zinc-800">
                            <TableHead className="w-10" />
                            <TableHead className="min-w-[200px] text-gray-600 dark:text-zinc-400">
                              Producent
                            </TableHead>
                            <TableHead className="w-28 text-right text-gray-600 dark:text-zinc-400">
                              Viner
                            </TableHead>
                            <TableHead className="w-32 text-right text-gray-600 dark:text-zinc-400">
                              Flaskor
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {producerSummary.map((row) => {
                            const expanded = expandedProducers.has(row.name);
                            return (
                              <Fragment key={row.name}>
                                <TableRow
                                  role="button"
                                  tabIndex={0}
                                  aria-expanded={expanded}
                                  onClick={() => toggleProducerExpanded(row.name)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter" || e.key === " ") {
                                      e.preventDefault();
                                      toggleProducerExpanded(row.name);
                                    }
                                  }}
                                  className="cursor-pointer border-gray-100 hover:bg-gray-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-900/50"
                                >
                                  <TableCell className="w-10 py-2">
                                    <ChevronRight
                                      className={cn(
                                        "h-4 w-4 text-gray-500 transition-transform dark:text-zinc-400",
                                        expanded && "rotate-90",
                                      )}
                                      aria-hidden
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium text-gray-900 dark:text-zinc-100">
                                    {row.name}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm text-gray-600 dark:text-zinc-400">
                                    {row.wineCount}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                    {row.bottles}
                                  </TableCell>
                                </TableRow>
                                {expanded &&
                                  row.wines.map((entry) => (
                                    <TableRow
                                      key={`${row.name}-${entry.wine_id}`}
                                      className="border-gray-100 bg-gray-50/60 hover:bg-gray-50 dark:border-zinc-800/80 dark:bg-zinc-900/40 dark:hover:bg-zinc-900/60"
                                    >
                                      <TableCell />
                                      <TableCell
                                        colSpan={2}
                                        className="py-2 pl-8"
                                      >
                                        <div className="flex min-w-0 items-center gap-2 text-sm">
                                          <span
                                            className={cn(
                                              "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                                              wineColorDotClass(entry.wine?.color),
                                            )}
                                            aria-hidden
                                          />
                                          <span className="truncate font-medium text-gray-800 dark:text-zinc-200">
                                            {entry.wine
                                              ? `${entry.wine.wine_name} ${entry.wine.vintage}`
                                              : entry.wine_id}
                                          </span>
                                          {entry.wine?.color?.trim() && (
                                            <span className="shrink-0 text-xs text-gray-500 dark:text-zinc-500">
                                              {entry.wine.color}
                                            </span>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-right tabular-nums text-sm text-gray-700 dark:text-zinc-300">
                                        {entry.quantity} st
                                      </TableCell>
                                    </TableRow>
                                  ))}
                              </Fragment>
                            );
                          })}
                        </TableBody>
                      </Table>
                    ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 hover:bg-transparent dark:border-zinc-800">
                          <TableHead className="min-w-[180px] text-gray-600 dark:text-zinc-400">
                            Vin
                          </TableHead>
                          <TableHead className="min-w-[120px] text-gray-600 dark:text-zinc-400">
                            Producent
                          </TableHead>
                          <TableHead className="w-16 text-right text-gray-600 dark:text-zinc-400">
                            Antal
                          </TableHead>
                          <TableHead className="w-24 text-right text-gray-600 dark:text-zinc-400">
                            Inköp/fl
                          </TableHead>
                          <TableHead className="w-24 text-right text-gray-600 dark:text-zinc-400">
                            Alk.skatt/fl
                          </TableHead>
                          <TableHead className="w-28 text-right text-gray-600 dark:text-zinc-400">
                            Totalt/fl
                          </TableHead>
                          <TableHead className="w-28 text-right text-gray-600 dark:text-zinc-400">
                            Rad totalt
                          </TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item) => {
                          const wineForCost =
                            wines.find((w) => w.id === item.wine_id) ??
                            item.wine;
                          const lineCost = getPalletLineCost(
                            item.quantity,
                            item.cost_cents_override,
                            wineForCost,
                            fxRates,
                          );
                          const defaultUnitTotal = wineForCost
                            ? (wineForCost.costCentsExVat ??
                              getWineCostCentsExVat(wineForCost, fxRates))
                            : 0;
                          return (
                            <TableRow
                              key={item.wine_id}
                              className="border-gray-100 hover:bg-gray-50/80 dark:border-zinc-800/80 dark:hover:bg-zinc-900/50"
                            >
                              <TableCell>
                                <div className="font-medium text-gray-900 dark:text-zinc-100">
                                  {wineForCost
                                    ? `${wineForCost.wine_name} ${wineForCost.vintage}`
                                    : item.wine_id}
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600 dark:text-zinc-400">
                                {wineForCost?.producers?.name?.trim() || "—"}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItem(item.wine_id, {
                                      quantity: Math.max(
                                        1,
                                        parseInt(e.target.value, 10) || 0,
                                      ),
                                    })
                                  }
                                  className={cn(
                                    inputSmClass,
                                    "ml-auto w-16 text-right",
                                  )}
                                />
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm text-gray-600 dark:text-zinc-400">
                                {formatSekFromCents(
                                  lineCost.purchaseCentsPerBottle,
                                )}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm text-gray-600 dark:text-zinc-400">
                                {formatSekFromCents(
                                  lineCost.alcoholTaxCentsPerBottle,
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={
                                    item.cost_cents_override != null
                                      ? (
                                          item.cost_cents_override / 100
                                        ).toFixed(2)
                                      : (defaultUnitTotal / 100).toFixed(2)
                                  }
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value);
                                    const cents =
                                      isNaN(val) || val < 0
                                        ? null
                                        : Math.round(val * 100);
                                    updateItem(item.wine_id, {
                                      cost_cents_override: cents,
                                    });
                                  }}
                                  className={cn(
                                    inputSmClass,
                                    "ml-auto w-24 text-right",
                                  )}
                                  title="Totalt per flaska inkl. alkoholskatt (ex moms)"
                                />
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm font-medium text-gray-900 dark:text-zinc-100">
                                {formatSekFromCents(lineCost.lineTotalCents)}
                              </TableCell>
                              <TableCell className="p-2">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                                  onClick={() => removeItem(item.wine_id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    )}
                  </ScrollArea>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-3">
                    Sammanfattning
                  </h3>
                  <dl className="grid gap-2 text-sm sm:grid-cols-2">
                    <div className="flex justify-between gap-4 sm:col-span-2">
                      <dt className="text-gray-600 dark:text-zinc-400">
                        Totalt antal flaskor
                      </dt>
                      <dd className="font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                        {costSummary.totalBottles}
                      </dd>
                    </div>
                    {colorCounts.length > 0 && (
                      <div className="sm:col-span-2">
                        <dt className="text-gray-600 dark:text-zinc-400 mb-2">
                          Fördelning per färg
                        </dt>
                        <dd>
                          <ul className="flex flex-wrap gap-2">
                            {colorCounts.map(({ color, bottles }) => (
                              <li
                                key={color}
                                className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs dark:border-zinc-700 dark:bg-zinc-800"
                              >
                                <span
                                  className={cn(
                                    "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                                    wineColorDotClass(color),
                                  )}
                                  aria-hidden
                                />
                                <span className="text-gray-700 dark:text-zinc-300">
                                  {color}
                                </span>
                                <span className="font-semibold tabular-nums text-gray-900 dark:text-zinc-100">
                                  {bottles}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-600 dark:text-zinc-400">
                        Inköp (exkl. alkoholskatt)
                      </dt>
                      <dd className="tabular-nums text-gray-900 dark:text-zinc-100">
                        {formatSekFromCents(costSummary.winePurchaseCents)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-gray-600 dark:text-zinc-400">
                        Alkoholskatt
                      </dt>
                      <dd className="tabular-nums text-gray-900 dark:text-zinc-100">
                        {formatSekFromCents(costSummary.wineAlcoholTaxCents)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 sm:col-span-2 border-t border-gray-200 pt-2 dark:border-zinc-700">
                      <dt className="font-medium text-gray-700 dark:text-zinc-300">
                        Vin totalt inkl. alkoholskatt
                      </dt>
                      <dd className="font-semibold tabular-nums text-gray-900 dark:text-zinc-100">
                        {formatSekFromCents(costSummary.wineTotalCents)}
                      </dd>
                    </div>
                    {palletCostCentsNum > 0 && (
                      <div className="flex justify-between gap-4 sm:col-span-2">
                        <dt className="text-gray-600 dark:text-zinc-400">
                          Palkostnad (ex moms)
                        </dt>
                        <dd className="tabular-nums text-gray-900 dark:text-zinc-100">
                          {formatSekFromCents(costSummary.palletCostCents)}
                        </dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 sm:col-span-2 border-t border-gray-200 pt-2 dark:border-zinc-700">
                      <dt className="font-semibold text-gray-900 dark:text-zinc-100">
                        Totalt
                      </dt>
                      <dd className="text-base font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                        {formatSekFromCents(costSummary.grandTotalCents)}
                      </dd>
                    </div>
                  </dl>
                </div>
              </>
            )}

            {items.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center text-sm text-gray-500 dark:border-zinc-700 dark:text-zinc-400">
                Inga viner tillagda. Sök och lägg till viner ovan.
              </div>
            )}
          </div>
        </section>

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            disabled={saving}
            className="rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {saving ? "Sparar..." : isEdit ? "Spara ändringar" : "Skapa pall"}
          </Button>
          <Button
            type="button"
            variant="outline"
            asChild
            className="rounded-lg border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800/80"
          >
            <Link href="/admin/pallets?tab=b2b">Avbryt</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
