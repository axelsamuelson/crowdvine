"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Package,
  MapPin,
  Users,
  Wine,
  TrendingUp,
  Edit,
  Calendar,
  DollarSign,
  Box,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  getPercentFilled,
  shouldShowPercent,
} from "@/lib/utils/pallet-progress";
import {
  type CompletionRules,
  type CompletionGroup,
  type CompletionCondition,
  formatCompletionRules,
} from "@/lib/pallet-completion-rules";

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
    const existing = (pallet as any)?.completion_rules;
    return (
      existing || {
        mode: "SEQUENTIAL",
        groups: [
          {
            operator: "AND",
            conditions: [{ metric: "bottles", op: ">=", value: 720 }],
          },
        ],
      }
    );
  });
  const [savingRules, setSavingRules] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [palletStatus, setPalletStatus] = useState<string>(
    typeof (pallet as any)?.status === "string" ? (pallet as any).status : "open",
  );
  const [palletStatusMode, setPalletStatusMode] = useState<"auto" | "manual">(
    (pallet as any)?.status_mode === "manual" ? "manual" : "auto",
  );
  const [deletingReservationId, setDeletingReservationId] = useState<string | null>(null);
  const [resettingReservations, setResettingReservations] = useState(false);
  const [draggingGroupIndex, setDraggingGroupIndex] = useState<number | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchPalletData();
  }, [palletId]);

  const fetchPalletData = async () => {
    try {
      setLoading(true);

      // Fetch reservations for this pallet (admin endpoint)
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

      // Fetch pallet metrics (data-driven totals + profit) for rule preview
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

      // Calculate stats
      const uniqueUsers = new Set(
        reservationsList.map((r: Reservation) => r.user_email),
      ).size;
      const uniqueWines = new Set(
        reservationsList.flatMap((r: Reservation) =>
          r.items.map((item) => `${item.producer_name}-${item.wine_name}`),
        ),
      ).size;

      const totalBottles = reservationsList.reduce(
        (sum: number, r: Reservation) => sum + r.total_bottles,
        0,
      );

      const totalRevenue = reservationsList.reduce(
        (sum: number, r: Reservation) => sum + r.total_cost_cents,
        0,
      );

      const percentageFilled =
        pallet.bottle_capacity > 0
          ? Math.min(
              Math.round((totalBottles / pallet.bottle_capacity) * 100),
              100,
            )
          : 0;

      setStats({
        total_reservations: reservationsList.length,
        total_bottles: totalBottles,
        total_revenue_cents: totalRevenue,
        unique_users: uniqueUsers,
        unique_wines: uniqueWines,
        percentage_filled: percentageFilled,
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
      PLACED: "bg-blue-100 text-blue-700",
      PENDING: "bg-yellow-100 text-yellow-700",
      CONFIRMED: "bg-green-100 text-green-700",
      OPEN: "bg-blue-100 text-blue-700",
      CONSOLIDATING: "bg-orange-100 text-orange-700",
      SHIPPED: "bg-purple-100 text-purple-700",
      DELIVERED: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
    };

    return (
      <Badge
        className={`${colorMap[statusUpper] || "bg-gray-100 text-gray-700"} border-0`}
      >
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pallet.name}</h1>
          {pallet.description && (
            <p className="text-muted-foreground mt-2">{pallet.description}</p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <div className="text-xs font-medium text-gray-500">Pallet status</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Auto</span>
              <Switch
                checked={palletStatusMode === "manual"}
                onCheckedChange={(checked) =>
                  void savePalletStatusMode(checked ? "manual" : "auto")
                }
                disabled={savingStatus}
              />
              <span className="text-xs text-gray-500">Manual</span>
            </div>
            <Select
              value={palletStatus}
              onValueChange={(v) => void savePalletStatus(v)}
              disabled={savingStatus || palletStatusMode !== "manual"}
            >
              <SelectTrigger className="h-9 w-[240px] rounded-full">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">open</SelectItem>
                <SelectItem value="consolidating">consolidating</SelectItem>
                <SelectItem value="complete">complete</SelectItem>
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
        </div>
        <Button onClick={() => router.push(`/admin/pallets/${palletId}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Pallet
        </Button>
      </div>

      {/* Completion Rules (Klaviyo-like segment builder) */}
      <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-gray-900">
              Completion rules
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {formatCompletionRules(rules)}
            </div>
            {metrics && (
              <div className="text-xs text-gray-500 mt-2">
                Live metrics: Bottles={metrics.currentBottles}, Profit (SEK ex VAT)={metrics.profitSek}, Complete={String(metrics.isComplete)}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={addGroup}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add ELSE IF step
            </Button>
            <Button
              size="sm"
              className="bg-black hover:bg-black/90 text-white rounded-full"
              onClick={saveRules}
              disabled={savingRules}
            >
              {savingRules ? "Saving..." : "Save rules"}
            </Button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          <div className="text-xs font-medium text-gray-500">
            Priority order matters: first matching step wins. ELSE = Incomplete.
          </div>

          {(rules.groups || []).map((group, gi) => (
            <div
              key={gi}
              className={`rounded-2xl border border-gray-200 p-4 ${
                gi === 0 ? "bg-white" : "bg-gray-50"
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
                    <div className="text-xs font-semibold text-gray-900">
                      Step {gi + 1}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-gray-500">
                      {stepLabel(gi)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-400">
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
                    <SelectTrigger className="w-28 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AND">AND</SelectItem>
                      <SelectItem value="OR">OR</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-gray-500">between conditions</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => addCondition(gi)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add condition
                  </Button>
                  {gi > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full"
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
                      className="rounded-full"
                      onClick={() => moveGroup(gi, gi + 1)}
                      title="Move down"
                    >
                      ↓
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => removeGroup(gi)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {(group.conditions || []).length === 0 ? (
                  <div className="text-sm text-gray-500">No conditions yet.</div>
                ) : (
                  group.conditions.map((c, ci) => (
                    <div
                      key={ci}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                    >
                      <div className="md:col-span-4 space-y-2">
                        <div className="text-xs text-gray-500">Metric</div>
                        <Select
                          value={c.metric}
                          onValueChange={(v) =>
                            updateCondition(gi, ci, { metric: v as any })
                          }
                        >
                          <SelectTrigger className="bg-white">
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
                        <div className="text-xs text-gray-500">Operator</div>
                        <Select
                          value={c.op}
                          onValueChange={(v) =>
                            updateCondition(gi, ci, { op: v as any })
                          }
                        >
                          <SelectTrigger className="bg-white">
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
                        <div className="text-xs text-gray-500">Value</div>
                        <Input
                          type="number"
                          className="no-spinner bg-white"
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
                          className="rounded-full"
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

          <div className="rounded-2xl border border-dashed border-gray-200 p-4 bg-white">
            <div className="text-xs font-semibold text-gray-900">ELSE</div>
            <div className="text-sm text-gray-600 mt-1">
              Pallet is <span className="font-medium">Incomplete</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fill Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {stats.percentage_filled}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total_bottles} / {pallet.bottle_capacity} bottles
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.total_revenue_cents / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total_reservations} reservations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.unique_users}</div>
                  <p className="text-xs text-muted-foreground">
                    unique customers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wine Varieties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Wine className="w-8 h-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.unique_wines}</div>
                  <p className="text-xs text-muted-foreground">
                    different wines
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pallet Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Zones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Pickup Zone
              </div>
              <div className="text-base">
                {pallet.pickup_zone?.name || "Not set"}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Delivery Zone
              </div>
              <div className="text-base">
                {pallet.delivery_zone?.name || "Not set"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              Pallet Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Transport Cost
              </div>
              <div className="text-base font-semibold">
                {formatCurrency(pallet.cost_cents / 100)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Capacity
              </div>
              <div className="text-base">{pallet.bottle_capacity} bottles</div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">
                Created
              </div>
              <div className="text-base">
                {new Date(pallet.created_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle>Reservations ({reservations.length})</CardTitle>
              <CardDescription>
                All customer reservations for this pallet
              </CardDescription>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full"
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
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reservations yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">
                      Order ID
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm">
                      Customer
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm">
                      Bottles
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm">
                      Total
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-sm">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr
                      key={reservation.id}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="py-3 px-4 text-sm font-mono">
                        {reservation.order_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>
                          <div className="font-medium">
                            {reservation.user_name || "Unknown"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {reservation.user_email}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getStatusBadge(reservation.status)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {reservation.total_bottles}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {formatCurrency(reservation.total_cost_cents / 100)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(reservation.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link href={`/admin/reservations/${reservation.id}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
        </CardContent>
      </Card>

      {/* Wines Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Wines on Pallet</CardTitle>
          <CardDescription>
            Breakdown of all wines reserved for this pallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No wines yet
            </div>
          ) : (
            <div className="space-y-3">
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
                .map((wine, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <Wine className="w-5 h-5 text-red-600" />
                      <div>
                        <div className="font-medium">{wine.wine}</div>
                        <div className="text-sm text-muted-foreground">
                          {wine.producer}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {wine.quantity} bottles
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatCurrency(wine.price / 100)} each
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
