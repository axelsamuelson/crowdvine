"use client";

import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import Image from "next/image";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ArrowLeft, Trash2, ChevronsUpDown, ChevronRight, Plus, ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import {
  distanceKm,
  estimateDrivingMinutes,
  formatDistanceKm,
  formatDistanceMeters,
  formatDrivingTime,
  formatDrivingTimeFromSeconds,
  hasValidGeoCoords,
} from "@/lib/geo-distance";
import type {
  DrivingRoutesResponse,
  OptimalPickupResult,
} from "@/lib/driving-routes";
import { ADMIN_ACTIVE_SWITCH_CLASS } from "@/lib/admin-form-styles";
import { B2bPalletProducersMap,
  type B2bPalletMapProducerInput,
} from "@/components/admin/b2b-pallet-producers-map";
import { MapboxPreloader } from "@/components/map/mapbox-preloader";
import {
  collectProducersOnPallet,
  formatProducerAddress,
  resolveB2bPickupProducer,
  resolveEffectiveB2bPickupProducer,
  type B2bPickupProducerInfo,
} from "@/lib/b2b-pallet-pickup";
import { DEFAULT_WINE_IMAGE_PATH } from "@/lib/constants";
import { isWineAvailableForSale } from "@/lib/wine-availability";
import {
  sortPalletItems,
  sortProducerSummaryRows,
  toggleSortDirection,
  type PalletProducerSortKey,
  type PalletWineSortKey,
  type SortDirection,
} from "@/lib/b2b-pallet-item-sort";
import {
  commercialLineColumnLabel,
  commercialPriceColumnLabel,
  computePalletCommercialSummary,
  DEFAULT_B2B_MARGIN_PERCENT,
} from "@/lib/b2b-pallet-commercial";

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
  label_image_path?: string | null;
  cost_amount?: number;
  cost_currency?: string;
  exchange_rate?: number;
  alcohol_tax_cents?: number;
  b2b_margin_percentage?: number | null;
  available_for_sale?: boolean | null;
  producers?: B2bPickupProducerInfo | null;
  costCentsExVat?: number;
}

function getWineImageSrc(path: string | null | undefined): string {
  if (!path) return DEFAULT_WINE_IMAGE_PATH;
  const clean = path.trim().replace(/\n/g, "");
  if (clean.startsWith("http")) return clean;
  if (clean.startsWith("/uploads/")) {
    return `/api/images/${clean.replace("/uploads/", "")}`;
  }
  if (clean.startsWith("/")) return clean;
  return `/api/images/${clean}`;
}

function WineThumb({
  wine,
  size = 40,
  className,
}: {
  wine?: Pick<Wine, "wine_name" | "vintage" | "label_image_path"> | null;
  size?: number;
  className?: string;
}) {
  const alt = wine
    ? `${wine.wine_name} ${wine.vintage}`.trim()
    : "Vin";

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-zinc-800",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={getWineImageSrc(wine?.label_image_path)}
        alt={alt}
        fill
        className="object-cover"
        sizes={`${size}px`}
      />
    </div>
  );
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

function WineOosBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 border-red-300 bg-red-50 px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wide text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400",
        className,
      )}
    >
      OOS
    </Badge>
  );
}

function canAddWineToPallet(wine: Pick<Wine, "available_for_sale">): boolean {
  return isWineAvailableForSale(wine.available_for_sale);
}

function SortableTableHead({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
  align = "left",
  className,
}: {
  label: string;
  sortKey: string;
  activeKey: string;
  direction: SortDirection;
  onSort: (key: string) => void;
  align?: "left" | "right";
  className?: string;
}) {
  const active = activeKey === sortKey;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex w-full items-center gap-1 text-xs font-medium transition-colors hover:text-gray-900 dark:hover:text-zinc-100",
          align === "right" ? "justify-end" : "justify-start",
          active
            ? "text-gray-900 dark:text-zinc-100"
            : "text-gray-600 dark:text-zinc-400",
        )}
      >
        <span>{label}</span>
        {active ? (
          direction === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
        )}
      </button>
    </TableHead>
  );
}

export default function B2BPalletForm({ shipmentId }: { shipmentId?: string }) {
  const router = useRouter();
  const isEdit = !!shipmentId;

  const [name, setName] = useState("");
  const [shippedAt, setShippedAt] = useState("");
  const [deliveredAt, setDeliveredAt] = useState("");
  const [palletCostCents, setPalletCostCents] = useState<number | "">("");
  const [isActive, setIsActive] = useState(false);
  /** null = automatic (20% pallet-zone rule) */
  const [pickupProducerId, setPickupProducerId] = useState<string | null>(null);
  const [items, setItems] = useState<PalletItem[]>([]);
  const [wines, setWines] = useState<Wine[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wineComboboxOpen, setWineComboboxOpen] = useState(false);
  const [wineSearchQuery, setWineSearchQuery] = useState("");
  const [wineProducerFilter, setWineProducerFilter] = useState("");
  const [wineColorFilter, setWineColorFilter] = useState("");
  const [palletColorFilter, setPalletColorFilter] = useState("");
  const [palletProducerFilter, setPalletProducerFilter] = useState("");
  const [showProducerSummary, setShowProducerSummary] = useState(false);
  const [expandedProducers, setExpandedProducers] = useState<Set<string>>(
    new Set(),
  );
  const [fxRates, setFxRates] = useState<Record<string, number>>({ SEK: 1 });
  const [drivingRoutes, setDrivingRoutes] = useState<DrivingRoutesResponse>({});
  const [drivingRoutesLoading, setDrivingRoutesLoading] = useState(false);
  const [drivingRoutesSource, setDrivingRoutesSource] = useState<
    "mapbox" | "osrm" | "estimate" | null
  >(null);
  const [optimalPickup, setOptimalPickup] = useState<OptimalPickupResult | null>(
    null,
  );
  const [optimalPickupLoading, setOptimalPickupLoading] = useState(false);
  const [wineSortKey, setWineSortKey] = useState<PalletWineSortKey>("wine");
  const [wineSortDir, setWineSortDir] = useState<SortDirection>("asc");
  const [producerSortKey, setProducerSortKey] =
    useState<PalletProducerSortKey>("bottles");
  const [producerSortDir, setProducerSortDir] = useState<SortDirection>("desc");
  const [commercialMarginPercent, setCommercialMarginPercent] = useState("");
  const [showInclVat, setShowInclVat] = useState(false);

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
            setPickupProducerId(
              (data.pickup_producer_id as string | null | undefined) ?? null,
            );
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

  const addWine = (wine: Wine, options?: { keepComboboxOpen?: boolean }) => {
    if (!canAddWineToPallet(wine)) {
      toast.error("Vinet är otillgängligt (OOS) och kan inte läggas till på pallen");
      return;
    }
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
    if (!options?.keepComboboxOpen) {
      setWineComboboxOpen(false);
    }
  };

  const removeItem = (wineId: string) => {
    const nextItems = items.filter((i) => i.wine_id !== wineId);
    setItems(nextItems);
    if (pickupProducerId) {
      const stillOnPallet = nextItems.some((item) => {
        const wineForCost =
          wines.find((w) => w.id === item.wine_id) ?? item.wine;
        return wineForCost?.producers?.id === pickupProducerId;
      });
      if (!stillOnPallet) setPickupProducerId(null);
    }
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
        pickup_producer_id: pickupProducerId,
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

      const data = await res.json().catch(() => null);
      toast.success(isEdit ? "Pallen uppdaterad" : "Pallen skapad");

      if (isEdit) {
        router.refresh();
      } else if (data?.id) {
        router.push(`/admin/pallets/b2b/${data.id}/edit`);
        router.refresh();
      } else {
        router.push(`/admin/pallets?tab=b2b&_=${Date.now()}`);
        router.refresh();
      }
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

  const marginOverrideNum = useMemo(() => {
    const raw = commercialMarginPercent.trim();
    if (!raw) return null;
    const n = parseFloat(raw);
    if (Number.isNaN(n) || n < 0 || n >= 100) return null;
    return n;
  }, [commercialMarginPercent]);

  const commercialSummary = useMemo(
    () =>
      computePalletCommercialSummary(
        items.map((item) => ({
          wine_id: item.wine_id,
          quantity: item.quantity,
          cost_cents_override: item.cost_cents_override,
          wine: wines.find((w) => w.id === item.wine_id) ?? item.wine,
        })),
        palletCostCentsNum,
        marginOverrideNum,
        showInclVat,
        fxRates,
      ),
    [items, wines, palletCostCentsNum, marginOverrideNum, showInclVat, fxRates],
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
        producerId: string | null;
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
      const curr = map.get(producer) ?? {
        producerId: wineForCost?.producers?.id ?? null,
        bottles: 0,
        wines: [],
      };
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
        producerId: stats.producerId,
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
      }));
  }, [items, wines]);

  const sortedItems = useMemo(() => {
    const withWine = items.map((item) => ({
      ...item,
      wine: wines.find((w) => w.id === item.wine_id) ?? item.wine,
    }));
    return sortPalletItems(
      withWine,
      wineSortKey,
      wineSortDir,
      fxRates,
      commercialSummary.lineByWineId,
    );
  }, [
    items,
    wines,
    wineSortKey,
    wineSortDir,
    fxRates,
    commercialSummary.lineByWineId,
  ]);

  const palletColorOptions = useMemo(() => {
    const colors = new Set<string>();
    for (const item of sortedItems) {
      const c = item.wine?.color?.trim();
      if (c) colors.add(c);
    }
    return Array.from(colors).sort((a, b) => a.localeCompare(b, "sv"));
  }, [sortedItems]);

  const palletProducerOptions = useMemo(() => {
    const names = new Set<string>();
    for (const item of sortedItems) {
      const n = item.wine?.producers?.name?.trim();
      if (n) names.add(n);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b, "sv"));
  }, [sortedItems]);

  const itemMatchesPalletFilter = useCallback(
    (wine: Wine | undefined) => {
      if (
        palletProducerFilter &&
        wine?.producers?.name !== palletProducerFilter
      ) {
        return false;
      }
      if (
        palletColorFilter &&
        (wine?.color?.trim() || "") !== palletColorFilter
      ) {
        return false;
      }
      return true;
    },
    [palletProducerFilter, palletColorFilter],
  );

  const filteredSortedItems = useMemo(
    () => sortedItems.filter((item) => itemMatchesPalletFilter(item.wine)),
    [sortedItems, itemMatchesPalletFilter],
  );

  const handleWineSort = (key: string) => {
    const nextKey = key as PalletWineSortKey;
    setWineSortDir((dir) => toggleSortDirection(wineSortKey, nextKey, dir));
    setWineSortKey(nextKey);
  };

  const pickupResolution = useMemo(() => {
    return resolveB2bPickupProducer(
      items.map((item) => {
        const wineForCost =
          wines.find((w) => w.id === item.wine_id) ?? item.wine;
        return {
          quantity: item.quantity,
          producer: wineForCost?.producers ?? null,
        };
      }),
    );
  }, [items, wines]);

  const producersOnPallet = useMemo(() => {
    return collectProducersOnPallet(
      items.map((item) => {
        const wineForCost =
          wines.find((w) => w.id === item.wine_id) ?? item.wine;
        return {
          quantity: item.quantity,
          producer: wineForCost?.producers ?? null,
        };
      }),
    );
  }, [items, wines]);

  const effectivePickup = useMemo(() => {
    return resolveEffectiveB2bPickupProducer({
      pickupProducerId,
      producersOnPallet,
      autoResolution: pickupResolution,
    });
  }, [pickupProducerId, producersOnPallet, pickupResolution]);

  const sortedProducerSummary = useMemo(() => {
    return sortProducerSummaryRows(
      producerSummary,
      producerSortKey,
      producerSortDir,
      {
        drivingRoutes,
        pickupProducerId: effectivePickup.producer?.id ?? null,
      },
    );
  }, [
    producerSummary,
    producerSortKey,
    producerSortDir,
    drivingRoutes,
    effectivePickup.producer?.id,
  ]);

  const filteredProducerSummary = useMemo(() => {
    if (!palletProducerFilter && !palletColorFilter) {
      return sortedProducerSummary;
    }
    return sortedProducerSummary
      .map((row) => {
        const matchingWines = row.wines.filter((w) =>
          itemMatchesPalletFilter(w.wine),
        );
        return {
          ...row,
          wines: matchingWines,
          wineCount: matchingWines.length,
          bottles: matchingWines.reduce((s, w) => s + w.quantity, 0),
        };
      })
      .filter((row) => row.wines.length > 0);
  }, [
    sortedProducerSummary,
    palletProducerFilter,
    palletColorFilter,
    itemMatchesPalletFilter,
  ]);

  const hasPalletFilters =
    palletProducerFilter !== "" || palletColorFilter !== "";

  const filteredPalletWineCount = useMemo(
    () =>
      filteredProducerSummary.reduce((sum, row) => sum + row.wineCount, 0),
    [filteredProducerSummary],
  );

  const handleProducerSort = (key: string) => {
    const nextKey = key as PalletProducerSortKey;
    setProducerSortDir((dir) =>
      toggleSortDirection(producerSortKey, nextKey, dir),
    );
    setProducerSortKey(nextKey);
  };

  useEffect(() => {
    if (
      pickupProducerId &&
      !producersOnPallet.some((p) => p.id === pickupProducerId)
    ) {
      setPickupProducerId(null);
    }
  }, [pickupProducerId, producersOnPallet]);

  const palletMapData = useMemo(() => {
    const pickupId = effectivePickup.producer?.id ?? null;

    return producerSummary.map((row) => {
      const producer =
        row.wines[0]?.wine?.producers ??
        producersOnPallet.find((p) => p.id === row.producerId);

      return {
        id: row.producerId ?? row.name,
        name: row.name,
        lat: producer?.lat ?? null,
        lon: producer?.lon ?? null,
        subregion: producer?.subregion ?? null,
        region: producer?.region ?? null,
        bottles: row.bottles,
        isPickup: Boolean(pickupId && row.producerId === pickupId),
      } satisfies B2bPalletMapProducerInput;
    });
  }, [producerSummary, producersOnPallet, effectivePickup.producer?.id]);

  const producerDistanceByKey = useMemo(() => {
    const pickup = effectivePickup.producer;
    const map = new Map<string, number | null>();

    if (!pickup || !hasValidGeoCoords(pickup.lat, pickup.lon)) {
      return map;
    }

    for (const row of palletMapData) {
      const key = row.id;
      if (row.isPickup) {
        map.set(key, 0);
        continue;
      }
      if (!hasValidGeoCoords(row.lat, row.lon)) {
        map.set(key, null);
        continue;
      }
      map.set(
        key,
        distanceKm(pickup.lat!, pickup.lon!, row.lat!, row.lon!),
      );
    }

    return map;
  }, [palletMapData, effectivePickup.producer]);

  const routingRequestKey = useMemo(() => {
    const pickup = effectivePickup.producer;
    if (!pickup?.id || !hasValidGeoCoords(pickup.lat, pickup.lon)) return null;

    const destinations = palletMapData
      .filter((row) => !row.isPickup && hasValidGeoCoords(row.lat, row.lon))
      .map((row) => `${row.id}:${row.lat},${row.lon}`)
      .sort()
      .join("|");

    return `${pickup.id}:${pickup.lat},${pickup.lon}|${destinations}`;
  }, [effectivePickup.producer, palletMapData]);

  const optimalPickupRequestKey = useMemo(() => {
    return palletMapData
      .filter((row) => hasValidGeoCoords(row.lat, row.lon))
      .map((row) => `${row.id}:${row.lat},${row.lon}`)
      .sort()
      .join("|");
  }, [palletMapData]);

  useEffect(() => {
    if (!showProducerSummary || !routingRequestKey) {
      setDrivingRoutes({});
      setDrivingRoutesSource(null);
      return;
    }

    const pickup = effectivePickup.producer;
    if (!pickup || !hasValidGeoCoords(pickup.lat, pickup.lon)) return;

    const destinations = palletMapData
      .filter((row) => !row.isPickup && hasValidGeoCoords(row.lat, row.lon))
      .map((row) => ({
        id: row.id,
        lat: row.lat!,
        lon: row.lon!,
      }));

    if (destinations.length === 0) {
      setDrivingRoutes({});
      setDrivingRoutesSource(null);
      return;
    }

    const controller = new AbortController();
    setDrivingRoutesLoading(true);

    fetch("/api/admin/b2b-pallet-routing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup: { lat: pickup.lat, lon: pickup.lon },
        destinations,
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Routing request failed");
        return res.json() as Promise<{
          routes?: DrivingRoutesResponse;
          source?: "mapbox" | "osrm";
        }>;
      })
      .then((data) => {
        setDrivingRoutes(data.routes ?? {});
        setDrivingRoutesSource(
          data.routes && Object.keys(data.routes).length > 0
            ? (data.source ?? "osrm")
            : "estimate",
        );
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setDrivingRoutes({});
        setDrivingRoutesSource("estimate");
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setDrivingRoutesLoading(false);
        }
      });

    return () => controller.abort();
  }, [
    showProducerSummary,
    routingRequestKey,
    effectivePickup.producer,
    palletMapData,
  ]);

  useEffect(() => {
    if (!showProducerSummary || !optimalPickupRequestKey) {
      setOptimalPickup(null);
      return;
    }

    const producers = palletMapData
      .filter((row) => hasValidGeoCoords(row.lat, row.lon))
      .map((row) => ({
        id: row.id,
        lat: row.lat!,
        lon: row.lon!,
      }));

    if (producers.length < 2) {
      setOptimalPickup(null);
      return;
    }

    const controller = new AbortController();
    setOptimalPickupLoading(true);

    fetch("/api/admin/b2b-pallet-routing/optimal-pickup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ producers }),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Optimal pickup request failed");
        return res.json() as Promise<OptimalPickupResult>;
      })
      .then((data) => {
        setOptimalPickup(data);
      })
      .catch((err) => {
        if (err instanceof Error && err.name === "AbortError") return;
        setOptimalPickup(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setOptimalPickupLoading(false);
        }
      });

    return () => controller.abort();
  }, [showProducerSummary, optimalPickupRequestKey, palletMapData]);

  const availableWinesByProducerKey = useMemo(() => {
    const onPalletIds = new Set(items.map((item) => item.wine_id));
    const map = new Map<string, Wine[]>();

    for (const wine of wines) {
      if (onPalletIds.has(wine.id)) continue;
      const producerId = wine.producers?.id;
      const key =
        producerId ?? `name:${wine.producers?.name?.trim() || "Okänd producent"}`;
      const list = map.get(key) ?? [];
      list.push(wine);
      map.set(key, list);
    }

    for (const list of map.values()) {
      list.sort((a, b) =>
        `${a.wine_name} ${a.vintage}`.localeCompare(
          `${b.wine_name} ${b.vintage}`,
          "sv",
        ),
      );
    }

    return map;
  }, [wines, items]);

  const getAvailableWinesForProducer = (
    producerId: string | null,
    producerName: string,
  ) =>
    availableWinesByProducerKey.get(
      producerId ?? `name:${producerName}`,
    ) ?? [];

  const stopRowToggle = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.stopPropagation();
  };

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
      <MapboxPreloader />
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
          {items.length > 0 ? (
            <div className="mb-5 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
              <div className="space-y-2">
                <Label htmlFor="pickup_producer" className={labelClass}>
                  Upphämtningsplats
                </Label>
                <Select
                  value={pickupProducerId ?? "__auto__"}
                  onValueChange={(v) =>
                    setPickupProducerId(v === "__auto__" ? null : v)
                  }
                >
                  <SelectTrigger id="pickup_producer" className={selectTriggerClass}>
                    <SelectValue placeholder="Välj upphämtningsplats" />
                  </SelectTrigger>
                  <SelectContent className="border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                    <SelectItem value="__auto__">
                      Automatiskt (20%-regeln)
                    </SelectItem>
                    {producersOnPallet.map((producer) => (
                      <SelectItem key={producer.id} value={producer.id}>
                        {producer.name}
                        {producer.is_pallet_zone ? " · Pallzon" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className={hintClass}>
                  Välj producent manuellt eller låt systemet välja enligt
                  pallzonsregeln (≥20% av flaskorna).
                </p>
              </div>
              {effectivePickup.producer ? (
                <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 dark:border-zinc-700">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {effectivePickup.producer.name}
                  </p>
                  {formatProducerAddress(effectivePickup.producer) ? (
                    <p className={hintClass}>
                      {formatProducerAddress(effectivePickup.producer)}
                    </p>
                  ) : null}
                  <p className={hintClass}>
                    {effectivePickup.mode === "manual"
                      ? "Manuellt vald upphämtningsplats"
                      : effectivePickup.producer.is_pallet_zone
                        ? `Pallzonsproducent · ${pickupResolution.leadingPalletZoneBottles} av ${pickupResolution.totalBottles} flaskor (${Math.round((pickupResolution.leadingPalletZoneBottles / pickupResolution.totalBottles) * 100)}%)`
                        : "Automatiskt vald"}
                  </p>
                </div>
              ) : pickupResolution.noPalletZoneOnPallet ? (
                <p className={cn("mt-3 border-t border-gray-200 pt-3 dark:border-zinc-700", hintClass)}>
                  {pickupProducerId
                    ? "Den valda producenten finns inte längre på pallen."
                    : "Ingen pallzonsproducent finns bland vinerna. Välj en producent manuellt eller markera producenten som pallzon i admin."}
                </p>
              ) : pickupResolution.belowThreshold &&
                pickupResolution.leadingPalletZoneProducer ? (
                <div className="mt-3 space-y-1 border-t border-gray-200 pt-3 dark:border-zinc-700">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    Ingen producent uppfyller 20%-kravet automatiskt.
                  </p>
                  <p className={hintClass}>
                    Närmast:{" "}
                    <span className="font-medium text-gray-800 dark:text-zinc-200">
                      {pickupResolution.leadingPalletZoneProducer.name}
                    </span>{" "}
                    ({pickupResolution.leadingPalletZoneBottles} av{" "}
                    {pickupResolution.totalBottles} flaskor)
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
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
                    filteredAvailableWines.map((w) => {
                      const addable = canAddWineToPallet(w);
                      const rowClass = cn(
                        "flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm",
                        addable
                          ? "text-gray-900 hover:bg-gray-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
                          : "cursor-not-allowed bg-gray-50/80 text-gray-500 dark:bg-zinc-900/40 dark:text-zinc-500",
                      );
                      const content = (
                        <>
                          <WineThumb wine={w} size={36} className="mt-0.5" />
                          <span
                            className={cn(
                              "mt-2.5 inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                              wineColorDotClass(w.color),
                            )}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate">
                            <span className={cn("font-medium", !addable && "opacity-80")}>
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
                          {!addable ? <WineOosBadge className="mt-1.5" /> : null}
                        </>
                      );
                      return addable ? (
                        <button
                          key={w.id}
                          type="button"
                          onClick={() => {
                            addWine(w);
                            setWineSearchQuery("");
                          }}
                          className={rowClass}
                        >
                          {content}
                        </button>
                      ) : (
                        <div
                          key={w.id}
                          className={rowClass}
                          aria-disabled
                          title="Otillgängligt – kan inte läggas till på pallen"
                        >
                          {content}
                        </div>
                      );
                    })
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
              {items.length > 0 && (
                <p className={cn("shrink-0", hintClass)}>
                  Klicka på kolumnrubriker för att sortera.
                </p>
              )}
            </div>

            {items.length > 0 &&
            (palletColorOptions.length > 0 ||
              palletProducerOptions.length > 0) ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="grid w-full grid-cols-1 gap-2 sm:max-w-md sm:grid-cols-2">
                  {palletProducerOptions.length > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 dark:text-zinc-400">
                        Filtrera producent
                      </Label>
                      <Select
                        value={palletProducerFilter || "__all__"}
                        onValueChange={(v) =>
                          setPalletProducerFilter(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Alla producenter" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                          <SelectItem value="__all__">
                            Alla producenter
                          </SelectItem>
                          {palletProducerOptions.map((name) => (
                            <SelectItem key={name} value={name}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : null}
                  {palletColorOptions.length > 0 ? (
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500 dark:text-zinc-400">
                        Filtrera färg
                      </Label>
                      <Select
                        value={palletColorFilter || "__all__"}
                        onValueChange={(v) =>
                          setPalletColorFilter(v === "__all__" ? "" : v)
                        }
                      >
                        <SelectTrigger className={selectTriggerClass}>
                          <SelectValue placeholder="Alla färger" />
                        </SelectTrigger>
                        <SelectContent className="border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                          <SelectItem value="__all__">Alla färger</SelectItem>
                          {palletColorOptions.map((color) => (
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
                  ) : null}
                </div>
                {hasPalletFilters ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 text-xs"
                    onClick={() => {
                      setPalletColorFilter("");
                      setPalletProducerFilter("");
                    }}
                  >
                    Rensa filter
                  </Button>
                ) : null}
                {hasPalletFilters ? (
                  <p className={cn("sm:ml-auto", hintClass)}>
                    Visar {filteredPalletWineCount} av {sortedItems.length}{" "}
                    viner
                  </p>
                ) : null}
              </div>
            ) : null}

            {items.length > 0 && !showProducerSummary && (
              <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-gray-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40 sm:flex-row sm:flex-wrap sm:items-end">
                <div className="space-y-2 sm:w-40">
                  <Label htmlFor="commercial_margin" className={labelClass}>
                    B2B-marginal (%)
                  </Label>
                  <Input
                    id="commercial_margin"
                    type="number"
                    min={0}
                    max={99.9}
                    step={0.5}
                    placeholder={`${DEFAULT_B2B_MARGIN_PERCENT} (standard)`}
                    value={commercialMarginPercent}
                    onChange={(e) => setCommercialMarginPercent(e.target.value)}
                    className={inputSmClass}
                  />
                  <p className={hintClass}>
                    Tomt = varje vins B2B-marginal (annars {DEFAULT_B2B_MARGIN_PERCENT}{" "}
                    %).
                  </p>
                </div>
                <div className="flex items-center gap-3 pb-1">
                  <span
                    className={cn(
                      "text-xs font-medium",
                      !showInclVat
                        ? "text-gray-900 dark:text-zinc-100"
                        : "text-gray-500 dark:text-zinc-500",
                    )}
                  >
                    Ex moms
                  </span>
                  <Switch
                    checked={showInclVat}
                    onCheckedChange={setShowInclVat}
                    className={ADMIN_ACTIVE_SWITCH_CLASS}
                    aria-label="Visa priser inklusive moms"
                  />
                  <span
                    className={cn(
                      "text-xs font-medium",
                      showInclVat
                        ? "text-gray-900 dark:text-zinc-100"
                        : "text-gray-500 dark:text-zinc-500",
                    )}
                  >
                    Inkl. moms
                  </span>
                </div>
                <div className="sm:ml-auto sm:text-right">
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    Frakt per flaska i pris
                  </p>
                  <p className="text-sm font-semibold tabular-nums text-gray-900 dark:text-zinc-100">
                    {formatSekFromCents(
                      Math.round(commercialSummary.shippingPerBottleSek * 100),
                    )}
                  </p>
                </div>
              </div>
            )}

            {items.length > 0 && (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-zinc-800">
                  <ScrollArea className="h-[min(400px,50vh)]">
                    {showProducerSummary ? (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-gray-200 hover:bg-transparent dark:border-zinc-800">
                            <TableHead className="w-10" />
                            <SortableTableHead
                              label="Producent"
                              sortKey="producer"
                              activeKey={producerSortKey}
                              direction={producerSortDir}
                              onSort={handleProducerSort}
                              className="min-w-[200px]"
                            />
                            <SortableTableHead
                              label="Viner"
                              sortKey="wine_count"
                              activeKey={producerSortKey}
                              direction={producerSortDir}
                              onSort={handleProducerSort}
                              align="right"
                              className="w-28"
                            />
                            <SortableTableHead
                              label="Flaskor"
                              sortKey="bottles"
                              activeKey={producerSortKey}
                              direction={producerSortDir}
                              onSort={handleProducerSort}
                              align="right"
                              className="w-32"
                            />
                            <SortableTableHead
                              label="Distans"
                              sortKey="distance"
                              activeKey={producerSortKey}
                              direction={producerSortDir}
                              onSort={handleProducerSort}
                              align="right"
                              className="w-28"
                            />
                            <SortableTableHead
                              label="Bil"
                              sortKey="drive_time"
                              activeKey={producerSortKey}
                              direction={producerSortDir}
                              onSort={handleProducerSort}
                              align="right"
                              className="w-28"
                            />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredProducerSummary.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="py-8 text-center text-sm text-gray-500 dark:text-zinc-400"
                              >
                                Inga viner matchar filtren på pallen.
                              </TableCell>
                            </TableRow>
                          ) : (
                          filteredProducerSummary.map((row) => {
                            const expanded = expandedProducers.has(row.name);
                            const isPickupProducer =
                              Boolean(effectivePickup.producer?.id) &&
                              row.producerId === effectivePickup.producer?.id;
                            const rowKey = row.producerId ?? row.name;
                            const distance =
                              producerDistanceByKey.get(rowKey) ?? null;
                            const drivingRoute = drivingRoutes[rowKey];
                            const isOptimalPickupProducer =
                              Boolean(optimalPickup?.optimalProducerId) &&
                              rowKey === optimalPickup?.optimalProducerId;
                            const averageDriveSeconds =
                              optimalPickup?.averageSecondsByProducer[rowKey];
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
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span>{row.name}</span>
                                      {isPickupProducer ? (
                                        <Badge
                                          variant="outline"
                                          className="normal-case border-green-300 bg-green-50 font-medium text-green-700 dark:border-green-700 dark:bg-green-950/50 dark:text-green-400"
                                        >
                                          Upphämtningsplats
                                        </Badge>
                                      ) : null}
                                      {isOptimalPickupProducer ? (
                                        <Badge
                                          variant="outline"
                                          className="normal-case border-sky-300 bg-sky-50 font-medium text-sky-700 dark:border-sky-700 dark:bg-sky-950/50 dark:text-sky-400"
                                          title={
                                            averageDriveSeconds != null
                                              ? `Lägst snittid till övriga producenter: ${formatDrivingTimeFromSeconds(averageDriveSeconds)}`
                                              : undefined
                                          }
                                        >
                                          Bästa plats
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm text-gray-600 dark:text-zinc-400">
                                    {row.wineCount}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm font-semibold text-gray-900 dark:text-zinc-100">
                                    {row.bottles}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm text-gray-600 dark:text-zinc-400">
                                    {isPickupProducer ? (
                                      <span className="text-green-700 dark:text-green-400">
                                        —
                                      </span>
                                    ) : drivingRoute ? (
                                      formatDistanceMeters(
                                        drivingRoute.distanceMeters,
                                      )
                                    ) : drivingRoutesLoading ? (
                                      <span className="text-gray-400 dark:text-zinc-500">
                                        …
                                      </span>
                                    ) : distance != null ? (
                                      formatDistanceKm(distance)
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right tabular-nums text-sm text-gray-600 dark:text-zinc-400">
                                    {isPickupProducer ? (
                                      <span className="text-green-700 dark:text-green-400">
                                        —
                                      </span>
                                    ) : drivingRoute ? (
                                      formatDrivingTimeFromSeconds(
                                        drivingRoute.durationSeconds,
                                      )
                                    ) : drivingRoutesLoading ? (
                                      <span className="text-gray-400 dark:text-zinc-500">
                                        …
                                      </span>
                                    ) : distance != null ? (
                                      formatDrivingTime(
                                        estimateDrivingMinutes(distance),
                                      )
                                    ) : (
                                      "—"
                                    )}
                                  </TableCell>
                                </TableRow>
                                {expanded ? (
                                  <>
                                    <TableRow className="border-gray-100 bg-gray-50/40 hover:bg-gray-50/40 dark:border-zinc-800/80 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/30">
                                      <TableCell />
                                      <TableCell
                                        colSpan={5}
                                        className="py-1.5 pl-8 text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500"
                                      >
                                        På pallen
                                      </TableCell>
                                    </TableRow>
                                    {row.wines.map((entry) => (
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
                                            <WineThumb wine={entry.wine} size={32} />
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
                                        <TableCell className="text-right">
                                          <div
                                            className="ml-auto flex items-center justify-end gap-1"
                                            onClick={stopRowToggle}
                                            onKeyDown={stopRowToggle}
                                          >
                                            <Input
                                              type="number"
                                              min={1}
                                              value={entry.quantity}
                                              onChange={(e) =>
                                                updateItem(entry.wine_id, {
                                                  quantity: Math.max(
                                                    1,
                                                    parseInt(e.target.value, 10) ||
                                                      0,
                                                  ),
                                                })
                                              }
                                              className={cn(
                                                inputSmClass,
                                                "w-16 text-right",
                                              )}
                                            />
                                            <Button
                                              type="button"
                                              variant="ghost"
                                              size="icon"
                                              className="h-8 w-8 text-gray-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
                                              onClick={() =>
                                                removeItem(entry.wine_id)
                                              }
                                              title="Ta bort från pallen"
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </div>
                                        </TableCell>
                                        <TableCell />
                                        <TableCell />
                                      </TableRow>
                                    ))}
                                    <TableRow className="border-gray-100 bg-gray-50/40 hover:bg-gray-50/40 dark:border-zinc-800/80 dark:bg-zinc-900/30 dark:hover:bg-zinc-900/30">
                                      <TableCell colSpan={6} className="p-0">
                                        <Collapsible>
                                          <CollapsibleTrigger className="flex w-full items-center gap-2 px-4 py-2.5 pl-12 text-left text-sm font-medium text-gray-700 hover:bg-gray-100/80 dark:text-zinc-300 dark:hover:bg-zinc-900/60 [&[data-state=open]>svg:first-child]:rotate-90">
                                            <ChevronRight className="h-4 w-4 shrink-0 text-gray-500 transition-transform dark:text-zinc-400" />
                                            <span>
                                              Övriga viner från producenten
                                            </span>
                                            <span className="text-xs font-normal text-gray-500 dark:text-zinc-500">
                                              (
                                              {
                                                getAvailableWinesForProducer(
                                                  row.producerId,
                                                  row.name,
                                                ).length
                                              }
                                              )
                                            </span>
                                          </CollapsibleTrigger>
                                          <CollapsibleContent>
                                            {getAvailableWinesForProducer(
                                              row.producerId,
                                              row.name,
                                            ).length === 0 ? (
                                              <p className="px-4 py-3 pl-16 text-sm text-gray-500 dark:text-zinc-400">
                                                Alla viner från producenten finns
                                                redan på pallen.
                                              </p>
                                            ) : (
                                              <div className="space-y-0 border-t border-gray-200 dark:border-zinc-800">
                                                {getAvailableWinesForProducer(
                                                  row.producerId,
                                                  row.name,
                                                ).map((wine) => {
                                                  const addable =
                                                    canAddWineToPallet(wine);
                                                  return (
                                                  <div
                                                    key={wine.id}
                                                    className={cn(
                                                      "flex items-center gap-3 border-b border-gray-100 px-4 py-2.5 pl-16 last:border-b-0 dark:border-zinc-800/80",
                                                      !addable &&
                                                        "bg-gray-50/60 dark:bg-zinc-900/30",
                                                    )}
                                                  >
                                                    <WineThumb wine={wine} size={32} />
                                                    <span
                                                      className={cn(
                                                        "inline-block h-2.5 w-2.5 shrink-0 rounded-full",
                                                        wineColorDotClass(wine.color),
                                                      )}
                                                      aria-hidden
                                                    />
                                                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-zinc-200">
                                                      {wine.wine_name} {wine.vintage}
                                                      {wine.color?.trim() ? (
                                                        <span className="ml-1.5 text-xs font-normal text-gray-500 dark:text-zinc-500">
                                                          · {wine.color}
                                                        </span>
                                                      ) : null}
                                                    </span>
                                                    {!addable ? (
                                                      <WineOosBadge />
                                                    ) : (
                                                      <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 shrink-0 gap-1 border-gray-200 text-xs dark:border-zinc-700"
                                                        onClick={() =>
                                                          addWine(wine, {
                                                            keepComboboxOpen: true,
                                                          })
                                                        }
                                                      >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Lägg till
                                                      </Button>
                                                    )}
                                                  </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </CollapsibleContent>
                                        </Collapsible>
                                      </TableCell>
                                    </TableRow>
                                  </>
                                ) : null}
                              </Fragment>
                            );
                          })
                          )}
                        </TableBody>
                      </Table>
                    ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="border-gray-200 hover:bg-transparent dark:border-zinc-800">
                          <SortableTableHead
                            label="Vin"
                            sortKey="wine"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            className="min-w-[180px]"
                          />
                          <SortableTableHead
                            label="Producent"
                            sortKey="producer"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            className="min-w-[120px]"
                          />
                          <SortableTableHead
                            label="Antal"
                            sortKey="quantity"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            align="right"
                            className="w-16"
                          />
                          <SortableTableHead
                            label="Inköp/fl"
                            sortKey="purchase"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            align="right"
                            className="w-24"
                          />
                          <SortableTableHead
                            label="Alk.skatt/fl"
                            sortKey="alcohol_tax"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            align="right"
                            className="w-24"
                          />
                          <SortableTableHead
                            label="Totalt/fl"
                            sortKey="unit_total"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            align="right"
                            className="w-28"
                          />
                          <SortableTableHead
                            label="Rad totalt"
                            sortKey="line_total"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            align="right"
                            className="w-28"
                          />
                          <SortableTableHead
                            label={commercialPriceColumnLabel(showInclVat)}
                            sortKey="customer_price"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            align="right"
                            className="w-32"
                          />
                          <SortableTableHead
                            label={commercialLineColumnLabel(showInclVat)}
                            sortKey="line_customer_value"
                            activeKey={wineSortKey}
                            direction={wineSortDir}
                            onSort={handleWineSort}
                            align="right"
                            className="w-32"
                          />
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSortedItems.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={10}
                              className="py-8 text-center text-sm text-gray-500 dark:text-zinc-400"
                            >
                              Inga viner matchar filtren på pallen.
                            </TableCell>
                          </TableRow>
                        ) : (
                        filteredSortedItems.map((item) => {
                          const wineForCost = item.wine;
                          const lineCost = getPalletLineCost(
                            item.quantity,
                            item.cost_cents_override,
                            wineForCost,
                            fxRates,
                          );
                          const commercialLine =
                            commercialSummary.lineByWineId.get(item.wine_id);
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
                                <div className="flex min-w-0 items-center gap-3">
                                  <WineThumb wine={wineForCost} size={48} />
                                  <div className="min-w-0 font-medium text-gray-900 dark:text-zinc-100">
                                    {wineForCost
                                      ? `${wineForCost.wine_name} ${wineForCost.vintage}`
                                      : item.wine_id}
                                    {wineForCost &&
                                    !canAddWineToPallet(wineForCost) ? (
                                      <WineOosBadge className="ml-2 align-middle" />
                                    ) : null}
                                  </div>
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
                              <TableCell className="text-right tabular-nums text-sm text-emerald-700 dark:text-emerald-400">
                                {commercialLine?.unitCustomerDisplayCents !=
                                null
                                  ? formatSekFromCents(
                                      commercialLine.unitCustomerDisplayCents,
                                    )
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-right tabular-nums text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                                {commercialLine?.lineCustomerValueCents
                                  ? formatSekFromCents(
                                      commercialLine.lineCustomerValueCents,
                                    )
                                  : "—"}
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
                        })
                        )}
                      </TableBody>
                    </Table>
                    )}
                  </ScrollArea>
                  {showProducerSummary &&
                  drivingRoutesSource &&
                  drivingRoutesSource !== "estimate" ? (
                    <p className={cn("mt-2 px-1", hintClass)}>
                      Distans och körtid baseras på vägnät (
                      {drivingRoutesSource === "mapbox" ? "Mapbox" : "OSRM"}).
                      {optimalPickup
                        ? " Taggen Bästa plats = lägst snittid till övriga producenter."
                        : null}
                    </p>
                  ) : showProducerSummary && optimalPickup ? (
                    <p className={cn("mt-2 px-1", hintClass)}>
                      Taggen Bästa plats = lägst snittid till övriga producenter
                      på pallen.
                    </p>
                  ) : null}
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
                        Lagerkostnad totalt (ex moms)
                      </dt>
                      <dd className="text-base font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                        {formatSekFromCents(costSummary.grandTotalCents)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 sm:col-span-2 border-t border-gray-200 pt-3 dark:border-zinc-700">
                      <dt className="font-medium text-emerald-800 dark:text-emerald-300">
                        Kommersiellt värde{" "}
                        {showInclVat ? "(inkl. moms)" : "(ex moms)"}
                      </dt>
                      <dd className="font-semibold tabular-nums text-emerald-800 dark:text-emerald-300">
                        {formatSekFromCents(
                          commercialSummary.totalCommercialValueCents,
                        )}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-4 sm:col-span-2">
                      <dt className="font-medium text-gray-700 dark:text-zinc-300">
                        Potentiell vinst{" "}
                        {showInclVat ? "(inkl. moms)" : "(ex moms)"}
                      </dt>
                      <dd
                        className={cn(
                          "font-semibold tabular-nums",
                          commercialSummary.totalProfitDisplayCents >= 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400",
                        )}
                      >
                        {formatSekFromCents(
                          commercialSummary.totalProfitDisplayCents,
                        )}
                      </dd>
                    </div>
                    <p className="sm:col-span-2 text-xs text-gray-500 dark:text-zinc-500">
                      Kundvärde beräknas med B2B-formeln (kostnad + frakt +
                      marginal). Vinst = kundvärde − lagerkostnad inkl.
                      palkostnad per flaska.
                    </p>
                  </dl>
                  {producerSummary.length > 0 ? (
                    <div className="mt-4 border-t border-gray-200 pt-4 dark:border-zinc-700">
                      <h4 className="mb-3 text-sm font-medium text-gray-700 dark:text-zinc-300">
                        Producentkarta
                      </h4>
                      <B2bPalletProducersMap producers={palletMapData} />
                    </div>
                  ) : null}
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
