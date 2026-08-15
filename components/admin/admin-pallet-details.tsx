"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { DeletePalletButton } from "@/components/admin/delete-pallet-button";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Edit,
  Plus,
  Trash2,
  GripVertical,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  type CompletionRules,
  type CompletionGroup,
  type CompletionCondition,
  formatCompletionRules,
} from "@/lib/pallet-completion-rules";
import { PalletInboundFreightPanel } from "@/components/admin/pallet-inbound-freight-panel";
import { AdminPactPalletStatusSummary } from "@/components/admin/admin-pact-pallet-status-summary";
import type { AdminPalletOperatingSummary } from "@/lib/admin-pallet-operating-summary";
import { cn } from "@/lib/utils";

// Format currency in SEK
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface PalletZone {
  id: string;
  name: string;
  zone_type: string;
}

interface Pallet {
  id: string;
  name: string;
  description?: string;
  status?: string;
  status_mode?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  min_bottles_to_complete?: number;
  freight_target_cents?: number | null;
  last_mile_cost_cents_per_bottle?: number | null;
  current_bottles?: number;
  completion_rules?: CompletionRules | null;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
}

interface Reservation {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  user_email: string;
  user_name: string;
  total_bottles: number;
  total_cost_cents: number;
  items: Array<{
    wine_name: string;
    producer_name: string;
    quantity: number;
    price_cents: number;
  }>;
}

interface PalletStats {
  total_reservations: number;
  total_bottles: number;
  total_revenue_cents: number;
  unique_users: number;
  unique_wines: number;
  percentage_filled: number;
}

interface AdminPalletDetailsProps {
  pallet: Pallet;
  palletId: string;
}

export default function AdminPalletDetails({
  pallet,
  palletId,
}: AdminPalletDetailsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<PalletStats | null>(null);
  const [metrics, setMetrics] = useState<{
    currentBottles: number;
    profitSek: number;
    isComplete: boolean;
  } | null>(null);
  const [rules, setRules] = useState<CompletionRules>(() => {
    const existing = pallet.completion_rules;
    return (
      existing || {
        mode: "SEQUENTIAL",
        groups: [
          {
            operator: "AND",
            conditions: [{ metric: "bottles", op: ">=", value: 120 }],
          },
        ],
      }
    );
  });
  const [savingRules, setSavingRules] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [palletStatus, setPalletStatus] = useState<string>(
    typeof pallet.status === "string" && pallet.status.length > 0
      ? pallet.status
      : "open",
  );
  const [palletStatusMode, setPalletStatusMode] = useState<"auto" | "manual">(
    pallet.status_mode === "manual" ? "manual" : "auto",
  );
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null);
  const [resettingReservations, setResettingReservations] = useState(false);
  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [orderingShipping, setOrderingShipping] = useState(false);
  const [revertingShipping, setRevertingShipping] = useState(false);
  const [sendingNotifications, setSendingNotifications] = useState(false);
  const [operatingSummary, setOperatingSummary] =
    useState<AdminPalletOperatingSummary | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof pallet.status === "string" && pallet.status.length > 0) {
      setPalletStatus(pallet.status);
    }
    setPalletStatusMode(pallet.status_mode === "manual" ? "manual" : "auto");
  }, [pallet.id, pallet.status, pallet.status_mode]);

  useEffect(() => {
    fetchPalletData();
  }, [palletId]);

  const fetchPalletData = async () => {
    try {
      setLoading(true);

      // Fetch reservations for this pallet (admin endpoint) — display only
      const resResponse = await fetch(
        `/api/admin/pallets/${palletId}/reservations`,
      );
      if (!resResponse.ok) {
        const errorData = await resResponse.json();
        console.error("API error:", errorData);
        throw new Error(errorData.error || "Failed to fetch reservations");
      }

      const resData = await resResponse.json();
      const reservationsList = Array.isArray(resData) ? resData : [];
      setReservations(reservationsList);

      // Canonical fill / readiness / economics (same source as list)
      const summaryRes = await fetch(
        `/api/admin/pallets/${palletId}/operating-summary`,
      );
      if (summaryRes.ok) {
        const summaryJson = await summaryRes.json();
        if (summaryJson?.operating_summary) {
          setOperatingSummary(
            summaryJson.operating_summary as AdminPalletOperatingSummary,
          );
        }
      } else {
        setOperatingSummary(null);
      }

      // Fetch pallet metrics (data-driven totals + profit) for legacy rule preview
      const metricRes = await fetch("/api/pallet-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ palletIds: [palletId] }),
      });
      if (metricRes.ok) {
        const metricJson = await metricRes.json();
        const p = metricJson?.pallets?.[0];
        if (p) {
          setMetrics({
            currentBottles: Number(p.current_bottles) || 0,
            profitSek: Number(p.profit_sek_ex_vat) || 0,
            isComplete: Boolean(p.is_complete),
          });
        }
      }

      // Display stats from reservation table (not used for ship readiness)
      const uniqueUsers = new Set(
        reservationsList.map((r: Reservation) => r.user_email),
      ).size;
      const uniqueWines = new Set(
        reservationsList.flatMap((r: Reservation) =>
          r.items.map((item) => `${item.producer_name}-${item.wine_name}`),
        ),
      ).size;

      const displayBottles = reservationsList.reduce(
        (sum: number, r: Reservation) => sum + r.total_bottles,
        0,
      );

      const totalRevenue = reservationsList.reduce(
        (sum: number, r: Reservation) => sum + r.total_cost_cents,
        0,
      );

      setStats({
        total_reservations: reservationsList.length,
        total_bottles: displayBottles,
        total_revenue_cents: totalRevenue,
        unique_users: uniqueUsers,
        unique_wines: uniqueWines,
        percentage_filled: 0, // replaced by operatingSummary.shipProgressPercent
      });
    } catch (err) {
      console.error("Failed to fetch pallet data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const saveRules = async () => {
    setSavingRules(true);
    try {
      const resp = await fetch(`/api/admin/pallets/${palletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completion_rules: rules }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to save rules");
      }
      toast.success("Completion rules saved");
      // Refresh derived metrics
      fetchPalletData();
    } catch (e) {
      toast.error("Failed to save completion rules", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSavingRules(false);
    }
  };

  const savePalletStatus = async (nextStatus: string) => {
    setSavingStatus(true);
    try {
      const resp = await fetch(`/api/admin/pallets/${palletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to update pallet status");
      }
      toast.success("Pallet status updated");
      setPalletStatus(nextStatus);
      fetchPalletData();
    } catch (e) {
      toast.error("Failed to update pallet status", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const savePalletStatusMode = async (nextMode: "auto" | "manual") => {
    setSavingStatus(true);
    try {
      const resp = await fetch(`/api/admin/pallets/${palletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status_mode: nextMode }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) {
        throw new Error(data?.error || "Failed to update status mode");
      }
      toast.success(`Status mode set to ${nextMode}`);
      setPalletStatusMode(nextMode);
      if (typeof data?.status === "string") {
        setPalletStatus(data.status);
      }
      fetchPalletData();
    } catch (e) {
      toast.error("Failed to update status mode", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSavingStatus(false);
    }
  };

  const deleteReservation = async (reservationId: string) => {
    setDeletingReservationId(reservationId);
    try {
      const resp = await fetch(
        `/api/admin/pallets/${palletId}/reservations/${reservationId}`,
        { method: "DELETE" },
      );
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.error || "Failed to delete reservation");
      toast.success("Reservation deleted");
      fetchPalletData();
    } catch (e) {
      toast.error("Failed to delete reservation", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setDeletingReservationId(null);
    }
  };

  const resetAllReservations = async () => {
    setResettingReservations(true);
    try {
      const resp = await fetch(`/api/admin/pallets/${palletId}/reservations/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "RESET" }),
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok) throw new Error(data?.error || "Failed to reset reservations");
      toast.success("Reservations cleared", {
        description: `Deleted ${data?.deleted ?? 0} reservation(s).`,
      });
      fetchPalletData();
    } catch (e) {
      toast.error("Failed to reset reservations", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setResettingReservations(false);
    }
  };

  const addGroup = () => {
    const next: CompletionGroup = { operator: "AND", conditions: [] };
    setRules((r) => ({ ...r, groups: [...(r.groups || []), next] }));
  };

  const removeGroup = (idx: number) => {
    setRules((r) => ({ ...r, groups: r.groups.filter((_, i) => i !== idx) }));
  };

  const moveGroup = (from: number, to: number) => {
    setRules((r) => {
      const next = [...r.groups];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return { ...r, groups: next };
    });
  };

  const stepLabel = useMemo(() => {
    return (idx: number) => (idx === 0 ? "IF" : "ELSE IF");
  }, []);

  const addCondition = (groupIdx: number) => {
    const next: CompletionCondition = { metric: "bottles", op: ">=", value: 0 };
    setRules((r) => ({
      ...r,
      groups: r.groups.map((g, i) =>
        i === groupIdx ? { ...g, conditions: [...(g.conditions || []), next] } : g,
      ),
    }));
  };

  const removeCondition = (groupIdx: number, condIdx: number) => {
    setRules((r) => ({
      ...r,
      groups: r.groups.map((g, i) =>
        i === groupIdx
          ? { ...g, conditions: g.conditions.filter((_, j) => j !== condIdx) }
          : g,
      ),
    }));
  };

  const updateCondition = (
    groupIdx: number,
    condIdx: number,
    patch: Partial<CompletionCondition>,
  ) => {
    setRules((r) => ({
      ...r,
      groups: r.groups.map((g, i) => {
        if (i !== groupIdx) return g;
        return {
          ...g,
          conditions: g.conditions.map((c, j) => (j === condIdx ? { ...c, ...patch } : c)),
        };
      }),
    }));
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    const colorMap: { [key: string]: string } = {
      PLACED: "bg-blue-500/15 text-blue-300 border-blue-500/25",
      PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/25",
      CONFIRMED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
      OPEN: "bg-blue-500/15 text-blue-300 border-blue-500/25",
      CONSOLIDATING: "bg-amber-500/15 text-amber-300 border-amber-500/25",
      SHIPPED: "bg-violet-500/15 text-violet-300 border-violet-500/25",
      DELIVERED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
      CANCELLED: "bg-red-500/15 text-red-300 border-red-500/25",
    };

    return (
      <span
        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${
          colorMap[statusUpper] ||
          "bg-zinc-800 text-zinc-300 border-[#1F1F23]"
        }`}
      >
        {status}
      </span>
    );
  };

  const getPaymentBadge = (status: string) => {
    const s = status.toLowerCase();
    if (/fail|declin|cancel|void/.test(s)) {
      return (
        <span className="inline-flex rounded-full border border-red-500/25 bg-red-500/15 px-2 py-0.5 text-[11px] font-medium text-red-300">
          Failed
        </span>
      );
    }
    if (
      /pending_payment|placed|pending_producer|partly_approved|approved/.test(
        s,
      )
    ) {
      return (
        <span className="inline-flex rounded-full border border-amber-500/25 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
          Pending
        </span>
      );
    }
    if (/confirm|paid|complete|deliver|ship/.test(s)) {
      return (
        <span className="inline-flex rounded-full border border-emerald-500/25 bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-300">
          Paid
        </span>
      );
    }
    return (
      <span className="inline-flex rounded-full border border-[#1F1F23] bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-400">
        —
      </span>
    );
  };

  const palletStatusAllowsOrderShipping = () => {
    const raw = palletStatus;
    const s =
      raw !== null && raw !== undefined ? String(raw).toLowerCase() : "";
    const bottles =
      operatingSummary?.bottlesFilled ?? stats?.total_bottles ?? 0;
    return (
      (s === "open" || s === "consolidating") && bottles > 0
    );
  };

  const handleTriggerNotifications = async () => {
    if (
      !window.confirm(
        "Send payment notifications to all customers on this pallet?",
      )
    )
      return;
    setSendingNotifications(true);
    try {
      const res = await fetch(
        `/api/admin/pallets/${pallet.id}/trigger-notifications`,
        { method: "POST" },
      );
      const data = await res.json();
      if (data.success) {
        alert("Payment notifications sent successfully.");
      } else {
        alert(`Failed: ${data.error}`);
      }
    } catch {
      alert("Network error — notifications not sent.");
    } finally {
      setSendingNotifications(false);
    }
  };

  const handleOrderShipping = async () => {
    const confirmed = window.confirm(
      "Are you sure? This will charge all customers with saved cards on this pallet. This cannot be undone.",
    );
    if (!confirmed) return;
    setOrderingShipping(true);
    try {
      const res = await fetch(
        `/api/admin/pallets/${palletId}/order-shipping`,
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
      toast.success("Shipping ordered. Customers are being charged.");
      await fetchPalletData();
    } catch {
      toast.error("Request failed");
    } finally {
      setOrderingShipping(false);
    }
  };

  const palletStatusIsShippingOrdered =
    String(palletStatus).toLowerCase() === "shipping_ordered";

  const handleRevertShipping = async () => {
    const confirmed = window.confirm(
      "Revert shipping order? The pallet will return to open status.",
    );
    if (!confirmed) return;
    setRevertingShipping(true);
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
      setPalletStatus("open");
      router.refresh();
      await fetchPalletData();
    } catch {
      toast.error("Request failed");
    } finally {
      setRevertingShipping(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-10 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-gray-200 dark:bg-zinc-800" />
          <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-zinc-800" />
          <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-zinc-800" />
        </div>
      </div>
    );
  }

  const palletExt = pallet as {
    shipping_region?: { name: string } | null;
    current_pickup_producer?: { name: string } | null;
    shipping_ordered_at?: string | null;
  };
  const shipsFromName = palletExt.current_pickup_producer?.name ?? null;
  const shippingOrderedAt = palletExt.shipping_ordered_at;
  const regionMeta =
    palletExt.shipping_region?.name ?? pallet.pickup_zone?.name ?? "—";
  const deliveryName = pallet.delivery_zone?.name ?? "—";
  const bottlesFilled =
    operatingSummary?.bottlesFilled ?? stats?.total_bottles ?? 0;
  const minToShip =
    operatingSummary?.minBottlesToShip ??
    pallet.min_bottles_to_complete ??
    120;
  const shipPct = operatingSummary?.shipProgressPercent ?? 0;
  const isReady = operatingSummary?.isReadyToShip ?? false;
  const showMissingPalletZonePickupMessage =
    !shipsFromName && bottlesFilled > 0;
  const warnings = [
    ...(operatingSummary?.warnings ?? []),
    ...(showMissingPalletZonePickupMessage
      ? [
          "No producer marked as pallet zone has orders on this pallet yet.",
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      {error ? (
        <Alert
          variant="destructive"
          className="border-red-500/30 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <header className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-8 gap-2 px-2 text-sm font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
            >
              <Link href="/admin/pallets?tab=pact">
                <ArrowLeft className="h-4 w-4 shrink-0" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {pallet.name}
            </h1>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              <span className="font-medium text-gray-800 dark:text-zinc-200">
                {deliveryName}
              </span>
              <span className="mx-1.5 text-gray-400">→</span>
              <span className="font-medium text-gray-800 dark:text-zinc-200">
                {regionMeta}
              </span>
            </p>
            <p className="text-sm text-gray-500 dark:text-zinc-500 tabular-nums">
              {bottlesFilled} bottles · {shipPct}% to ship-ready
              <span className="mx-2 text-gray-300 dark:text-zinc-700">·</span>
              Operational status:{" "}
              <span className="capitalize text-gray-700 dark:text-zinc-300">
                {(palletStatus || "open").replace(/_/g, " ")}
              </span>
              {isReady ? (
                <span className="ml-2 inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-emerald-700 dark:text-emerald-300">
                  Ready to ship
                </span>
              ) : (
                <span className="ml-2 inline-flex rounded-full bg-zinc-500/10 px-2 py-0.5 text-[10px] font-medium uppercase text-zinc-600 dark:text-zinc-400">
                  Not ready
                </span>
              )}
            </p>
            {shipsFromName ? (
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                Ships from{" "}
                <span className="font-medium text-gray-800 dark:text-zinc-200">
                  {shipsFromName}
                </span>
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-gray-200 dark:border-zinc-700"
            >
              <Link href={`/admin/pallets/${palletId}/edit`}>
                <Edit className="mr-2 h-3.5 w-3.5" />
                Edit pallet
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg border-gray-200 dark:border-zinc-700"
              onClick={() => void handleTriggerNotifications()}
              disabled={sendingNotifications}
            >
              {sendingNotifications
                ? "Sending..."
                : "Send payment notifications"}
            </Button>
            {palletStatusAllowsOrderShipping() ? (
              <Button
                type="button"
                size="sm"
                disabled={orderingShipping}
                onClick={() => void handleOrderShipping()}
                className="h-9 shrink-0 bg-amber-600 text-xs font-medium text-white hover:bg-amber-500"
              >
                {orderingShipping ? "Ordering…" : "Order Shipping"}
              </Button>
            ) : null}
            {palletStatusIsShippingOrdered ? (
              <button
                type="button"
                disabled={revertingShipping}
                onClick={() => void handleRevertShipping()}
                className="text-xs text-amber-600 underline underline-offset-2 hover:text-amber-500 disabled:opacity-50 dark:text-amber-500"
              >
                Revert to open
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {operatingSummary ? (
        <AdminPactPalletStatusSummary summary={operatingSummary} />
      ) : null}

      {warnings.length > 0 ? (
        <section className="rounded-xl border border-amber-500/30 bg-amber-50/80 p-4 dark:bg-amber-500/10">
          <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
            Attention
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-amber-800 dark:text-amber-200/90">
            {Array.from(new Set(warnings)).map((w) => (
              <li key={w}>⚠ {w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Inbound logistics
        </h2>
        <PalletInboundFreightPanel palletId={palletId} />
      </section>

      {/* Reservations */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-200 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-200 dark:border-[#1F1F23] px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Reservations ({reservations.length})
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                Display list of customer reservations. Ship readiness uses
                canonical fill statuses from the operating summary — not a raw
                sum of this table.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  disabled={resettingReservations || reservations.length === 0}
                >
                  {resettingReservations ? "Resetting..." : "Reset reservations"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Reset all reservations?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all reservations currently mapped
                    to this pallet (including their line items and tracking rows).
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={resetAllReservations}
                    className="bg-red-600 hover:bg-red-700"
                    disabled={resettingReservations}
                  >
                    {resettingReservations ? "Resetting..." : "Reset"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        <div className="px-2 pb-2">
          {reservations.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500">
              No reservations yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-[#1F1F23]">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Wines
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Bottles
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Payment
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="border-b border-gray-200 dark:border-[#1F1F23] text-sm text-zinc-300 hover:bg-[#0F0F12]/50"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-zinc-100">
                            {reservation.user_name || "Unknown"}
                          </div>
                          <div className="text-xs text-zinc-500">
                            {reservation.user_email}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[200px] px-4 py-3 text-xs text-zinc-400">
                        {reservation.items
                          .map((it) => `${it.wine_name} ×${it.quantity}`)
                          .join(", ")}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                        {reservation.total_bottles}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(reservation.status)}
                      </td>
                      <td className="px-4 py-3">
                        {getPaymentBadge(reservation.status)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-500">
                        {new Date(reservation.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Link href={`/admin/b2c-orders/${reservation.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-xs text-zinc-400 hover:text-gray-900 dark:text-zinc-100"
                            >
                              View
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-xs text-zinc-500 hover:bg-red-500/10 hover:text-red-400"
                                disabled={deletingReservationId === reservation.id}
                              >
                                {deletingReservationId === reservation.id ? "Deleting..." : "Delete"}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete reservation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this reservation and its line items.
                                  This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteReservation(reservation.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                  disabled={deletingReservationId === reservation.id}
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12] px-5 py-5">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
          Wine allocation
        </h2>
        {reservations.length === 0 ? (
          <p className="text-sm text-zinc-500">No wines yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1F1F23]">
                  <th className="py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Wine name
                  </th>
                  <th className="py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Producer
                  </th>
                  <th className="py-2 pr-4 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    Bottles
                  </th>
                  <th className="py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500">
                    % of physical pallet
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from(
                  reservations
                    .flatMap((r) => r.items)
                    .reduce((acc, item) => {
                      const key = `${item.producer_name}-${item.wine_name}`;
                      if (!acc.has(key)) {
                        acc.set(key, {
                          producer: item.producer_name,
                          wine: item.wine_name,
                          quantity: 0,
                          price: item.price_cents,
                        });
                      }
                      const existing = acc.get(key)!;
                      existing.quantity += item.quantity;
                      return acc;
                    }, new Map())
                    .values(),
                )
                  .sort((a, b) => b.quantity - a.quantity)
                  .map((wine, idx) => {
                    const cap = pallet.bottle_capacity || 1;
                    const pct = Math.round((wine.quantity / cap) * 1000) / 10;
                    return (
                      <tr
                        key={idx}
                        className="border-b border-[#1F1F23] text-zinc-300 last:border-0"
                      >
                        <td className="py-2 pr-4 font-medium text-zinc-100">
                          {wine.wine}
                        </td>
                        <td className="py-2 pr-4 text-zinc-400">{wine.producer}</td>
                        <td className="py-2 pr-4 tabular-nums text-zinc-200">
                          {wine.quantity}
                        </td>
                        <td className="py-2 tabular-nums text-zinc-500">
                          {pct}%
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Outbound economics
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
          Instabee / Budbee Light — improves contribution inputs only; does not
          control live readiness.
        </p>
        {operatingSummary ? (
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-500">Provider</dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
                {operatingSummary.outbound.providerName ?? "Instabee"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-500">Service</dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
                {operatingSummary.outbound.serviceName ??
                  "Budbee Light Home Delivery – Sweden"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-500">
                Packaging profile
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
                {operatingSummary.outbound.packagingCode ?? "WINE_BOX_6"}
                {" · "}
                {operatingSummary.outbound.packagingConfigured
                  ? "Configured"
                  : "Incomplete"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-500">
                Quote health
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
                {operatingSummary.outbound.usableQuoteCount} usable
                {operatingSummary.outbound.incompleteQuoteCount > 0
                  ? ` · ${operatingSummary.outbound.incompleteQuoteCount} incomplete`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-500">
                Rate valid to
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
                {operatingSummary.outbound.rateValidTo ?? "No active rate"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500 dark:text-zinc-500">
                Volumetric factor provenance
              </dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
                {operatingSummary.outbound.volumetricFactorProvenance}
                {" · not verified for Home"}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-gray-500">Loading outbound summary…</p>
        )}
        {operatingSummary && !operatingSummary.outbound.packagingConfigured ? (
          <p className="mt-3 rounded-lg border border-amber-500/25 bg-amber-50/70 px-3 py-2 text-xs text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
            Outbound pricing incomplete (
            {operatingSummary.outbound.primaryIncompleteReason ??
              "MISSING_PACKAGING_DIMENSIONS"}
            ) — WINE_BOX_6 outer dimensions/tare are not configured from an
            authoritative source. Do not treat missing carrier cost as 0 SEK.
          </p>
        ) : null}
      </section>


      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          Operational status
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
          Separate from ship readiness ({minToShip} bottles). Status string{" "}
          <code className="text-[11px]">complete</code> is not the same as live{" "}
          <code className="text-[11px]">is_complete</code> / ready-to-ship.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs text-gray-500 dark:text-zinc-500">Auto</span>
          <Switch
            checked={palletStatusMode === "manual"}
            onCheckedChange={(checked) =>
              void savePalletStatusMode(checked ? "manual" : "auto")
            }
            disabled={savingStatus}
          />
          <span className="text-xs text-gray-500 dark:text-zinc-500">Manual</span>
          <Select
            value={palletStatus}
            onValueChange={(v) => void savePalletStatus(v)}
            disabled={savingStatus || palletStatusMode !== "manual"}
          >
            <SelectTrigger className="h-8 w-[200px] border-gray-200 bg-white text-xs dark:border-zinc-700 dark:bg-zinc-900">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">open</SelectItem>
              <SelectItem value="consolidating">consolidating</SelectItem>
              <SelectItem value="complete">complete (legacy label)</SelectItem>
              <SelectItem value="shipping_ordered">shipping_ordered</SelectItem>
              <SelectItem value="awaiting_pickup">awaiting_pickup</SelectItem>
              <SelectItem value="picked_up">picked_up</SelectItem>
              <SelectItem value="in_transit">in_transit</SelectItem>
              <SelectItem value="out_for_delivery">out_for_delivery</SelectItem>
              <SelectItem value="delivered">delivered</SelectItem>
              <SelectItem value="cancelled">cancelled</SelectItem>
            </SelectContent>
          </Select>
          {savingStatus ? (
            <span className="text-xs text-gray-500">Saving…</span>
          ) : null}
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-gray-500 dark:text-zinc-500">Region</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
              {regionMeta}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-zinc-500">Delivery</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
              {deliveryName}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-zinc-500">Ships from</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
              {shipsFromName && shipsFromName.length > 0
                ? shipsFromName
                : showMissingPalletZonePickupMessage
                  ? "—"
                  : "Not determined"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-zinc-500">
              Shipping ordered
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
              {shippingOrderedAt
                ? format(new Date(shippingOrderedAt), "PPp")
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-zinc-500">
              Customers / revenue (display)
            </dt>
            <dd className="mt-0.5 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
              {stats?.unique_users ?? 0} ·{" "}
              {formatCurrency((stats?.total_revenue_cents ?? 0) / 100)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500 dark:text-zinc-500">Created</dt>
            <dd className="mt-0.5 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
              {new Date(pallet.created_at).toLocaleDateString()}
            </dd>
          </div>
        </dl>
      </section>

      <section className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-5 dark:border-zinc-700 dark:bg-zinc-900/30">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 text-left"
          onClick={() => setAdvancedOpen((v) => !v)}
          aria-expanded={advancedOpen}
        >
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
              Advanced / legacy settings
            </h2>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-500">
              Legacy freight estimate, last-mile assumption, and custom completion
              rules. Live PACT readiness uses min_bottles_to_complete.
            </p>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-gray-500 transition-transform",
              advancedOpen && "rotate-180",
            )}
          />
        </button>
        {advancedOpen ? (
          <div className="mt-4 space-y-6">
            <dl className="grid gap-3 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-xs text-gray-500 dark:text-zinc-500">
                  Legacy pallet freight estimate (cost_cents)
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                  {formatCurrency(pallet.cost_cents / 100)}
                </dd>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Fallback only — not used when a selected inbound quote or manual
                  freight_target_cents exists.
                </p>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-zinc-500">
                  Legacy last-mile (last_mile_cost_cents_per_bottle)
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                  {pallet.last_mile_cost_cents_per_bottle != null
                    ? `${(pallet.last_mile_cost_cents_per_bottle / 100).toFixed(2)} SEK / bottle`
                    : "—"}
                </dd>
                <p className="mt-0.5 text-[11px] text-gray-500">
                  Fallback for historical/incomplete outbound economics.
                </p>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-zinc-500">
                  Status mode
                </dt>
                <dd className="mt-0.5 font-medium text-gray-900 dark:text-zinc-100">
                  {palletStatusMode}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500 dark:text-zinc-500">
                  Physical capacity
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                  {pallet.bottle_capacity} bottles
                </dd>
              </div>
            </dl>
            <div>
              <p className="mb-2 text-xs text-gray-500 dark:text-zinc-500">
                Legacy/custom completion configuration. Live PACT readiness is
                currently controlled by min_bottles_to_complete ({minToShip}
                bottles). Profit conditions must not be treated as live readiness.
              </p>
      {/* Completion Rules (Klaviyo-like segment builder) */}
      <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-zinc-100">
              Completion rules
            </div>
            <div className="mt-1 text-sm text-zinc-500">
              {formatCompletionRules(rules)}
            </div>
            {metrics && (
              <div className="mt-2 text-xs text-zinc-500">
                Live metrics: Bottles={metrics.currentBottles}, Profit (SEK ex VAT)={metrics.profitSek}, Complete={String(metrics.isComplete)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-md border-[#1F1F23] bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
              onClick={addGroup}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add ELSE IF step
            </Button>
            <Button
              size="sm"
              className="rounded-md bg-zinc-100 text-xs text-zinc-900 hover:bg-zinc-200"
              onClick={saveRules}
              disabled={savingRules}
            >
              {savingRules ? "Saving..." : "Save rules"}
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="text-xs font-medium text-zinc-500">
            Priority order matters: first matching step wins. ELSE = Incomplete.
          </div>

          {(rules.groups || []).map((group, gi) => (
            <div
              key={gi}
              className={`rounded-xl border border-[#1F1F23] p-4 ${
                gi === 0 ? "bg-[#0F0F12]" : "bg-zinc-900/30"
              }`}
              draggable
              onDragStart={() => setDraggingGroupIndex(gi)}
              onDragEnd={() => setDraggingGroupIndex(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (draggingGroupIndex === null) return;
                if (draggingGroupIndex === gi) return;
                moveGroup(draggingGroupIndex, gi);
                setDraggingGroupIndex(null);
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="text-xs font-semibold text-zinc-100">
                      Step {gi + 1}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                      {stepLabel(gi)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-zinc-500">
                    <GripVertical className="w-4 h-4" />
                    <span className="text-xs">Drag to reorder</span>
                  </div>
                  <Select
                    value={group.operator}
                    onValueChange={(v) =>
                      setRules((r) => ({
                        ...r,
                        groups: r.groups.map((g, i) =>
                          i === gi ? { ...g, operator: v as "AND" | "OR" } : g,
                        ),
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 w-28 border-[#1F1F23] bg-zinc-900 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-zinc-500">between conditions</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md border-[#1F1F23] bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
                    onClick={() => addCondition(gi)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add condition
                  </Button>
                  {gi > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md border-[#1F1F23] bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
                      onClick={() => moveGroup(gi, gi - 1)}
                      title="Move up"
                    >
                      ↑
                    </Button>
                  )}
                  {gi < rules.groups.length - 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md border-[#1F1F23] bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
                      onClick={() => moveGroup(gi, gi + 1)}
                      title="Move down"
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-md border-[#1F1F23] bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
                    onClick={() => removeGroup(gi)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(group.conditions || []).length === 0 ? (
                  <div className="text-sm text-zinc-500">No conditions yet.</div>
                ) : (
                  group.conditions.map((c, ci) => (
                    <div
                      key={ci}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                    >
                      <div className="md:col-span-4 space-y-2">
                        <div className="text-xs text-zinc-500">Metric</div>
                        <Select
                          value={c.metric}
                          onValueChange={(v) =>
                            updateCondition(gi, ci, { metric: v as any })
                          }
                        >
                          <SelectTrigger className="h-8 border-[#1F1F23] bg-zinc-900 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bottles">Bottles</SelectItem>
                            <SelectItem value="profit_sek">
                              Profit (SEK ex VAT)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <div className="text-xs text-zinc-500">Operator</div>
                        <Select
                          value={c.op}
                          onValueChange={(v) =>
                            updateCondition(gi, ci, { op: v as any })
                          }
                        >
                          <SelectTrigger className="h-8 border-[#1F1F23] bg-zinc-900 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value=">=">&ge;</SelectItem>
                            <SelectItem value=">">&gt;</SelectItem>
                            <SelectItem value="<=">&le;</SelectItem>
                            <SelectItem value="<">&lt;</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="md:col-span-4 space-y-2">
                        <div className="text-xs text-zinc-500">Value</div>
                        <Input
                          type="number"
                          className="no-spinner border-[#1F1F23] bg-zinc-900 text-zinc-100"
                          value={String(c.value ?? "")}
                          onChange={(e) =>
                            updateCondition(gi, ci, {
                              value: Number(e.target.value || 0),
                            })
                          }
                        />
                      </div>

                      <div className="md:col-span-2 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-md border-[#1F1F23] bg-transparent text-xs text-zinc-300 hover:bg-zinc-900"
                          onClick={() => removeCondition(gi, ci)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}

          <div className="rounded-xl border border-dashed border-[#1F1F23] bg-zinc-900/20 p-4">
            <div className="text-xs font-semibold text-zinc-200">ELSE</div>
            <div className="mt-1 text-sm text-zinc-500">
              Pallet is <span className="font-medium text-zinc-300">Incomplete</span>
            </div>
          </div>
        </div>
      </Card>


            </div>
            <div className="pt-2">
              <DeletePalletButton
                palletId={palletId}
                palletName={pallet.name}
                onDeleted={() => router.push("/admin/pallets?tab=pact")}
              />
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
