"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Package,
  Wine,
  ArrowLeft,
  Calendar,
  MapPin,
  Truck,
  CreditCard,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";

interface Reservation {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  pallet_id?: string;
  pallet_name?: string;
  pallet_capacity?: number;
  pallet_is_complete?: boolean;
  pallet_status?: string | null;
  delivery_address?: string;
  total_cost_cents: number;
  payment_status?: string;
  payment_link?: string;
  payment_deadline?: string;
  items: Array<{
    wine_name: string;
    producer_name?: string | null;
    quantity: number;
    producer_decision_status?: string | null;
    producer_approved_quantity?: number | null;
    vintage: string;
    image_path?: string;
    grape_varieties?: string;
    color?: string;
    price_per_bottle_cents: number;
    total_cost_cents: number;
  }>;
}

interface AddressPalletData {
  addressPalletKey: string;
  palletId?: string | null;
  palletName: string;
  palletStatus?: string | null;
  deliveryAddress: string;
  wines: Array<{
    wine_name: string;
    producer_name?: string | null;
    vintage: string;
    totalQuantity: number;
    approvedQuantity?: number;
    hasPendingApproval?: boolean;
    image_path?: string;
    grape_varieties?: string;
    color?: string;
    price_per_bottle_cents: number;
    total_cost_cents: number;
  }>;
  totalBottles: number;
  totalRequestedBottles?: number;
  palletCurrentBottles?: number;
  totalCostCents: number;
  orderCount: number;
  latestOrderDate: string;
  latestReservationStatus?: string;
  paymentStatus?: string;
  paymentLink?: string;
  paymentDeadline?: string;
  palletCapacity?: number;
  palletIsComplete?: boolean;
  producerItems?: Array<{
    wine_name: string;
    vintage: string;
    requested: number;
    approved: number | null;
    decision: string | null;
  }>;
}

function getProducerOutcome(status: string | undefined) {
  const s = String(status || "");
  if (s === "declined" || s === "rejected") return "Declined";
  if (s === "partly_approved") return "Partly approved";
  if (s === "approved" || s === "placed" || s === "pending_payment" || s === "confirmed")
    return "Approved";
  if (s === "pending_producer_approval") return "Pending";
  return "Pending";
}

function getSummaryStatus(group: AddressPalletData) {
  const reservationStatus = String(group.latestReservationStatus || "");
  const payment = String(group.paymentStatus || "");
  const palletStatusRaw = String(group.palletStatus || "");
  const palletStatus = palletStatusRaw.toLowerCase();
  const palletComplete =
    Boolean(group.palletIsComplete) ||
    palletStatus === "complete" ||
    palletStatus === "awaiting_pickup" ||
    palletStatus === "picked_up" ||
    palletStatus === "in_transit" ||
    palletStatus === "out_for_delivery" ||
    palletStatus === "shipped" ||
    palletStatus === "delivered";

  if (palletStatus === "delivered") return "Delivered";
  if (palletStatus === "out_for_delivery") return "Out for delivery";
  if (palletStatus === "in_transit" || palletStatus === "shipped") return "In transit";
  if (palletStatus === "picked_up") return "Picked up";
  if (palletStatus === "awaiting_pickup") return "Awaiting pickup";
  if (payment === "paid" || reservationStatus === "confirmed") return "Paid";
  if (reservationStatus === "pending_payment") return "Payment pending";
  if (palletComplete) return "Pallet complete";

  const producerOutcome = getProducerOutcome(reservationStatus);
  if (producerOutcome === "Pending") return "Awaiting producer approval";
  if (producerOutcome === "Declined") return "Declined";
  if (producerOutcome === "Partly approved") return "Partly approved";
  return "Pallet consolidating";
}

const timelineStatusConfig: Record<
  string,
  { icon: LucideIcon; containerClass: string; iconClass: string }
> = {
  "Reservation placed": {
    icon: Package,
    containerClass: "border border-border bg-background",
    iconClass: "text-muted-foreground",
  },
  "Awaiting producer approval": {
    icon: Clock,
    containerClass: "border border-amber-200 bg-amber-50",
    iconClass: "text-amber-700",
  },
  "Partly approved": {
    icon: CheckCircle2,
    containerClass: "border border-amber-200 bg-amber-50",
    iconClass: "text-amber-700",
  },
  Declined: {
    icon: Clock,
    containerClass: "border border-red-200 bg-red-50",
    iconClass: "text-red-700",
  },
  "Producer review": {
    icon: Clock,
    containerClass: "border border-amber-200 bg-amber-50",
    iconClass: "text-amber-700",
  },
  "Pallet consolidating": {
    icon: Package,
    containerClass: "border border-border bg-background",
    iconClass: "text-muted-foreground",
  },
  "Pallet complete": {
    icon: CheckCircle2,
    containerClass: "border border-border bg-background",
    iconClass: "text-muted-foreground",
  },
  "Awaiting pickup": {
    icon: Package,
    containerClass: "border border-border bg-background",
    iconClass: "text-muted-foreground",
  },
  "Payment pending": {
    icon: CreditCard,
    containerClass: "border border-primary/30 bg-primary/5",
    iconClass: "text-primary",
  },
  Paid: {
    icon: CheckCircle2,
    containerClass: "border border-border bg-background",
    iconClass: "text-muted-foreground",
  },
  "In transit": {
    icon: Truck,
    containerClass: "border border-primary/40 bg-primary/10",
    iconClass: "text-primary",
  },
  "Out for delivery": {
    icon: Truck,
    containerClass: "border border-primary/40 bg-primary/10",
    iconClass: "text-primary",
  },
  "Picked up": {
    icon: Package,
    containerClass: "border border-border bg-background",
    iconClass: "text-muted-foreground",
  },
  Shipped: {
    icon: Truck,
    containerClass: "border border-primary/40 bg-primary/10",
    iconClass: "text-primary",
  },
  Delivered: {
    icon: CheckCircle2,
    containerClass: "border border-success/40 bg-success/10",
    iconClass: "text-success",
  },
};

const timelineDefaultStatus = {
  icon: Clock,
  containerClass: "border border-border bg-background",
  iconClass: "text-muted-foreground",
};

// (legacy) completed status style for timeline icons – kept for reuse if needed
const timelineCompletedStatus = {
  icon: CheckCircle2,
  containerClass: "border border-success/40 bg-success/10",
  iconClass: "text-success",
};

const formatDate = (dateString: string) => {
  try {
    if (!dateString || typeof dateString !== "string") {
      return "Invalid Date";
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return "Invalid Date";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid Date";
  }
};

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
};

function PalletDialog({ group }: { group: AddressPalletData }) {
  const [open, setOpen] = useState(false);

  const primaryImage =
    group.wines.find((w) => w.image_path)?.image_path || "/placeholder.jpg";

  const copyPalletKey = () => {
    navigator.clipboard.writeText(group.addressPalletKey);
  };

  const summaryStatus = getSummaryStatus(group);
  const statusConfig = timelineStatusConfig[summaryStatus] ?? timelineDefaultStatus;
  const StatusIcon = statusConfig.icon;
  const progressBottles =
    group.palletCurrentBottles ?? group.totalBottles;
  const progressPercent =
    group.palletCapacity && group.palletCapacity > 0
      ? (progressBottles / group.palletCapacity) * 100
      : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card className="p-0 bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-sm transition-shadow cursor-pointer">
          <div className="relative w-full aspect-[16/10] bg-gray-100">
            <Image
              src={primaryImage}
              alt={group.palletName}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-base font-medium text-gray-900 truncate">
                  {group.palletName}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {group.deliveryAddress}
                </div>
              </div>
              <Badge variant="outline" className="shrink-0">
                {summaryStatus}
              </Badge>
            </div>

            {group.palletCapacity && group.palletCapacity > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {progressBottles} / {group.palletCapacity} bottles
                  </span>
                  <span className="tabular-nums">{Math.round(progressPercent)}%</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-2 bg-gray-900"
                    style={{ width: `${Math.min(100, progressPercent)}%` }}
                  />
                </div>
              </div>
            ) : null}

            <div className="text-sm text-gray-500">
              Your approved bottles:{" "}
              <span className="font-medium text-gray-900">{group.totalBottles}</span>
              {typeof group.totalRequestedBottles === "number" &&
              group.totalRequestedBottles !== group.totalBottles
                ? ` (requested ${group.totalRequestedBottles})`
                : ""}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-gray-900">
                {formatPrice(group.totalCostCents)}
              </div>
              <div className="text-xs text-gray-500">{group.wines.length} wines</div>
            </div>
          </div>
        </Card>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-3xl p-0 overflow-hidden bg-white border border-gray-200 rounded-2xl">
        <DialogHeader className="gap-4 px-6 pt-6 pb-5 text-center border-b border-gray-200 bg-white">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-gray-200 bg-gray-100 mx-auto">
            <Image
              src={primaryImage}
              alt="Reserved product"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold tracking-tight">{group.palletName}</DialogTitle>
            <DialogDescription className="text-sm">Track your reservation and view details</DialogDescription>
          </div>
        </DialogHeader>

        <div className="mx-5 rounded-2xl border border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gray-50 p-2 ring-1 ring-gray-200">
              <StatusIcon className={`h-5 w-5 ${statusConfig.iconClass}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{summaryStatus}</h3>
                <Badge
                  variant="outline"
                  className="text-xs"
                >
                  Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Latest {formatDate(group.latestOrderDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="mx-5 flex flex-col" style={{ height: "calc(90vh - 240px)" }}>
          <Tabs defaultValue="pallet" className="flex h-full flex-col overflow-hidden">
            <TabsList className="w-full justify-start rounded-full bg-white border border-gray-200">
              <TabsTrigger value="pallet" className="gap-2">
                <Package className="h-4 w-4" />
                Pallet
              </TabsTrigger>
              <TabsTrigger value="tracking" className="gap-2">
                <Truck className="h-4 w-4" />
                Tracking
              </TabsTrigger>
              <TabsTrigger value="wines" className="gap-2">
                <Wine className="h-4 w-4" />
                Wines
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <Package className="h-4 w-4" />
                Details
              </TabsTrigger>
              <TabsTrigger value="delivery" className="gap-2">
                <MapPin className="h-4 w-4" />
                Delivery
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="pallet"
              className="mt-0 flex-1 overflow-y-auto pb-6 scrollbar-hide"
            >
              <div className="space-y-4 pt-4">
                <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Pallet Information
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pallet Name</span>
                        <span className="font-medium">{group.palletName}</span>
                      </div>
                      {group.palletCapacity && (
                        <>
                          <Separator className="my-2" />
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Capacity</span>
                              <span className="font-medium">
                                {group.palletCapacity} bottles
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Reserved</span>
                              <span className="font-medium">
                                {progressBottles} bottles
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Your bottles</span>
                              <span className="font-medium">
                                {group.totalBottles} bottles
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>
                                  {Math.round(
                                    (progressBottles / group.palletCapacity) * 100
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    group.palletIsComplete
                                      ? "bg-success"
                                      : (progressBottles / group.palletCapacity) * 100 >= 90
                                        ? "bg-amber-500"
                                        : "bg-primary"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      (progressBottles / group.palletCapacity) * 100,
                                      100
                                    )}%`,
                                  }}
                                />
                              </div>
                            </div>
                            {group.palletIsComplete && (
                              <div className="p-3 rounded-lg bg-success/10 border border-success/20">
                                <div className="flex items-center gap-2 text-success">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-sm font-semibold">
                                    Pallet is complete
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  This pallet has reached full capacity and is ready
                                  for processing.
                                </p>
                              </div>
                            )}
                            {!group.palletIsComplete &&
                              (progressBottles / group.palletCapacity) * 100 >= 90 && (
                                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                                  <div className="flex items-center gap-2 text-amber-800">
                                    <Clock className="h-4 w-4" />
                                    <span className="text-sm font-semibold">
                                      Almost full
                                    </span>
                                  </div>
                                  <p className="text-xs text-amber-800/90 mt-1">
                                    This pallet is over 90% full. Invite friends or add
                                    more bottles to complete it.
                                  </p>
                                </div>
                              )}
                          </div>
                        </>
                      )}
                      {!group.palletCapacity && (
                        <div className="p-3 rounded-lg bg-muted/50 border">
                          <p className="text-xs text-muted-foreground">
                            Capacity information not available for this pallet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-4 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Summary
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Wines</span>
                      <span className="font-medium">
                        {group.wines.length} wine{group.wines.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Your bottles (approved)</span>
                      <span className="font-medium">{group.totalBottles} bottles</span>
                    </div>
                    {typeof group.totalRequestedBottles === "number" &&
                    group.totalRequestedBottles !== group.totalBottles ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Your bottles (requested)</span>
                        <span className="font-medium">{group.totalRequestedBottles} bottles</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-medium">
                        {group.orderCount} order{group.orderCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Cost</span>
                      <span className="font-semibold">
                        {formatPrice(group.totalCostCents)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent
              value="tracking"
              className="mt-0 flex-1 overflow-y-auto pb-6 scrollbar-hide"
            >
              <div className="space-y-5 pt-2">
                <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Pallet</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{group.palletName}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Reference</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium truncate">
                          {group.addressPalletKey}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={copyPalletKey}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View full reservations
                  </Button>
                </Card>

                <div className="space-y-4">
                  <Accordion type="single" collapsible className="w-full rounded-2xl border border-gray-200 bg-white overflow-hidden">
                    <AccordionItem value="placed" className="border-b border-gray-200">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Reservation placed</span>
                          </div>
                          <Badge variant="outline" className="text-xs">Complete</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 text-sm text-muted-foreground">
                        We received your reservation on {formatDate(group.latestOrderDate)}.
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="producer" className="border-b border-gray-200">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Producer review</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {getProducerOutcome(group.latestReservationStatus)}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4">
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div>
                            The producer confirms stock for each wine. This may be approved partially
                            if inventory is limited.
                          </div>
                          {Array.isArray(group.producerItems) && group.producerItems.length > 0 ? (
                            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                              <div className="divide-y divide-border/60">
                                {group.producerItems.map((it, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-3 px-3 py-2">
                                    <div className="min-w-0">
                                      <div className="truncate text-sm font-medium text-foreground">
                                        {it.wine_name} {it.vintage ? `(${it.vintage})` : ""}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        Decision: {it.decision || "pending"}
                                      </div>
                                    </div>
                                    <div className="text-xs text-muted-foreground text-right tabular-nums">
                                      {it.approved === null ? "—" : it.approved} / {it.requested}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <div className="text-xs text-muted-foreground">
                              Item-level approvals will appear here once the producer decides.
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="pallet" className="border-b border-gray-200">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Pallet consolidating</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {group.palletStatus || (group.palletIsComplete ? "complete" : "open")}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 text-sm text-muted-foreground">
                        {group.palletCapacity && group.palletCapacity > 0 ? (
                          <div className="space-y-2">
                            <div>
                              {progressBottles} / {group.palletCapacity} bottles
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-2 bg-foreground/80"
                                style={{ width: `${Math.min(100, Math.round(progressPercent))}%` }}
                              />
                            </div>
                            <div className="text-xs text-muted-foreground">
                              When the pallet is complete, payment becomes available and pickup can be scheduled.
                            </div>
                          </div>
                        ) : (
                          <div>Capacity information not available.</div>
                        )}
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="payment" className="border-b border-gray-200">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Payment</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {group.paymentStatus || "—"}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 text-sm text-muted-foreground">
                        <div className="space-y-2">
                          <div>
                            Payment opens when the pallet is complete. You’ll get a link and a deadline.
                          </div>
                          {group.paymentDeadline ? (
                            <div className="text-xs">
                              Deadline:{" "}
                              <span className="font-medium">
                                {new Date(group.paymentDeadline).toLocaleDateString("sv-SE")}
                              </span>
                            </div>
                          ) : null}
                          {(String(group.latestReservationStatus) === "pending_payment" ||
                            group.paymentStatus === "pending_payment") &&
                          group.paymentLink ? (
                            <Button
                              className="w-full"
                              onClick={() => window.open(group.paymentLink, "_blank")}
                            >
                              <CreditCard className="mr-2 h-4 w-4" />
                              Pay now
                            </Button>
                          ) : null}
                        </div>
                      </AccordionContent>
                    </AccordionItem>

                    <AccordionItem value="delivery" className="border-b-0">
                      <AccordionTrigger className="px-4 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-3">
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-semibold">Delivery</span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {group.palletStatus === "delivered"
                              ? "Delivered"
                              : group.palletStatus === "shipped"
                                ? "In transit"
                                : "Not started"}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 text-sm text-muted-foreground">
                        <div className="space-y-2">
                          <div>
                            This updates when the pallet status moves to <span className="font-medium">shipped</span> or <span className="font-medium">delivered</span>.
                          </div>
                          <div className="text-xs">
                            Current pallet status:{" "}
                            <span className="font-medium">{group.palletStatus || "open"}</span>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="wines" className="mt-0 flex-1 overflow-y-auto pb-6">
              <div className="space-y-4 pt-4">
                <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Wine className="h-4 w-4 text-muted-foreground" />
                    Reserved Wines
                  </h4>
                  {group.wines.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No wines found for this pallet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(
                        group.wines.reduce((acc: Record<string, typeof group.wines>, w) => {
                          const producer = w.producer_name || "Unknown Producer";
                          acc[producer] = acc[producer] || [];
                          acc[producer].push(w);
                          return acc;
                        }, {}),
                      )
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([producerName, wines]) => (
                          <div key={producerName} className="space-y-3">
                            <div className="text-xs font-medium text-gray-500">
                              {producerName}
                            </div>
                            <div className="space-y-3">
                              {wines.map((w, idx) => {
                                const img = w.image_path || "/placeholder.jpg";
                                const approved = Number(w.approvedQuantity || 0);
                                const requested = Number(w.totalQuantity || 0);
                                const pending = Boolean(w.hasPendingApproval);
                                const statusLabel = pending
                                  ? "Pending"
                                  : approved === 0
                                    ? "Declined"
                                    : approved < requested
                                      ? "Partially Approved"
                                      : "Approved";

                                const statusClass =
                                  statusLabel === "Approved"
                                    ? "bg-emerald-100 text-emerald-900 border-emerald-200"
                                    : statusLabel === "Partially Approved"
                                      ? "bg-amber-100 text-amber-900 border-amber-200"
                                      : statusLabel === "Declined"
                                        ? "bg-red-100 text-red-900 border-red-200"
                                        : "bg-gray-100 text-gray-900 border-gray-200";

                                return (
                                  <div key={`${producerName}-${w.wine_name}-${w.vintage}-${idx}`}>
                                    <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative h-10 w-10 overflow-hidden rounded-md border bg-muted">
                                          <Image
                                            src={img}
                                            alt={w.wine_name}
                                            fill
                                            className="object-cover"
                                            sizes="40px"
                                          />
                                        </div>
                                        <div className="min-w-0">
                                          <p className="text-sm font-medium text-foreground truncate">
                                            {w.wine_name}
                                          </p>
                                          <p className="text-xs text-muted-foreground truncate">
                                            {w.vintage}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2 shrink-0">
                                        <Badge className={`text-xs border ${statusClass}`}>
                                          {statusLabel}
                                        </Badge>
                                        <Badge variant="secondary" className="text-xs tabular-nums">
                                          {approved}/{requested}
                                        </Badge>
                                        <span className="text-sm font-semibold text-foreground">
                                          {formatPrice(w.total_cost_cents)}
                                        </span>
                                      </div>
                                    </div>
                                    {idx < wines.length - 1 && (
                                      <Separator className="my-3" />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                            <Separator className="my-4" />
                          </div>
                        ))}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto pb-6">
              <div className="space-y-4 pt-4">
                <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-5 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Reservation Information
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Orders</span>
                      <span className="font-medium">{group.orderCount}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Wines</span>
                      <span className="font-medium">{group.wines.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bottles</span>
                      <span className="font-medium">{group.totalBottles}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total</span>
                      <span className="font-semibold">{formatPrice(group.totalCostCents)}</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Wine className="h-4 w-4 text-muted-foreground" />
                    Wines
                  </h4>
                  <div className="space-y-2.5">
                    {group.wines.map((w, idx) => (
                      <div key={`${w.wine_name}-${idx}`} className="flex justify-between text-sm">
                        <span className="text-muted-foreground truncate pr-3">
                          {w.wine_name} ({w.vintage}) × {w.totalQuantity}
                        </span>
                        <span className="font-medium">{formatPrice(w.total_cost_cents)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="delivery" className="mt-0 flex-1 overflow-y-auto pb-6">
              <div className="space-y-4 pt-4">
                <Card className="p-4 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Delivery
                  </h4>
                  <div className="space-y-2.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Address</span>
                      <span className="font-medium text-right">
                        {group.deliveryAddress}
                      </span>
                    </div>
                    {group.latestReservationStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Reservation</span>
                        <span className="font-medium">{group.latestReservationStatus}</span>
                      </div>
                    )}
                    {group.palletStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pallet</span>
                        <span className="font-medium">{group.palletStatus}</span>
                      </div>
                    )}
                    {group.paymentStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Payment</span>
                        <span className="font-medium">{group.paymentStatus}</span>
                      </div>
                    )}
                    {group.paymentDeadline && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Deadline</span>
                        <span className="font-medium">
                          {new Date(group.paymentDeadline).toLocaleDateString("sv-SE")}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>

                {(group.paymentStatus === "pending_payment") &&
                  (group.paymentLink ? (
                    <Button
                      className="w-full"
                      onClick={() => window.open(group.paymentLink, "_blank")}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay now
                    </Button>
                  ) : null)}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressPalletData, setAddressPalletData] = useState<
    AddressPalletData[]
  >([]);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      console.log("[Reservations] Fetching reservations...");
      const response = await fetch("/api/user/reservations");
      console.log("[Reservations] Response status:", response.status);

      if (!response.ok) {
        if (response.status === 500) {
          setReservations([]);
          setAddressPalletData([]);
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch reservations");
      }
      const data = await response.json();
      console.log("[Reservations] Data received:", data);

      if (Array.isArray(data)) {
        console.log("[Reservations] Processing", data.length, "reservations");
        setReservations(data);
        // Fetch pallet totals (global) so progress matches admin/pallets (bookings-based)
        const palletIds = Array.from(
          new Set(
            data
              .map((r: any) => r.pallet_id)
              .filter((id: any) => typeof id === "string" && id.length > 0),
          ),
        ) as string[];

        const palletInfoById = new Map<
          string,
          { currentBottles: number; capacity: number; isComplete: boolean; status?: string | null }
        >();

        if (palletIds.length > 0) {
          try {
            const palletRes = await fetch("/api/pallet-data", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              cache: "no-store",
              body: JSON.stringify({ palletIds }),
            });
            if (palletRes.ok) {
              const palletJson = await palletRes.json();
              (palletJson?.pallets || []).forEach((p: any) => {
                palletInfoById.set(p.id, {
                  currentBottles: Number(p.current_bottles) || 0,
                  capacity: Number(p.bottle_capacity) || 0,
                  isComplete: Boolean(p.is_complete),
                  status: typeof p.status === "string" ? p.status : null,
                });
              });
            }
          } catch (e) {
            console.warn("[Reservations] Failed to fetch pallet totals");
          }
        }

        const addressPalletGroups = processAddressPalletData(data, palletInfoById);
        console.log(
          "[Reservations] Created",
          addressPalletGroups.length,
          "address/pallet groups",
        );
        setAddressPalletData(addressPalletGroups);
      } else {
        console.warn("[Reservations] Data is not an array:", data);
        setReservations([]);
        setAddressPalletData([]);
      }

      setLoading(false);
    } catch (error) {
      console.error("Error fetching reservations:", error);
      setReservations([]);
      setAddressPalletData([]);
      setLoading(false);
    }
  };

  const processAddressPalletData = (
    reservations: Reservation[],
    palletInfoById: Map<
      string,
      { currentBottles: number; capacity: number; isComplete: boolean; status?: string | null }
    >,
  ): AddressPalletData[] => {
    const addressPalletMap = new Map<string, AddressPalletData>();

    reservations.forEach((reservation) => {
      // Create unique key combining address and pallet
      const addressPalletKey = `${reservation.delivery_address || "No Address"}|${reservation.pallet_name || "Unassigned Pallet"}`;

      if (!addressPalletMap.has(addressPalletKey)) {
        const palletInfo = reservation.pallet_id
          ? palletInfoById.get(reservation.pallet_id)
          : undefined;
        const producerItems =
          reservation.items?.map((it) => ({
            wine_name: it.wine_name,
            vintage: it.vintage,
            requested: Number(it.quantity) || 0,
            approved:
              it.producer_approved_quantity === null ||
              it.producer_approved_quantity === undefined
                ? null
                : Number(it.producer_approved_quantity) || 0,
            decision: it.producer_decision_status || null,
          })) || [];
        addressPalletMap.set(addressPalletKey, {
          addressPalletKey,
          palletId: reservation.pallet_id ?? null,
          palletName: reservation.pallet_name || "Unassigned Pallet",
          palletStatus: palletInfo?.status ?? reservation.pallet_status ?? null,
          deliveryAddress:
            reservation.delivery_address || "No delivery address",
          wines: [],
          totalBottles: 0,
          totalRequestedBottles: 0,
          palletCurrentBottles: palletInfo?.currentBottles,
          totalCostCents: 0,
          orderCount: 0,
          latestOrderDate: reservation.created_at,
          latestReservationStatus: reservation.status,
          paymentStatus: reservation.payment_status,
          paymentLink: reservation.payment_link,
          paymentDeadline: reservation.payment_deadline,
          palletCapacity: palletInfo?.capacity || reservation.pallet_capacity,
          palletIsComplete:
            palletInfo?.isComplete ?? false,
          producerItems,
        });
      }

      const group = addressPalletMap.get(addressPalletKey)!;
      group.orderCount++;
      const countedStatuses = new Set([
        "placed",
        "approved",
        "partly_approved",
        "pending_payment",
        "confirmed",
      ]);

      const reservationRequested = reservation.items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0),
        0,
      );
      group.totalRequestedBottles =
        (group.totalRequestedBottles || 0) + reservationRequested;

      // Only count bottles toward pallet fill once the reservation is approved/placed/etc.
      const reservationCountsTowardPallet = countedStatuses.has(String(reservation.status || ""));
      if (reservationCountsTowardPallet) {
        const reservationApproved = reservation.items.reduce((sum, item) => {
          const approved =
            item.producer_approved_quantity === null ||
            item.producer_approved_quantity === undefined
              ? null
              : Number(item.producer_approved_quantity) || 0;
          return sum + (approved === null ? Number(item.quantity) || 0 : approved);
        }, 0);
        group.totalBottles += reservationApproved;
      }
      group.totalCostCents += reservation.total_cost_cents;

      // Track latest reservation status + producer item approvals for the newest reservation in the group
      try {
        if (reservation.created_at && group.latestOrderDate) {
          const reservationDate = new Date(reservation.created_at);
          const groupDate = new Date(group.latestOrderDate);
          if (!isNaN(reservationDate.getTime()) && !isNaN(groupDate.getTime())) {
            if (reservationDate >= groupDate) {
              group.latestReservationStatus = reservation.status;
              group.paymentStatus = reservation.payment_status;
              group.paymentLink = reservation.payment_link;
              group.paymentDeadline = reservation.payment_deadline;
              group.producerItems =
                reservation.items?.map((it) => ({
                  wine_name: it.wine_name,
                  vintage: it.vintage,
                  requested: Number(it.quantity) || 0,
                  approved:
                    it.producer_approved_quantity === null ||
                    it.producer_approved_quantity === undefined
                      ? null
                      : Number(it.producer_approved_quantity) || 0,
                  decision: it.producer_decision_status || null,
                })) || [];
            }
          }
        }
      } catch {}

      // Keep pallet status strictly data-driven from /api/pallet-data (never OR in stale flags)
      const palletInfoForReservation = reservation.pallet_id
        ? palletInfoById.get(reservation.pallet_id)
        : undefined;
      if (palletInfoForReservation) {
        if (palletInfoForReservation.capacity > 0) {
          group.palletCapacity = palletInfoForReservation.capacity;
        }
        group.palletIsComplete = palletInfoForReservation.isComplete;
        group.palletStatus = palletInfoForReservation.status ?? group.palletStatus ?? reservation.pallet_status ?? null;
      } else if (
        reservation.pallet_capacity !== undefined &&
        reservation.pallet_capacity !== null &&
        reservation.pallet_capacity > 0
      ) {
        // Fallback only if pallet info couldn't be fetched
        if (
          group.palletCapacity === undefined ||
          group.palletCapacity === null ||
          group.palletCapacity === 0
        ) {
          group.palletCapacity = reservation.pallet_capacity;
        }
      }

      // Update latest order date
      try {
        // Validate both dates before comparison
        if (reservation.created_at && group.latestOrderDate) {
          const reservationDate = new Date(reservation.created_at);
          const groupDate = new Date(group.latestOrderDate);

          // Check if both dates are valid
          if (
            !isNaN(reservationDate.getTime()) &&
            !isNaN(groupDate.getTime())
          ) {
            if (reservationDate > groupDate) {
              group.latestOrderDate = reservation.created_at;
            }
          }
        }
      } catch (error) {
        console.error("Error comparing dates:", error);
      }

      // Add wines with cost aggregation
      reservation.items.forEach((item) => {
        const producerName = item.producer_name || "Unknown Producer";
        const decision = String(item.producer_decision_status || "");
        const isPending = decision === "" || decision === "pending";
        const isDeclined = decision === "declined";
        const approvedQty =
          isPending
            ? 0
            : isDeclined
              ? 0
              : item.producer_approved_quantity === null ||
                  item.producer_approved_quantity === undefined
                ? Number(item.quantity) || 0
                : Number(item.producer_approved_quantity) || 0;

        const existingWine = group.wines.find(
          (wine) =>
            wine.wine_name === item.wine_name &&
            wine.vintage === item.vintage &&
            (wine.producer_name || "Unknown Producer") === producerName,
        );

        if (existingWine) {
          existingWine.totalQuantity += item.quantity;
          existingWine.approvedQuantity =
            (existingWine.approvedQuantity || 0) + approvedQty;
          existingWine.hasPendingApproval =
            Boolean(existingWine.hasPendingApproval) || isPending;
          existingWine.total_cost_cents += item.total_cost_cents;
        } else {
          group.wines.push({
            wine_name: item.wine_name,
            producer_name: producerName,
            vintage: item.vintage,
            totalQuantity: item.quantity,
            approvedQuantity: approvedQty,
            hasPendingApproval: isPending,
            image_path: item.image_path,
            grape_varieties: item.grape_varieties,
            color: item.color,
            price_per_bottle_cents: item.price_per_bottle_cents,
            total_cost_cents: item.total_cost_cents,
          });
        }
      });
    });

    return Array.from(addressPalletMap.values()).sort((a, b) => {
      try {
        // Validate both dates before comparison
        if (!a.latestOrderDate || !b.latestOrderDate) {
          return 0;
        }

        const dateA = new Date(a.latestOrderDate);
        const dateB = new Date(b.latestOrderDate);

        // Check if both dates are valid
        if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
          return 0;
        }

        return dateB.getTime() - dateA.getTime();
      } catch (error) {
        console.error("Error sorting by date:", error);
        return 0;
      }
    });
  };

  if (loading) {
    return (
      <PageLayout noPadding>
        <main className="min-h-screen bg-gray-50">
          <div className="max-w-5xl mx-auto p-6 pt-top-spacing">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto" />
                <p className="mt-4 text-gray-600">Loading reservations...</p>
              </div>
            </div>
          </div>
        </main>
      </PageLayout>
    );
  }

  return (
    <PageLayout noPadding>
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="outline" size="sm" className="rounded-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-medium text-gray-900">
                My Reservations
              </h1>
              <p className="text-gray-500 mt-1">
                Your reservations by delivery address and pallet.
              </p>
            </div>
          </div>

          {addressPalletData.length === 0 ? (
            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <CardContent className="text-center py-10">
                <Wine className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No reservations yet
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  You haven&apos;t made any reservations yet.
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href="/shop">
                    <Button className="bg-black hover:bg-black/90 text-white rounded-full px-8">
                      Browse wines
                    </Button>
                  </Link>
                  <Link href="/">
                    <Button variant="outline" className="rounded-full px-8">
                      Go home
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {addressPalletData.map((group) => (
                <PalletDialog key={group.addressPalletKey} group={group} />
              ))}
            </div>
          )}
        </div>
      </main>
    </PageLayout>
  );
}
