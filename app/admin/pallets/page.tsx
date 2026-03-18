"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Package,
  MapPin,
  Wine,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  BarChart3,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { DeletePalletButton } from "@/components/admin/delete-pallet-button";
import { DeleteB2BPalletButton } from "@/components/admin/delete-b2b-pallet-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getWineCostCentsExVat } from "@/lib/b2b-wine-cost";
import { format } from "date-fns";
import { sv } from "date-fns/locale";

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
}

interface Pallet {
  id: string;
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
  total_booked_bottles: number;
  remaining_bottles: number;
  completion_percentage: number;
  wine_summary: WineSummary[];
  is_complete: boolean;
  needs_ordering: boolean;
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
    exchange_rate?: number;
    alcohol_tax_cents?: number;
  };
}

interface B2BShipment {
  id: string;
  name: string;
  shipped_at: string | null;
  delivered_at: string | null;
  cost_cents: number | null;
  created_at: string;
  b2b_pallet_shipment_items?: B2BShipmentItem[];
}

export default function PalletsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "b2b" ? "b2b" : "pact";

  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [b2bShipments, setB2bShipments] = useState<B2BShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [b2bLoading, setB2bLoading] = useState(false);
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
    if (initialTab !== "b2b") return;
    const fetchB2b = async () => {
      setB2bLoading(true);
      try {
        const res = await fetch("/api/admin/b2b-pallet-shipments");
        if (res.ok) {
          const data = await res.json();
          setB2bShipments(data);
        }
      } catch (err) {
        console.error("Failed to load B2B shipments:", err);
      } finally {
        setB2bLoading(false);
      }
    };
    fetchB2b();
  }, [initialTab, searchParams.toString()]);

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(priceCents / 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "bg-green-500";
    if (percentage >= 75) return "bg-blue-500";
    if (percentage >= 50) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusIcon = (pallet: Pallet) => {
    if (pallet.is_complete)
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (pallet.completion_percentage >= 75)
      return <TrendingUp className="h-4 w-4 text-blue-600" />;
    if (pallet.completion_percentage >= 50)
      return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = (pallet: Pallet) => {
    if (pallet.is_complete) return "Complete";
    if (pallet.completion_percentage >= 75) return "Nearly Full";
    if (pallet.completion_percentage >= 50) return "In Progress";
    return "Needs Orders";
  };

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pallet Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
              Loading…
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 border border-gray-200 dark:border-[#1F1F23] animate-pulse"
            >
              <div className="h-5 bg-gray-200 dark:bg-zinc-700 rounded w-3/4 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-zinc-700 rounded w-1/2 mb-4" />
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded" />
                <div className="h-3 bg-gray-200 dark:bg-zinc-700 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pallet Management
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
              Monitor pallet status and wine allocations
            </p>
          </div>
          <Button
            asChild
            className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
          >
            <Link href="/admin/pallets/new">
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add Pallet
            </Link>
          </Button>
        </div>
        <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-12 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center">
          <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mb-4" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-2">
            Error Loading Pallets
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
            {error}
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="rounded-lg text-xs font-medium"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const handleTabChange = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    url.searchParams.delete("_");
    window.history.replaceState({}, "", url.toString());
  };

  const stats = [
    {
      label: "Total Pallets",
      value: String(pallets.length),
      icon: Package,
      iconBg: "text-blue-600 dark:text-blue-400",
    },
    {
      label: "Complete",
      value: String(pallets.filter((p) => p.is_complete).length),
      icon: CheckCircle,
      iconBg: "text-emerald-600 dark:text-emerald-400",
    },
    {
      label: "Total Bottles",
      value: String(
        pallets.reduce((sum, p) => sum + p.total_booked_bottles, 0),
      ),
      icon: Wine,
      iconBg: "text-purple-600 dark:text-purple-400",
    },
    {
      label: "Needs Ordering",
      value: String(pallets.filter((p) => p.needs_ordering).length),
      icon: AlertCircle,
      iconBg: "text-amber-600 dark:text-amber-400",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Pallet Management
          </h1>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-1">
            Monitor pallet status, bottle capacity, and wine allocations
          </p>
        </div>
        <Button
          asChild
          className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
        >
          <Link href="/admin/pallets/new">
            <Plus className="h-3.5 w-3.5 mr-2" />
            Add Pallet
          </Link>
        </Button>
      </div>

      <Tabs value={initialTab} onValueChange={handleTabChange}>
        <TabsList className="bg-gray-50 dark:bg-zinc-900/70 border border-gray-100 dark:border-zinc-800 rounded-xl p-1">
          <TabsTrigger
            value="pact"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            PACT
          </TabsTrigger>
          <TabsTrigger
            value="b2b"
            className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-zinc-800 data-[state=active]:shadow-sm text-xs font-medium"
          >
            Dirty Wine
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pact" className="mt-6 space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 flex flex-col border border-gray-200 dark:border-[#1F1F23] hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
                    <stat.icon className={`w-4 h-4 ${stat.iconBg}`} />
                  </div>
                </div>
                <p className="text-xs text-gray-600 dark:text-zinc-400 mt-3">
                  {stat.label}
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-zinc-50 mt-0.5">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          {/* Pallets Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pallets.map((pallet) => (
              <div
                key={pallet.id}
                className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 flex flex-col border border-gray-200 dark:border-[#1F1F23] hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800">
                      <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      {pallet.name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(pallet)}
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        pallet.is_complete
                          ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                          : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-zinc-400"
                      }`}
                    >
                      {getStatusText(pallet)}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-zinc-400 mb-3">
                  {pallet.completion_percentage.toFixed(1)}% full
                </p>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-zinc-400">
                      Capacity
                    </span>
                    <span className="font-medium text-gray-900 dark:text-zinc-100">
                      {pallet.total_booked_bottles} / {pallet.bottle_capacity}
                    </span>
                  </div>
                  <Progress
                    value={pallet.completion_percentage}
                    className="h-1.5 bg-gray-200 dark:bg-zinc-800"
                  />
                  <div className="flex justify-between text-[11px] text-gray-500 dark:text-zinc-400">
                    <span>{pallet.remaining_bottles} remaining</span>
                    <span>{formatPrice(pallet.cost_cents)}</span>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-gray-600 dark:text-zinc-400 mt-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>Delivery: {pallet.delivery_zone?.name ?? "—"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>Pickup: {pallet.pickup_zone?.name ?? "—"}</span>
                  </div>
                </div>
                {pallet.wine_summary.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-900 dark:text-zinc-100 mb-1">
                      <Wine className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      {pallet.wine_summary.length} wine types
                    </div>
                    <div className="space-y-1 max-h-16 overflow-y-auto">
                      {pallet.wine_summary.slice(0, 2).map((wine, index) => (
                        <div
                          key={index}
                          className="text-[11px] bg-gray-50 dark:bg-zinc-900/70 p-2 rounded-lg"
                        >
                          <span className="font-medium text-gray-900 dark:text-zinc-100">
                            {wine.wine_name} {wine.vintage}
                          </span>
                          <span className="text-gray-500 dark:text-zinc-400 ml-1">
                            · {wine.total_quantity} st
                          </span>
                        </div>
                      ))}
                      {pallet.wine_summary.length > 2 && (
                        <div className="text-[11px] text-gray-500 dark:text-zinc-400">
                          +{pallet.wine_summary.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div className="flex gap-2 pt-3 mt-3 border-t border-gray-100 dark:border-zinc-800">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs font-medium h-8 flex-1 border-gray-200 dark:border-zinc-700"
                  >
                    <Link href={`/admin/pallets/${pallet.id}`}>
                      <BarChart3 className="h-3.5 w-3.5 mr-1" />
                      Details
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="sm"
                    className="rounded-lg text-xs font-medium h-8 flex-1 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
                  >
                    <Link href={`/admin/pallets/${pallet.id}`}>
                      <Users className="h-3.5 w-3.5 mr-1" />
                      Edit
                    </Link>
                  </Button>
                  <DeletePalletButton
                    palletId={pallet.id}
                    palletName={pallet.name}
                    onDeleted={handlePalletDeleted}
                  />
                </div>
              </div>
            ))}
          </div>

          {pallets.length === 0 && (
            <div className="bg-white dark:bg-[#0F0F12] rounded-xl p-12 border border-gray-200 dark:border-[#1F1F23] flex flex-col items-center justify-center">
              <Package className="h-14 w-14 mx-auto mb-4 text-gray-400 dark:text-zinc-500" />
              <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-1">
                No pallets found
              </h3>
              <p className="text-xs text-gray-500 dark:text-zinc-400 mb-4 text-center max-w-sm">
                Create your first pallet to manage wine allocations and track
                bottle capacity.
              </p>
              <Button
                asChild
                className="rounded-lg text-xs font-medium h-9 bg-gray-900 dark:bg-zinc-50 text-white dark:text-zinc-900 hover:opacity-90"
              >
                <Link href="/admin/pallets/new">
                  <Plus className="h-3.5 w-3.5 mr-2" />
                  Create Pallet
                </Link>
              </Button>
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
                const totalBottles = items.reduce(
                  (s, i) => s + (i.quantity || 0),
                  0,
                );
                const wineCostCents = items.reduce((s, i) => {
                  const cost =
                    i.cost_cents_override != null
                      ? i.cost_cents_override
                      : i.wines
                        ? getWineCostCentsExVat(i.wines)
                        : 0;
                  return s + cost * (i.quantity || 0);
                }, 0);
                const palletCostCents = shipment.cost_cents ?? 0;
                const totalCostCents = wineCostCents + palletCostCents;

                return (
                  <div
                    key={shipment.id}
                    className="bg-white dark:bg-[#0F0F12] rounded-xl p-4 border border-gray-200 dark:border-[#1F1F23] hover:border-gray-200 dark:hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 truncate">
                        {shipment.name}
                      </h3>
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
                    <div className="flex justify-between items-baseline text-xs mb-3">
                      <span className="text-gray-600 dark:text-zinc-400">
                        {totalBottles} flaskor
                        {palletCostCents > 0 && (
                          <span className="ml-1">
                            + {formatPrice(palletCostCents)} palkostnad
                          </span>
                        )}
                      </span>
                      <span className="font-medium text-gray-900 dark:text-zinc-100 tabular-nums">
                        {formatPrice(totalCostCents)}
                      </span>
                    </div>
                    {items.length > 0 && (
                      <ScrollArea className="h-[min(100px,30vh)] -mx-1 rounded-lg mb-3">
                        <div className="space-y-1 pr-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex justify-between items-center text-[11px] py-1.5 px-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800/50"
                            >
                              <span className="truncate text-gray-900 dark:text-zinc-100">
                                {item.wines?.wine_name} {item.wines?.vintage}
                              </span>
                              <span className="text-gray-500 dark:text-zinc-400 shrink-0 ml-2">
                                {item.quantity} st
                              </span>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-zinc-800">
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
