"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, AlertCircle, Plus, ChevronDown, Truck } from "lucide-react";
import Link from "next/link";
import { DeleteB2BPalletButton } from "@/components/admin/delete-b2b-pallet-button";
import { PactPalletListCard } from "@/components/admin/pact-pallet-list-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  collectCurrenciesNeedingRates,
  computePalletCostSummary,
  formatSekFromCents,
} from "@/lib/b2b-wine-cost";
import { fetchClientExchangeRatesMap } from "@/lib/b2b-exchange-rates-client";
import {
  computePalletColorCounts,
  wineColorDotClass,
} from "@/lib/wine-color";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import type { AdminPalletOperatingSummary } from "@/lib/admin-pallet-operating-summary";

interface PalletZone {
  id: string;
  name: string;
  zone_type: "delivery" | "pickup";
}

interface WineSummary {
  wine_name: string;
  vintage: string;
  grape_varieties: string;
  color: string;
  producer: string;
  total_quantity: number;
  base_price_cents: number;
  producer_id?: string;
  moq_min_bottles?: number;
  producer_bottles_on_pallet?: number;
  producer_moq_met?: boolean;
}

interface ShippingRegionEmbed {
  id: string;
  name: string;
}

interface ProducerPickupEmbed {
  id: string;
  name: string | null;
}

interface Pallet {
  id: string;
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string | null;
  shipping_region_id?: string | null;
  pallet_type?: "region_based" | "zone_based";
  status?: string | null;
  shipping_ordered_at?: string | null;
  current_pickup_producer_id?: string | null;
  /** True when pickup is set but that producer is not marked as a pallet-zone producer. */
  pickup_is_fallback?: boolean;
  /** True when the pallet has bookings but no pickup producer is assigned yet. */
  needs_pallet_zone?: boolean;
  cost_cents: number;
  bottle_capacity: number;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
  shipping_region?: ShippingRegionEmbed | null;
  current_pickup_producer?: ProducerPickupEmbed | null;
  total_booked_bottles: number;
  remaining_bottles: number;
  remaining_to_ship?: number;
  min_bottles_to_complete?: number;
  completion_percentage: number;
  wine_summary: WineSummary[];
  is_complete: boolean;
  needs_ordering: boolean;
  /** Phase 2 shadow contribution readiness (admin only). */
  shadow_contribution?: {
    accumulatedContributionCents: number;
    freightTargetCents: number;
    remainingContributionCents: number;
    freightFundedPercent: number;
    expectedContributionPerBottleCents: number | null;
    estimatedBottlesRemaining: number | null;
    isEconomicallyReady: boolean;
    currentBottleRuleReady: boolean;
    hasIncompleteSnapshots: boolean;
    bottlesWithSnapshot: number;
  };
  /** Phase 2D canonical operating summary (list + detail share this). */
  operating_summary?: AdminPalletOperatingSummary | null;
}

interface B2BShipmentItem {
  id: string;
  wine_id: string;
  quantity: number;
  cost_cents_override: number | null;
  wines?: {
    id: string;
    wine_name: string;
    vintage: string;
    cost_amount?: number;
    cost_currency?: string;
    exchange_rate?: number;
    alcohol_tax_cents?: number;
    color?: string | null;
    producers?: { name: string } | null;
  };
}

interface B2BShipment {
  id: string;
  name: string;
  shipped_at: string | null;
  delivered_at: string | null;
  cost_cents: number | null;
  is_active?: boolean;
  created_at: string;
  b2b_pallet_shipment_items?: B2BShipmentItem[];
}

export default function PalletsPage() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab") === "b2b" ? "b2b" : "pact";
  const [activeTab, setActiveTab] = useState<"pact" | "b2b">(tabFromUrl);

  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [b2bShipments, setB2bShipments] = useState<B2BShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [b2bLoading, setB2bLoading] = useState(false);
  const [b2bFxRates, setB2bFxRates] = useState<Record<string, number>>({
    SEK: 1,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPallets = async () => {
      try {
        const response = await fetch("/api/admin/pallets");
        if (response.ok) {
          const data = await response.json();
          setPallets(data);
        } else {
          setError("Failed to load pallets");
        }
      } catch (err) {
        setError("Failed to load pallets");
      } finally {
        setLoading(false);
      }
    };

    fetchPallets();
  }, []);

  useEffect(() => {
    setActiveTab(tabFromUrl);
  }, [tabFromUrl]);

  useEffect(() => {
    if (activeTab !== "b2b") return;
    const fetchB2b = async () => {
      setB2bLoading(true);
      try {
        const res = await fetch("/api/admin/b2b-pallet-shipments");
        if (res.ok) {
          const data = await res.json();
          setB2bShipments(data);
          const winesForFx = (data as B2BShipment[]).flatMap((s) =>
            (s.b2b_pallet_shipment_items || [])
              .map((i) => i.wines)
              .filter(Boolean),
          ) as NonNullable<B2BShipmentItem["wines"]>[];
          const currencies = collectCurrenciesNeedingRates(winesForFx);
          if (currencies.length > 0) {
            const rates = await fetchClientExchangeRatesMap(currencies);
            setB2bFxRates({ SEK: 1, ...rates });
          } else {
            setB2bFxRates({ SEK: 1 });
          }
        }
      } catch (err) {
        console.error("Failed to load B2B shipments:", err);
      } finally {
        setB2bLoading(false);
      }
    };
    fetchB2b();
  }, [activeTab, searchParams.toString()]);

  const handlePalletDeleted = () => {
    // Refresh the pallet list
    const fetchPallets = async () => {
      try {
        const response = await fetch("/api/admin/pallets");
        if (response.ok) {
          const data = await response.json();
          setPallets(data);
        }
      } catch (err) {
        console.error("Failed to refresh pallets:", err);
      }
    };
    fetchPallets();
  };

  if (loading) {
    return (
      <div className="space-y-10">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Pallets
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Loading…</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-[#0F0F12] rounded-lg p-5 border border-[#1F1F23] animate-pulse"
            >
              <div className="h-5 bg-zinc-800 rounded w-3/4 mb-3" />
              <div className="h-4 bg-zinc-800 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-zinc-800 rounded" />
                <div className="h-3 bg-zinc-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-10">
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Pallets
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Monitor pallet status and wine allocations
            </p>
          </div>
          <Link
            href="/admin/pallets/new"
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 pt-1"
          >
            + Add pallet
          </Link>
        </div>
        <div className="bg-[#0F0F12] rounded-lg p-12 border border-[#1F1F23] flex flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-sm font-semibold text-zinc-100 mb-2">
            Error Loading Pallets
          </h3>
          <p className="text-xs text-zinc-500 mb-4">{error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="ghost"
            size="sm"
            className="text-xs text-zinc-300 h-8"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    const tab = value === "b2b" ? "b2b" : "pact";
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    url.searchParams.delete("_");
    window.history.replaceState({}, "", url.toString());
  };

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Pallar
          </h1>
          <p className="text-sm text-zinc-500 mt-1 max-w-lg">
            Kapacitet och reservationer. Varje PACT-pall har leveranszon; ursprung
            är fraktregion eller upphämtningszon.
          </p>
        </div>
        <Button asChild size="sm" variant="outline">
          <Link href="/admin/pallets/new">
            <Plus className="h-4 w-4 mr-1.5" />
            Ny pall
          </Link>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="bg-zinc-900/70 border border-zinc-800 rounded-lg p-1 h-auto">
          <TabsTrigger
            value="pact"
            className="rounded-md data-[state=active]:bg-[#0F0F12] data-[state=active]:text-zinc-100 text-xs font-medium text-zinc-500 px-3 py-1.5"
          >
            PACT
          </TabsTrigger>
          <TabsTrigger
            value="b2b"
            className="rounded-md data-[state=active]:bg-[#0F0F12] data-[state=active]:text-zinc-100 text-xs font-medium text-zinc-500 px-3 py-1.5"
          >
            Dirty Wine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pact" className="mt-6 space-y-6">
          {pallets.length === 0 ? (
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-12 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center">
              <Package className="h-14 w-14 mx-auto mb-4 text-gray-400 dark:text-zinc-600" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                No pallets found
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-500 mb-4 text-center max-w-sm">
                Create your first pallet to manage wine allocations and track
                ship readiness.
              </p>
              <Link
                href="/admin/pallets/new"
                className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 underline underline-offset-2"
              >
                + Add pallet
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pallets.map((pallet) => (
                <PactPalletListCard
                  key={pallet.id}
                  pallet={pallet}
                  onDeleted={handlePalletDeleted}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="b2b" className="mt-6 space-y-6">
          <div className="flex justify-end">
            <Button
              asChild
              className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
            >
              <Link href="/admin/pallets/b2b/new">
                <Plus className="h-3.5 w-3.5 mr-2" />
                Add Pallet
              </Link>
            </Button>
          </div>

          {b2bLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 border border-gray-200 dark:border-[#1F1F23] animate-pulse"
                >
                  <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-3" />
                  <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2 mb-4" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded mb-2" />
                  <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {b2bShipments.map((shipment) => {
                const items = shipment.b2b_pallet_shipment_items || [];
                const summary = computePalletCostSummary(
                  items.map((i) => ({
                    quantity: i.quantity || 0,
                    cost_cents_override: i.cost_cents_override,
                    wine: i.wines,
                  })),
                  shipment.cost_cents ?? 0,
                  b2bFxRates,
                );
                const colorCounts = computePalletColorCounts(
                  items.map((i) => ({
                    quantity: i.quantity || 0,
                    wine: i.wines,
                  })),
                );

                return (
                  <div
                    key={shipment.id}
                    className="bg-white dark:bg-[#0F0F12] rounded-xl border border-gray-200 dark:border-[#1F1F23] hover:border-gray-200 dark:hover:border-zinc-700 transition-all overflow-hidden"
                  >
                    <Link
                      href={`/admin/pallets/b2b/${shipment.id}/edit`}
                      className="block p-4 pb-0 hover:bg-gray-50/80 dark:hover:bg-zinc-900/40 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3 gap-2">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                          {shipment.name}
                        </h3>
                        <span
                          className={cn(
                            "shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                            shipment.is_active
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400",
                          )}
                        >
                          {shipment.is_active ? "Aktiv" : "Inaktiv"}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                        {shipment.shipped_at && (
                          <span>
                            Skickad{" "}
                            {format(
                              new Date(shipment.shipped_at),
                              "d MMM yyyy",
                              { locale: sv },
                            )}
                          </span>
                        )}
                        {shipment.delivered_at && (
                          <span>
                            Ankommen{" "}
                            {format(
                              new Date(shipment.delivered_at),
                              "d MMM yyyy",
                              { locale: sv },
                            )}
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-xs mb-3">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-zinc-400">
                            {summary.totalBottles} flaskor
                          </span>
                          <span className="font-semibold text-gray-900 dark:text-zinc-100 tabular-nums">
                            {formatSekFromCents(summary.grandTotalCents)}
                          </span>
                        </div>
                        <div className="flex justify-between text-[11px] text-gray-500 dark:text-zinc-500">
                          <span>Inkl. alkoholskatt</span>
                          <span className="tabular-nums">
                            {formatSekFromCents(summary.wineTotalCents)}
                          </span>
                        </div>
                        {summary.palletCostCents > 0 && (
                          <div className="flex justify-between text-[11px] text-gray-500 dark:text-zinc-500">
                            <span>+ palkostnad</span>
                            <span className="tabular-nums">
                              {formatSekFromCents(summary.palletCostCents)}
                            </span>
                          </div>
                        )}
                        {colorCounts.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {colorCounts.map(({ color, bottles }) => (
                              <span
                                key={color}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] dark:border-zinc-700 dark:bg-zinc-900"
                                title={color}
                              >
                                <span
                                  className={cn(
                                    "inline-block h-2 w-2 shrink-0 rounded-full",
                                    wineColorDotClass(color),
                                  )}
                                  aria-hidden
                                />
                                <span className="text-gray-600 dark:text-zinc-400 max-w-[72px] truncate">
                                  {color}
                                </span>
                                <span className="font-medium tabular-nums text-gray-800 dark:text-zinc-200">
                                  {bottles}
                                </span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {items.length > 0 && (
                        <ScrollArea className="h-[min(100px,30vh)] -mx-1 rounded-lg mb-3">
                          <div className="space-y-1 pr-2">
                            {items.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-center text-[11px] py-1.5 px-2 rounded-lg"
                              >
                                <span className="min-w-0 truncate text-gray-900 dark:text-zinc-100">
                                  <span className="block truncate">
                                    {item.wines?.wine_name} {item.wines?.vintage}
                                  </span>
                                  {item.wines?.producers?.name && (
                                    <span className="block truncate text-[10px] text-gray-500 dark:text-zinc-500">
                                      {item.wines.producers.name}
                                    </span>
                                  )}
                                </span>
                                <span className="text-gray-500 dark:text-zinc-400 shrink-0 ml-2 tabular-nums">
                                  {item.quantity} st
                                </span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      )}
                    </Link>
                    <div className="flex gap-2 p-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-medium h-8 flex-1 border-gray-200 dark:border-zinc-700"
                      >
                        <Link
                          href={`/admin/pallets/b2b/${shipment.id}/status`}
                        >
                          Status
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="rounded-lg text-xs font-medium h-8 flex-1 border-gray-200 dark:border-zinc-700"
                      >
                        <Link
                          href={`/admin/pallets/b2b/${shipment.id}/edit`}
                        >
                          Redigera
                        </Link>
                      </Button>
                      <DeleteB2BPalletButton
                        shipmentId={shipment.id}
                        shipmentName={shipment.name}
                        onDeleted={() => {
                          setB2bShipments((prev) =>
                            prev.filter((s) => s.id !== shipment.id),
                          );
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!b2bLoading && b2bShipments.length === 0 && (
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-12 border border-gray-200 dark:border-[#1F1F23] border-dashed flex flex-col items-center justify-center">
              <div className="rounded-full bg-gray-100 dark:bg-zinc-800 p-4 mb-4">
                <Truck className="h-6 w-6 text-gray-500 dark:text-zinc-400" />
              </div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                Inga pallar
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-6 text-center max-w-sm">
                Lägg till en pall för att hantera vinleveranser.
              </p>
              <Button
                asChild
                className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
              >
                <Link href="/admin/pallets/b2b/new">
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Lägg till pall
                </Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
