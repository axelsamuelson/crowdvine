"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Package,
  ChevronDown,
  AlertCircle,
  Truck,
} from "lucide-react";
import Link from "next/link";
import { DeletePalletButton } from "@/components/admin/delete-pallet-button";
import { DeleteB2BPalletButton } from "@/components/admin/delete-b2b-pallet-button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getWineCostCentsExVat } from "@/lib/b2b-wine-cost";
import { format } from "date-fns";
import { sv } from "date-fns/locale";
import { toast } from "sonner";

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
  const [orderingShippingPalletId, setOrderingShippingPalletId] = useState<
    string | null
  >(null);
  const [revertingShippingPalletId, setRevertingShippingPalletId] = useState<
    string | null
  >(null);

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

  const getStatusText = (pallet: Pallet) => {
    if (pallet.is_complete) return "Complete";
    if (pallet.completion_percentage >= 75) return "Nearly Full";
    if (pallet.completion_percentage >= 50) return "In Progress";
    return "Needs Orders";
  };

  const fillBarClass = (pct: number) => {
    if (pct > 80) return "bg-emerald-500";
    if (pct >= 30) return "bg-blue-500";
    return "bg-amber-500";
  };

  const statusPillClass = (pallet: Pallet) => {
    if (pallet.is_complete) {
      return "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25";
    }
    return "bg-zinc-800 text-zinc-300 border border-[#1F1F23]";
  };

  const palletStatusAllowsOrderShipping = (pallet: Pallet) => {
    const raw = pallet.status;
    const s =
      raw !== null && raw !== undefined ? String(raw).toLowerCase() : "";
    return (
      (s === "open" || s === "consolidating") &&
      pallet.total_booked_bottles > 0
    );
  };

  const palletStatusIsShippingOrdered = (pallet: Pallet) =>
    String(pallet.status ?? "").toLowerCase().trim() === "shipping_ordered";

  const handleOrderShipping = async (palletId: string) => {
    const confirmed = window.confirm(
      "Are you sure? This will charge all customers with saved cards on this pallet. This cannot be undone.",
    );
    if (!confirmed) return;

    setOrderingShippingPalletId(palletId);
    try {
      const res = await fetch(`/api/admin/pallets/${palletId}/order-shipping`, {
        method: "POST",
      });
      const data: unknown = await res.json().catch(() => null);
      const errMsg =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Request failed";

      if (!res.ok) {
        toast.error(errMsg);
        return;
      }

      toast.success("Shipping ordered. Customers are being charged.");
      const refresh = await fetch("/api/admin/pallets");
      if (refresh.ok) {
        const list: unknown = await refresh.json();
        if (Array.isArray(list)) {
          setPallets(list as Pallet[]);
        }
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setOrderingShippingPalletId(null);
    }
  };

  const handleRevertShipping = async (palletId: string) => {
    const confirmed = window.confirm(
      "Revert shipping order? The pallet will return to open status and customers can place new reservations at the setup_intent rate.",
    );
    if (!confirmed) return;

    setRevertingShippingPalletId(palletId);
    try {
      const res = await fetch(
        `/api/admin/pallets/${palletId}/revert-shipping`,
        { method: "POST" },
      );
      const data: unknown = await res.json().catch(() => null);
      const errMsg =
        data &&
        typeof data === "object" &&
        "error" in data &&
        typeof (data as { error: unknown }).error === "string"
          ? (data as { error: string }).error
          : "Request failed";

      if (!res.ok) {
        toast.error(errMsg);
        return;
      }

      toast.success("Pallet reverted to open");
      const refresh = await fetch("/api/admin/pallets");
      if (refresh.ok) {
        const list: unknown = await refresh.json();
        if (Array.isArray(list)) {
          setPallets(list as Pallet[]);
        }
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setRevertingShippingPalletId(null);
    }
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
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    url.searchParams.delete("_");
    window.history.replaceState({}, "", url.toString());
  };

  const stats = [
    {
      label: "Total Pallets",
      value: String(pallets.length),
      bar: "border-l-zinc-400",
    },
    {
      label: "Complete",
      value: String(pallets.filter((p) => p.is_complete).length),
      bar: "border-l-emerald-500",
    },
    {
      label: "Total Bottles",
      value: String(
        pallets.reduce((sum, p) => sum + p.total_booked_bottles, 0),
      ),
      bar: "border-l-violet-500",
    },
    {
      label: "Needs Ordering",
      value: String(pallets.filter((p) => p.needs_ordering).length),
      bar: "border-l-amber-500",
    },
  ];

  const pactLayoutWide = pallets.length > 0 && pallets.length < 3;

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
            Pallets
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Capacity, routes, and reservations
          </p>
        </div>
        <Link
          href="/admin/pallets/new"
          className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 pt-1"
        >
          + Add pallet
        </Link>
      </div>

      <Tabs value={initialTab} onValueChange={handleTabChange}>
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

        <TabsContent value="pact" className="mt-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`bg-[#0F0F12] rounded-lg p-5 border border-[#1F1F23] border-l-[3px] ${stat.bar}`}
              >
                <p className="text-xs uppercase tracking-widest text-zinc-500 mb-2">
                  {stat.label}
                </p>
                <p className="text-3xl font-semibold tabular-nums text-zinc-100">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>

          <div
            className={
              pactLayoutWide
                ? "flex flex-col gap-4"
                : "grid gap-4 md:grid-cols-2 lg:grid-cols-3"
            }
          >
            {pallets.map((pallet) => {
              const delivery = pallet.delivery_zone?.name ?? "—";
              const origin =
                pallet.shipping_region?.name ??
                pallet.pickup_zone?.name ??
                "—";
              const pct = pallet.completion_percentage;
              const fillClass = fillBarClass(pct);
              const cardInner =
                pactLayoutWide ? (
                  <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <h3 className="text-sm font-semibold text-zinc-100 truncate">
                            {pallet.name}
                          </h3>
                          {pallet.pallet_type === "region_based" ? (
                            <span className="text-[9px] font-medium uppercase tracking-wide bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded px-1.5 py-0.5 shrink-0">
                              Auto
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${statusPillClass(pallet)}`}
                        >
                          {getStatusText(pallet)}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 tabular-nums">
                        <span className="text-zinc-300">{delivery}</span>
                        <span className="mx-1.5 text-zinc-600">→</span>
                        <span className="text-zinc-300">{origin}</span>
                      </p>
                      {pallet.current_pickup_producer?.name ||
                      pallet.shipping_region_id ||
                      pallet.shipping_region?.id ? (
                        <>
                          <p className="text-xs text-zinc-400">
                            Ships from{" "}
                            <span className="font-medium text-zinc-200">
                              {pallet.current_pickup_producer?.name ?? "—"}
                            </span>
                          </p>
                          {(pallet.needs_pallet_zone === true ||
                            pallet.pickup_is_fallback === true) && (
                            <p className="text-xs text-amber-500 mt-0.5">
                              ⚠ No pallet zone producer has orders yet
                            </p>
                          )}
                        </>
                      ) : null}
                      {palletStatusIsShippingOrdered(pallet) ||
                      (typeof pallet.shipping_ordered_at === "string" &&
                        pallet.shipping_ordered_at.length > 0) ? (
                        <div className="space-y-1">
                          {typeof pallet.shipping_ordered_at === "string" &&
                          pallet.shipping_ordered_at.length > 0 ? (
                            <p className="text-xs font-medium text-amber-400/90">
                              Shipping ordered:{" "}
                              {format(
                                new Date(pallet.shipping_ordered_at),
                                "PPp",
                                { locale: sv },
                              )}
                            </p>
                          ) : null}
                          {palletStatusIsShippingOrdered(pallet) ? (
                            <button
                              type="button"
                              onClick={() =>
                                void handleRevertShipping(pallet.id)
                              }
                              disabled={
                                revertingShippingPalletId === pallet.id
                              }
                              className="text-xs text-amber-500 hover:text-amber-400 underline underline-offset-2 disabled:opacity-50"
                            >
                              Revert to open
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <div className="shrink-0 w-full lg:w-44 space-y-2">
                      <p className="text-2xl font-semibold tabular-nums text-zinc-100">
                        {pct.toFixed(0)}%
                      </p>
                      <div className="h-0.5 w-full bg-[#1F1F23] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${fillClass}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                          }}
                        />
                      </div>
                      <p className="text-xs text-zinc-500 tabular-nums">
                        {pallet.total_booked_bottles} /{" "}
                        {pallet.bottle_capacity} bottles
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col gap-3 lg:items-end lg:text-right min-w-[10rem]">
                      {pallet.wine_summary.length > 0 ? (
                        <details className="group text-left lg:text-right">
                          <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-zinc-400 lg:ml-auto [&::-webkit-details-marker]:hidden">
                            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-zinc-500 transition-transform group-open:rotate-180" />
                            <span className="tabular-nums">
                              {pallet.wine_summary.length} wine types
                            </span>
                          </summary>
                          <ul className="mt-2 space-y-0.5 text-xs text-zinc-500 lg:text-right">
                            {pallet.wine_summary.map((wine, index) => (
                              <li key={index}>
                                {wine.wine_name} {wine.vintage} ·{" "}
                                {wine.total_quantity} st
                              </li>
                            ))}
                          </ul>
                        </details>
                      ) : null}
                      <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[11rem]">
                        {palletStatusAllowsOrderShipping(pallet) ? (
                          <Button
                            type="button"
                            size="sm"
                            disabled={orderingShippingPalletId === pallet.id}
                            onClick={() => void handleOrderShipping(pallet.id)}
                            className="h-8 w-full text-xs font-medium bg-amber-600 text-white hover:bg-amber-500 border-0 shadow-none"
                          >
                            {orderingShippingPalletId === pallet.id
                              ? "Ordering…"
                              : "Order Shipping"}
                          </Button>
                        ) : null}
                        <div className="flex flex-wrap gap-1 justify-start lg:justify-end">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-100"
                          >
                            <Link href={`/admin/pallets/${pallet.id}`}>
                              Details
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-100"
                          >
                            <Link href={`/admin/pallets/${pallet.id}`}>
                              Edit
                            </Link>
                          </Button>
                          <span className="inline-flex [&>button]:h-8 [&>button]:w-8 [&>button]:p-0 [&>button]:text-xs [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-zinc-500 [&>button]:shadow-none [&>button]:hover:text-red-400 [&>button]:hover:bg-red-500/10">
                            <DeletePalletButton
                              palletId={pallet.id}
                              palletName={pallet.name}
                              onDeleted={handlePalletDeleted}
                            />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 min-w-0">
                        <h3 className="text-sm font-semibold text-zinc-100 truncate">
                          {pallet.name}
                        </h3>
                        {pallet.pallet_type === "region_based" ? (
                          <span className="text-[9px] font-medium uppercase tracking-wide bg-violet-500/10 text-violet-400 border border-violet-500/20 rounded px-1.5 py-0.5 shrink-0">
                            Auto
                          </span>
                        ) : null}
                      </div>
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${statusPillClass(pallet)}`}
                      >
                        {getStatusText(pallet)}
                      </span>
                    </div>
                    <div>
                      <p className="text-2xl font-semibold tabular-nums text-zinc-100">
                        {pct.toFixed(0)}%
                      </p>
                      <div className="mt-2 h-0.5 w-full bg-[#1F1F23] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${fillClass}`}
                          style={{
                            width: `${Math.min(100, Math.max(0, pct))}%`,
                          }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-zinc-500 tabular-nums">
                        {pallet.total_booked_bottles} /{" "}
                        {pallet.bottle_capacity} bottles
                      </p>
                    </div>
                    <p className="text-xs text-zinc-400 tabular-nums">
                      <span className="text-zinc-300">{delivery}</span>
                      <span className="mx-1.5 text-zinc-600">→</span>
                      <span className="text-zinc-300">{origin}</span>
                    </p>
                    {pallet.current_pickup_producer?.name ||
                    pallet.shipping_region_id ||
                    pallet.shipping_region?.id ? (
                      <>
                        <p className="text-xs text-zinc-400">
                          Ships from{" "}
                          <span className="font-medium text-zinc-200">
                            {pallet.current_pickup_producer?.name ?? "—"}
                          </span>
                        </p>
                        {(pallet.needs_pallet_zone === true ||
                          pallet.pickup_is_fallback === true) && (
                          <p className="text-xs text-amber-500 mt-0.5">
                            ⚠ No pallet zone producer has orders yet
                          </p>
                        )}
                      </>
                    ) : null}
                    {palletStatusIsShippingOrdered(pallet) ||
                    (typeof pallet.shipping_ordered_at === "string" &&
                      pallet.shipping_ordered_at.length > 0) ? (
                      <div className="space-y-1">
                        {typeof pallet.shipping_ordered_at === "string" &&
                        pallet.shipping_ordered_at.length > 0 ? (
                          <p className="text-xs font-medium text-amber-400/90">
                            Shipping ordered:{" "}
                            {format(
                              new Date(pallet.shipping_ordered_at),
                              "PPp",
                              { locale: sv },
                            )}
                          </p>
                        ) : null}
                        {palletStatusIsShippingOrdered(pallet) ? (
                          <button
                            type="button"
                            onClick={() => void handleRevertShipping(pallet.id)}
                            disabled={revertingShippingPalletId === pallet.id}
                            className="text-xs text-amber-500 hover:text-amber-400 underline underline-offset-2 disabled:opacity-50"
                          >
                            Revert to open
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {pallet.wine_summary.length > 0 ? (
                      <details className="group border-t border-[#1F1F23] pt-3">
                        <summary className="flex cursor-pointer list-none items-center gap-1 text-xs text-zinc-400 [&::-webkit-details-marker]:hidden">
                          <ChevronDown className="h-3.5 w-3.5 text-zinc-500 transition-transform group-open:rotate-180" />
                          <span className="tabular-nums">
                            {pallet.wine_summary.length} wine types
                          </span>
                        </summary>
                        <ul className="mt-2 space-y-0.5 text-xs text-zinc-500">
                          {pallet.wine_summary.map((wine, index) => (
                            <li key={index}>
                              {wine.wine_name} {wine.vintage} ·{" "}
                              {wine.total_quantity} st
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                    <div className="flex flex-col gap-2 pt-3 border-t border-[#1F1F23]">
                      {palletStatusAllowsOrderShipping(pallet) ? (
                        <Button
                          type="button"
                          size="sm"
                          disabled={orderingShippingPalletId === pallet.id}
                          onClick={() => void handleOrderShipping(pallet.id)}
                          className="h-8 w-full text-xs font-medium bg-amber-600 text-white hover:bg-amber-500 border-0 shadow-none"
                        >
                          {orderingShippingPalletId === pallet.id
                            ? "Ordering…"
                            : "Order Shipping"}
                        </Button>
                      ) : null}
                      <div className="flex flex-wrap gap-1">
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-100"
                        >
                          <Link href={`/admin/pallets/${pallet.id}`}>
                            Details
                          </Link>
                        </Button>
                        <Button
                          asChild
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-zinc-400 hover:text-zinc-100"
                        >
                          <Link href={`/admin/pallets/${pallet.id}`}>
                            Edit
                          </Link>
                        </Button>
                        <span className="inline-flex [&>button]:h-8 [&>button]:w-8 [&>button]:p-0 [&>button]:text-xs [&>button]:border-0 [&>button]:bg-transparent [&>button]:text-zinc-500 [&>button]:shadow-none [&>button]:hover:text-red-400 [&>button]:hover:bg-red-500/10">
                          <DeletePalletButton
                            palletId={pallet.id}
                            palletName={pallet.name}
                            onDeleted={handlePalletDeleted}
                          />
                        </span>
                      </div>
                    </div>
                  </div>
                );

              return (
                <div
                  key={pallet.id}
                  className="bg-[#0F0F12] rounded-lg border border-[#1F1F23] p-5"
                >
                  {cardInner}
                </div>
              );
            })}
          </div>

          {pallets.length === 0 && (
            <div className="bg-[#0F0F12] rounded-lg p-12 border border-[#1F1F23] flex flex-col items-center justify-center">
              <Package className="h-14 w-14 mx-auto mb-4 text-zinc-600" />
              <h3 className="text-sm font-semibold text-zinc-100 mb-1">
                No pallets found
              </h3>
              <p className="text-xs text-zinc-500 mb-4 text-center max-w-sm">
                Create your first pallet to manage wine allocations and track
                bottle capacity.
              </p>
              <Link
                href="/admin/pallets/new"
                className="text-xs text-zinc-400 hover:text-zinc-200 underline underline-offset-2"
              >
                + Add pallet
              </Link>
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
