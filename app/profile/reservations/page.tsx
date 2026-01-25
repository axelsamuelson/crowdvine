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
    handle?: string | null;
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
    handle?: string | null;
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

const getProducerHandle = (name: string): string => {
  return name.toLowerCase().replace(/\s+/g, "-");
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
  // Use totalRequestedBottles if available (includes unconfirmed), otherwise fall back to approved bottles
  const progressBottles =
    group.totalRequestedBottles && group.totalRequestedBottles > 0
      ? group.totalRequestedBottles
      : group.palletCurrentBottles ?? group.totalBottles;
  const progressPercent =
    group.palletCapacity && group.palletCapacity > 0
      ? (progressBottles / group.palletCapacity) * 100
      : 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <div className="relative rounded-xl overflow-hidden bg-muted ring-1 ring-border/10 shadow-button hover:shadow-button-hover transition-shadow cursor-pointer group/card">
          <div className="block w-full aspect-square">
            <Image
              src={primaryImage}
              alt={group.palletName}
              width={1000}
              height={100}
              className="object-cover size-full"
            />
          </div>

          {/* Status badge - top right */}
          <div className="absolute top-3 right-3 pointer-events-none">
            <Badge variant="outline" className="text-[10px] bg-white/95 backdrop-blur-sm shadow-sm">
              {summaryStatus}
            </Badge>
          </div>

          {/* Overlay (homepage-card style) */}
          <div className="absolute flex p-sides inset-0 items-end justify-end pointer-events-none">
            <div className="pointer-events-auto max-w-full flex items-stretch gap-2 w-full">
              {/* Procenten i utrymmet mellan vänsterkant och vit box */}
              {group.palletCapacity && group.palletCapacity > 0 && (
                <div className="flex items-center justify-center flex-1 min-w-0 group/percentage">
                  <div className="relative">
                    <span className="text-3xl font-semibold text-foreground whitespace-nowrap transition-all duration-300 group-hover/percentage:opacity-0 group-hover/percentage:scale-95">
                      {Math.round((progressBottles / group.palletCapacity) * 100)}%
                    </span>
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/percentage:opacity-100 transition-all duration-300 scale-95 group-hover/percentage:scale-100">
                      <span className="text-2xl font-semibold text-foreground whitespace-nowrap">
                        {progressBottles} / {group.palletCapacity}
                      </span>
                      <span className="text-sm text-muted-foreground whitespace-nowrap mt-0.5">
                        bottles
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 items-center p-2.5 pl-4 bg-white/95 backdrop-blur-sm rounded-lg max-w-[60%] shadow-button ring-1 ring-border/10 transition-transform duration-300 ease-out group-hover/card:-translate-y-0.5 group-hover/card:shadow-button-hover">
                <div className="pr-4 leading-4 overflow-hidden">
                  <p className="inline-block w-full truncate text-xs md:text-sm font-semibold text-foreground/90 mb-1">
                    {group.palletName}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-normal mb-1 truncate">
                    {group.totalBottles} bottles • {group.wines.length} wines
                  </p>
                  <div className="flex gap-2 items-center text-sm md:text-base font-semibold">
                    <span className="text-sm md:text-base font-semibold">{formatPrice(group.totalCostCents)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className="max-h-[95vh] md:max-h-[90vh] max-w-[95vw] md:max-w-4xl p-0 bg-gray-50 border-0 rounded-none md:rounded-2xl m-0 md:m-4 h-[95vh] md:h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="gap-3 md:gap-4 px-4 md:px-6 pt-4 md:pt-6 pb-3 md:pb-5 text-center border-b border-gray-200 bg-white shrink-0">
          <div className="relative h-12 w-12 md:h-16 md:w-16 overflow-hidden rounded-xl ring-1 ring-gray-200 bg-gray-100 mx-auto">
            <Image
              src={primaryImage}
              alt="Reserved product"
              fill
              className="object-cover"
              priority
            />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-sm md:text-base font-semibold tracking-tight px-2">{group.palletName}</DialogTitle>
            <DialogDescription className="text-xs md:text-sm">Track your reservation and view details</DialogDescription>
          </div>
        </DialogHeader>

        <div className="px-4 md:px-6 py-3 md:py-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="rounded-lg md:rounded-xl bg-gray-50 p-1.5 md:p-2 ring-1 ring-gray-200 shrink-0">
              <StatusIcon className={`h-4 w-4 md:h-5 md:w-5 ${statusConfig.iconClass}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 md:gap-2 flex-wrap">
                <h3 className="text-sm md:text-base font-semibold text-foreground truncate">{summaryStatus}</h3>
                <Badge
                  variant="outline"
                  className="text-[10px] md:text-xs shrink-0"
                >
                  Active
                </Badge>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                Latest {formatDate(group.latestOrderDate)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col bg-gray-50">
          <Tabs defaultValue="pallet" className="flex h-full flex-col min-h-0">
            <div className="px-3 md:px-4 pt-2 pb-1.5 bg-white border-b border-gray-200 shrink-0">
              <TabsList className="w-full grid grid-cols-4 rounded-full bg-white border border-gray-200 h-auto gap-1 p-1">
                <TabsTrigger value="pallet" className="gap-1.5 text-xs flex-1 px-2 md:px-3 py-1.5 md:py-2 h-auto text-[10px] md:text-xs rounded-full">
                  <Package className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Pallet</span>
                </TabsTrigger>
                <TabsTrigger value="tracking" className="gap-1.5 text-xs flex-1 px-2 md:px-3 py-1.5 md:py-2 h-auto text-[10px] md:text-xs rounded-full">
                  <Truck className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Tracking</span>
                </TabsTrigger>
                <TabsTrigger value="wines" className="gap-1.5 text-xs flex-1 px-2 md:px-3 py-1.5 md:py-2 h-auto text-[10px] md:text-xs rounded-full">
                  <Wine className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Wines</span>
                </TabsTrigger>
                <TabsTrigger value="delivery" className="gap-1.5 text-xs flex-1 px-2 md:px-3 py-1.5 md:py-2 h-auto text-[10px] md:text-xs rounded-full">
                  <MapPin className="h-3 w-3 md:h-3.5 md:w-3.5 shrink-0" />
                  <span className="whitespace-nowrap">Delivery</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="pallet"
              className="mt-0 flex-1 min-h-0 overflow-y-auto pb-4 md:pb-6 px-3 md:px-4"
            >
              <div className="space-y-4 pt-4">
                <Card className="p-4 md:p-5 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Pallet Information
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pallet Name</span>
                        <span className="font-medium text-gray-900">{group.palletName}</span>
                      </div>
                      {group.palletCapacity && (
                        <>
                          <Separator className="my-2" />
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Capacity</span>
                              <span className="font-medium text-gray-900">
                                {group.palletCapacity} bottles
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Reserved</span>
                              <span className="font-medium text-gray-900">
                                {progressBottles} bottles
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Your bottles</span>
                              <span className="font-medium text-gray-900">
                                {group.totalRequestedBottles && group.totalRequestedBottles > group.totalBottles
                                  ? `${group.totalBottles} / ${group.totalRequestedBottles}`
                                  : group.totalBottles}{" "}
                                bottles
                              </span>
                            </div>
                            <div className="space-y-1.5 pt-1.5">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Progress</span>
                                <span>
                                  {Math.round(
                                    (progressBottles / group.palletCapacity) * 100
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    group.palletIsComplete
                                      ? "bg-emerald-500"
                                      : (progressBottles / group.palletCapacity) * 100 >= 90
                                        ? "bg-amber-500"
                                        : "bg-gray-900"
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
                              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                <div className="flex items-center gap-2 text-emerald-900">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span className="text-sm font-semibold">
                                    Pallet is complete
                                  </span>
                                </div>
                                <p className="text-xs text-emerald-800 mt-1">
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
                        <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                          <p className="text-xs text-gray-500">
                            Capacity information not available for this pallet.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card className="p-4 md:p-5 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Total Wines</span>
                      <span className="font-medium text-gray-900">
                        {group.wines.length} wine{group.wines.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Your bottles (approved)</span>
                      <span className="font-medium text-gray-900">{group.totalBottles} bottles</span>
                    </div>
                    {typeof group.totalRequestedBottles === "number" &&
                    group.totalRequestedBottles !== group.totalBottles ? (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Your bottles (requested)</span>
                        <span className="font-medium text-gray-900">{group.totalRequestedBottles} bottles</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Orders</span>
                      <span className="font-medium text-gray-900">
                        {group.orderCount} order{group.orderCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium text-gray-900">Total Cost</span>
                      <span className="text-lg font-medium text-gray-900">
                        {formatPrice(group.totalCostCents)}
                      </span>
                    </div>
                  </div>
                </Card>
              </div>
            </TabsContent>

            <TabsContent
              value="tracking"
              className="mt-0 flex-1 min-h-0 overflow-y-auto pb-4 md:pb-6 px-3 md:px-4"
            >
              <div className="space-y-4 pt-4">
                <Card className="p-4 md:p-5 bg-white border border-gray-200 rounded-2xl">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Pallet</p>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-gray-900 break-words">{group.palletName}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-gray-500">Reference</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm font-medium truncate flex-1 min-w-0">
                          {group.addressPalletKey}
                        </p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={copyPalletKey}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full bg-transparent mt-4" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View full reservations
                  </Button>
                </Card>

                <div className="space-y-4">
                  {/* Process Timeline */}
                  <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                    
                    {/* Steps */}
                    <div className="space-y-6 relative">
                      {/* Step 1: Reservation placed */}
                      <div className="flex items-start gap-4">
                        <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                          true ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-300 text-gray-400"
                        }`}>
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <div className="flex-1 pt-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold text-gray-900">Reservation placed</h4>
                            <Badge variant="outline" className="text-xs">Complete</Badge>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(group.latestOrderDate)}
                          </p>
                        </div>
                      </div>

                      {/* Step 2: Producer review */}
                      {(() => {
                        const producerStatus = getProducerOutcome(group.latestReservationStatus);
                        const isComplete = producerStatus === "Approved" || producerStatus === "Partly approved";
                        const isActive = producerStatus === "Pending";
                        const isDeclined = producerStatus === "Declined";
                        return (
                          <div className="flex items-start gap-4">
                            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              isComplete ? "bg-emerald-500 border-emerald-500 text-white" :
                              isActive ? "bg-amber-500 border-amber-500 text-white animate-pulse" :
                              isDeclined ? "bg-red-500 border-red-500 text-white" :
                              "bg-white border-gray-300 text-gray-400"
                            }`}>
                              {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-sm font-semibold ${
                                  isActive ? "text-amber-700" : isDeclined ? "text-red-700" : "text-gray-900"
                                }`}>
                                  Producer review
                                </h4>
                                <Badge variant="outline" className={`text-xs ${
                                  isActive ? "border-amber-200 bg-amber-50 text-amber-700" :
                                  isDeclined ? "border-red-200 bg-red-50 text-red-700" :
                                  "border-emerald-200 bg-emerald-50 text-emerald-700"
                                }`}>
                                  {producerStatus}
                                </Badge>
                              </div>
                              {group.wines && group.wines.length > 0 && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {group.wines.reduce((sum, w) => sum + (Number(w.approvedQuantity || 0)), 0)} / {group.wines.reduce((sum, w) => sum + Number(w.totalQuantity || 0), 0)} bottles approved
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 3: Pallet consolidating */}
                      {(() => {
                        const isComplete = group.palletIsComplete;
                        const isActive = !isComplete && progressBottles > 0;
                        return (
                          <div className="flex items-start gap-4">
                            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              isComplete ? "bg-emerald-500 border-emerald-500 text-white" :
                              isActive ? "bg-gray-900 border-gray-900 text-white" :
                              "bg-white border-gray-300 text-gray-400"
                            }`}>
                              {isComplete ? <CheckCircle2 className="h-4 w-4" /> : <Package className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-semibold text-gray-900">Pallet consolidating</h4>
                                <Badge variant="outline" className="text-xs">
                                  {group.palletStatus || (isComplete ? "complete" : "open")}
                                </Badge>
                              </div>
                              {group.palletCapacity && group.palletCapacity > 0 && (
                                <>
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {progressBottles} / {group.palletCapacity} bottles
                                  </p>
                                  <div className="mt-2 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        isComplete ? "bg-emerald-500" : "bg-gray-900"
                                      }`}
                                      style={{ width: `${Math.min(100, Math.round(progressPercent))}%` }}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 4: Payment */}
                      {(() => {
                        const isPaid = group.paymentStatus === "paid" || group.latestReservationStatus === "confirmed";
                        const isPending = group.paymentStatus === "pending_payment" || group.latestReservationStatus === "pending_payment";
                        return (
                          <div className="flex items-start gap-4">
                            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              isPaid ? "bg-emerald-500 border-emerald-500 text-white" :
                              isPending ? "bg-amber-500 border-amber-500 text-white animate-pulse" :
                              "bg-white border-gray-300 text-gray-400"
                            }`}>
                              {isPaid ? <CheckCircle2 className="h-4 w-4" /> : <CreditCard className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-sm font-semibold ${
                                  isPending ? "text-amber-700" : "text-gray-900"
                                }`}>
                                  Payment
                                </h4>
                                <Badge variant="outline" className={`text-xs ${
                                  isPending ? "border-amber-200 bg-amber-50 text-amber-700" :
                                  isPaid ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                                  ""
                                }`}>
                                  {group.paymentStatus || "pending"}
                                </Badge>
                              </div>
                              {group.paymentDeadline && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Deadline: {new Date(group.paymentDeadline).toLocaleDateString("sv-SE")}
                                </p>
                              )}
                              {isPending && group.paymentLink && (
                                <Button
                                  className="w-full mt-2"
                                  size="sm"
                                  onClick={() => window.open(group.paymentLink, "_blank")}
                                >
                                  <CreditCard className="mr-2 h-3 w-3" />
                                  Pay now
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Step 5: Delivery */}
                      {(() => {
                        const isDelivered = group.palletStatus === "delivered";
                        const isInTransit = group.palletStatus === "shipped" || group.palletStatus === "in_transit" || group.palletStatus === "out_for_delivery";
                        return (
                          <div className="flex items-start gap-4">
                            <div className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              isDelivered ? "bg-emerald-500 border-emerald-500 text-white" :
                              isInTransit ? "bg-blue-500 border-blue-500 text-white animate-pulse" :
                              "bg-white border-gray-300 text-gray-400"
                            }`}>
                              {isDelivered ? <CheckCircle2 className="h-4 w-4" /> : <Truck className="h-4 w-4" />}
                            </div>
                            <div className="flex-1 pt-1">
                              <div className="flex items-center justify-between">
                                <h4 className={`text-sm font-semibold ${
                                  isInTransit ? "text-blue-700" : "text-gray-900"
                                }`}>
                                  Delivery
                                </h4>
                                <Badge variant="outline" className={`text-xs ${
                                  isDelivered ? "border-emerald-200 bg-emerald-50 text-emerald-700" :
                                  isInTransit ? "border-blue-200 bg-blue-50 text-blue-700" :
                                  ""
                                }`}>
                                  {isDelivered ? "Delivered" : isInTransit ? "In transit" : "Not started"}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {group.deliveryAddress}
                              </p>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Reference Card */}
                  <Card className="p-4 md:p-5 bg-white border border-gray-200 rounded-2xl">
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Pallet</p>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-gray-900 break-words">{group.palletName}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs text-gray-500">Reference</p>
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-sm font-medium truncate flex-1 min-w-0">
                            {group.addressPalletKey}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 shrink-0"
                            onClick={copyPalletKey}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full bg-transparent mt-4" size="sm">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      View full reservations
                    </Button>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="wines" className="mt-0 flex-1 min-h-0 overflow-y-auto pb-4 md:pb-6 px-3 md:px-4">
              <div className="space-y-4 pt-4">
                <Card className="p-4 md:p-5 bg-white border border-gray-200 rounded-2xl">
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
                            <Link 
                              href={`/shop/${getProducerHandle(producerName)}`}
                              className="text-xs font-medium text-gray-500 hover:text-gray-900 hover:underline transition-colors inline-block"
                            >
                              {producerName}
                            </Link>
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

                                // Use handle if available, otherwise fallback to search
                                const wineUrl = w.handle 
                                  ? `/product/${w.handle}`
                                  : `/shop?search=${encodeURIComponent(`${w.wine_name} ${w.vintage}`)}`;

                                return (
                                  <div key={`${producerName}-${w.wine_name}-${w.vintage}-${idx}`}>
                                    <div className="flex items-center justify-between gap-2 md:gap-3 flex-wrap">
                                      <Link href={wineUrl} className="flex items-center gap-2 md:gap-3 min-w-0 flex-1 hover:opacity-80 transition-opacity">
                                        <div className="relative h-8 w-8 md:h-10 md:w-10 overflow-hidden rounded-md border bg-muted shrink-0">
                                          <Image
                                            src={img}
                                            alt={w.wine_name}
                                            fill
                                            className="object-cover"
                                            sizes="40px"
                                          />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs md:text-sm font-medium text-foreground truncate">
                                            {w.wine_name}
                                          </p>
                                          <p className="text-[10px] md:text-xs text-muted-foreground truncate">
                                            {w.vintage}
                                          </p>
                                        </div>
                                      </Link>
                                      <div className="flex items-center gap-1.5 md:gap-2 shrink-0 flex-wrap">
                                        <Badge className={`text-[10px] md:text-xs border ${statusClass}`}>
                                          {statusLabel}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px] md:text-xs tabular-nums">
                                          {approved}/{requested}
                                        </Badge>
                                        <span className="text-xs md:text-sm font-semibold text-foreground">
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

            <TabsContent value="delivery" className="mt-0 flex-1 min-h-0 overflow-y-auto pb-4 md:pb-6 px-3 md:px-4">
              <div className="space-y-4 pt-4">
                <Card className="p-4 md:p-5 bg-white border border-gray-200 rounded-2xl">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    Delivery
                  </h4>
                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Address</span>
                      <span className="font-medium text-sm text-gray-900 break-words">
                        {group.deliveryAddress}
                      </span>
                    </div>
                    {group.latestReservationStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Reservation</span>
                        <span className="font-medium text-gray-900">{group.latestReservationStatus}</span>
                      </div>
                    )}
                    {group.palletStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Pallet</span>
                        <span className="font-medium text-gray-900">{group.palletStatus}</span>
                      </div>
                    )}
                    {group.paymentStatus && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Payment</span>
                        <span className="font-medium text-gray-900">{group.paymentStatus}</span>
                      </div>
                    )}
                    {group.paymentDeadline && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Deadline</span>
                        <span className="font-medium text-gray-900">
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
      const response = await fetch("/api/user/reservations", {
        cache: "no-store",
      });
      console.log("[Reservations] Response status:", response.status);

      if (!response.ok) {
        if (response.status === 500) {
          console.error("[Reservations] Server error, setting empty state");
          setReservations([]);
          setAddressPalletData([]);
          setLoading(false);
          return;
        }
        if (response.status === 401) {
          console.error("[Reservations] Not authenticated");
          setReservations([]);
          setAddressPalletData([]);
          setLoading(false);
          return;
        }
        const errorText = await response.text().catch(() => "Unknown error");
        console.error("[Reservations] Error response:", errorText);
        throw new Error(`Failed to fetch reservations: ${response.status} ${errorText}`);
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
            handle: item.handle || null,
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
