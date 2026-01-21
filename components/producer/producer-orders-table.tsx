"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { Fragment } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type ProducerOrder = {
  id: string;
  created_at: string;
  status: string;
  payment_status?: string | null;
  payment_deadline?: string | null;
  producer_approved_at?: string | null;
  producer_rejected_at?: string | null;
  producer_decision_note?: string | null;
  profiles?: { email?: string | null; full_name?: string | null } | null;
  user_addresses?: {
    address_city?: string | null;
    address_postcode?: string | null;
    country_code?: string | null;
  } | null;
  order_reservation_items?: Array<{
    id: string;
    quantity: number;
    producer_decision_status?: string | null;
    producer_approved_quantity?: number | null;
    wines?: { wine_name?: string | null; vintage?: string | null } | null;
  }> | null;
};

function formatDate(dateString: string) {
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function statusBadge(status: string) {
  const s = String(status || "");
  if (s === "pending_producer_approval") {
    return <Badge className="bg-amber-100 text-amber-900 border border-amber-200">Pending</Badge>;
  }
  if (s === "approved" || s === "placed") {
    return <Badge variant="outline">Approved</Badge>;
  }
  if (s === "partly_approved") {
    return <Badge className="bg-amber-100 text-amber-900 border border-amber-200">Partly approved</Badge>;
  }
  if (s === "declined" || s === "rejected") {
    return <Badge className="bg-red-100 text-red-900 border border-red-200">Declined</Badge>;
  }
  if (s === "pending_payment") {
    return <Badge className="bg-blue-100 text-blue-900 border border-blue-200">Payment pending</Badge>;
  }
  if (s === "confirmed") {
    return <Badge className="bg-emerald-100 text-emerald-900 border border-emerald-200">Paid</Badge>;
  }
  return <Badge variant="secondary">{s || "—"}</Badge>;
}

export function ProducerOrdersTable({
  limit,
  showAllLink = true,
  asCard = true,
  showHeader = true,
}: {
  limit?: number;
  showAllLink?: boolean;
  asCard?: boolean;
  showHeader?: boolean;
}) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<ProducerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);
  const [reviewOrder, setReviewOrder] = useState<ProducerOrder | null>(null);
  const [draft, setDraft] = useState<
    Record<
      string,
      {
        decision: "approved" | "declined";
        approvedQuantity: number;
        max: number;
      }
    >
  >({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/producer/orders", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || "Failed to load orders");
      }
      setOrders(Array.isArray(json?.orders) ? json.orders : []);
    } catch (e: any) {
      toast({
        title: "Could not load orders",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openReview = (o: ProducerOrder) => {
    const nextDraft: any = {};
    (o.order_reservation_items || []).forEach((it) => {
      const max = Number(it.quantity) || 0;
      const existingQty =
        it.producer_approved_quantity === null || it.producer_approved_quantity === undefined
          ? max
          : Number(it.producer_approved_quantity) || 0;
      const existingDecision =
        String(it.producer_decision_status || "pending") === "declined"
          ? "declined"
          : "approved";
      nextDraft[it.id] = {
        decision: existingDecision,
        approvedQuantity: existingDecision === "declined" ? 0 : Math.min(max, Math.max(0, existingQty)),
        max,
      };
    });
    setDraft(nextDraft);
    setReviewOrder(o);
  };

  const submitDecisions = async () => {
    if (!reviewOrder) return;
    setActingOn(reviewOrder.id);
    try {
      const items = Object.entries(draft).map(([orderItemId, v]) => ({
        orderItemId,
        decision: v.decision,
        approvedQuantity: v.decision === "declined" ? 0 : v.approvedQuantity,
      }));
      const res = await fetch(`/api/producer/orders/${reviewOrder.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to save decisions");
      toast({ title: "Order updated" });
      setReviewOrder(null);
      await load();
    } catch (e: any) {
      toast({
        title: "Could not update order",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActingOn(null);
    }
  };

  const approveAllAndClose = async () => {
    if (!reviewOrder) return;
    setActingOn(reviewOrder.id);
    try {
      const items = (reviewOrder.order_reservation_items || []).map((it) => ({
        orderItemId: it.id,
        decision: "approved" as const,
        approvedQuantity: Number(it.quantity) || 0,
      }));
      const res = await fetch(`/api/producer/orders/${reviewOrder.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to approve order");
      toast({ title: "Order approved" });
      setReviewOrder(null);
      await load();
    } catch (e: any) {
      toast({
        title: "Could not approve order",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActingOn(null);
    }
  };

  const declineAllAndClose = async () => {
    if (!reviewOrder) return;
    setActingOn(reviewOrder.id);
    try {
      const items = (reviewOrder.order_reservation_items || []).map((it) => ({
        orderItemId: it.id,
        decision: "declined" as const,
        approvedQuantity: 0,
      }));
      const res = await fetch(`/api/producer/orders/${reviewOrder.id}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to decline order");
      toast({ title: "Order declined" });
      setReviewOrder(null);
      await load();
    } catch (e: any) {
      toast({
        title: "Could not decline order",
        description: e?.message || "Unknown error",
        variant: "destructive",
      });
    } finally {
      setActingOn(null);
    }
  };

  const visibleOrders = useMemo(() => {
    const list = orders || [];
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }, [orders, limit]);

  const Wrapper: any = asCard ? Card : Fragment;
  const wrapperProps = asCard
    ? { className: "p-6 bg-white border border-gray-200 rounded-2xl" }
    : {};

  return (
    <Wrapper {...wrapperProps}>
      {showHeader && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-medium text-gray-900">Orders</div>
            <div className="text-sm text-gray-500">
              Approve reservations before they can move forward to payment.
            </div>
          </div>
          {showAllLink && (
            <Link href="/producer/orders">
              <Button variant="outline" className="rounded-full">
                View all
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className={`${showHeader ? "mt-4 " : ""}overflow-x-auto`}>
        <Table className="w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead className="text-right">Bottles</TableHead>
              <TableHead>Wines</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-gray-500">
                  Loading…
                </TableCell>
              </TableRow>
            ) : visibleOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-sm text-gray-500">
                  No orders yet.
                </TableCell>
              </TableRow>
            ) : (
              visibleOrders.map((o) => {
                const bottles =
                  o.order_reservation_items?.reduce(
                    (sum, it) => sum + (Number(it.quantity) || 0),
                    0,
                  ) || 0;
                const wines =
                  o.order_reservation_items
                    ?.map((it) => {
                      const name = it?.wines?.wine_name || "Wine";
                      const v = it?.wines?.vintage;
                      return v ? `${name} (${v})` : name;
                    })
                    .filter(Boolean) || [];

                const customer =
                  o.profiles?.full_name ||
                  o.profiles?.email ||
                  "—";

                return (
                  <TableRow key={o.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(o.created_at)}</TableCell>
                    <TableCell className="max-w-[240px] truncate">{customer}</TableCell>
                    <TableCell className="text-right tabular-nums">{bottles}</TableCell>
                    <TableCell className="max-w-[420px] truncate">
                      {wines.length > 0 ? wines.join(", ") : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(o.status)}</TableCell>
                    <TableCell className="text-sm text-gray-700">
                      {o.payment_status || "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        className="rounded-full"
                        size="sm"
                        disabled={actingOn === o.id}
                        onClick={() => openReview(o)}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={Boolean(reviewOrder)} onOpenChange={(open) => (!open ? setReviewOrder(null) : null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Review order</DialogTitle>
          </DialogHeader>

          {reviewOrder ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-gray-600">
                  Approve or decline each wine line. You can also approve a partial quantity.
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => void declineAllAndClose()}
                    disabled={actingOn === reviewOrder.id}
                  >
                    Decline order
                  </Button>
                  <Button
                    type="button"
                    className="bg-black hover:bg-black/90 text-white rounded-full"
                    onClick={() => void approveAllAndClose()}
                    disabled={actingOn === reviewOrder.id}
                  >
                    Approve order
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead>Wine</TableHead>
                      <TableHead className="text-right">Requested</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead className="text-right">Approved qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(reviewOrder.order_reservation_items || []).map((it) => {
                      const d = draft[it.id];
                      const max = d?.max ?? Number(it.quantity) ?? 0;
                      const wineName = it.wines?.wine_name || "Wine";
                      const vintage = it.wines?.vintage;
                      return (
                        <TableRow key={it.id}>
                          <TableCell className="font-medium text-gray-900">
                            {vintage ? `${wineName} (${vintage})` : wineName}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{max}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                className={`rounded-full ${d?.decision === "approved" ? "bg-black text-white hover:bg-black/90" : "bg-transparent"}`}
                                variant={d?.decision === "approved" ? "default" : "outline"}
                                onClick={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [it.id]: { ...prev[it.id], decision: "approved" },
                                  }))
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="rounded-full"
                                variant={d?.decision === "declined" ? "default" : "outline"}
                                onClick={() =>
                                  setDraft((prev) => ({
                                    ...prev,
                                    [it.id]: { ...prev[it.id], decision: "declined", approvedQuantity: 0 },
                                  }))
                                }
                              >
                                Decline
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Input
                              type="number"
                              className="no-spinner w-28 text-right"
                              min={0}
                              max={max}
                              disabled={d?.decision === "declined"}
                              value={d?.decision === "declined" ? 0 : d?.approvedQuantity ?? 0}
                              onChange={(e) => {
                                const next = Math.floor(Number(e.target.value) || 0);
                                setDraft((prev) => ({
                                  ...prev,
                                  [it.id]: {
                                    ...prev[it.id],
                                    approvedQuantity: Math.min(max, Math.max(0, next)),
                                  },
                                }));
                              }}
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setReviewOrder(null)}
                  disabled={actingOn === reviewOrder.id}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="bg-black hover:bg-black/90 text-white rounded-full"
                  onClick={() => void submitDecisions()}
                  disabled={actingOn === reviewOrder.id}
                >
                  Save
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Wrapper>
  );
}

