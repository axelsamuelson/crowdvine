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
  delivery_address?: string;
  total_cost_cents: number;
  payment_status?: string;
  payment_link?: string;
  payment_deadline?: string;
  items: Array<{
    wine_name: string;
    quantity: number;
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
  palletName: string;
  deliveryAddress: string;
  wines: Array<{
    wine_name: string;
    vintage: string;
    totalQuantity: number;
    image_path?: string;
    grape_varieties?: string;
    color?: string;
    price_per_bottle_cents: number;
    total_cost_cents: number;
  }>;
  totalBottles: number;
  totalCostCents: number;
  orderCount: number;
  latestOrderDate: string;
  paymentStatus?: string;
  paymentLink?: string;
  paymentDeadline?: string;
  palletCapacity?: number;
  palletIsComplete?: boolean;
}

const timelineStatusConfig: Record<
  string,
  { icon: LucideIcon; containerClass: string; iconClass: string }
> = {
  Delivered: {
    icon: CheckCircle2,
    containerClass: "border border-success/40 bg-success/10",
    iconClass: "text-success",
  },
  "Out for Delivery": {
    icon: Truck,
    containerClass: "border border-primary/40 bg-primary/10",
    iconClass: "text-primary",
  },
  "In Transit": {
    icon: Clock,
    containerClass: "border border-muted-foreground/30 bg-muted",
    iconClass: "text-muted-foreground",
  },
  "Order Placed": {
    icon: Package,
    containerClass: "border border-border bg-background",
    iconClass: "text-muted-foreground",
  },
};

const timelineDefaultStatus = {
  icon: Clock,
  containerClass: "border border-border bg-background",
  iconClass: "text-muted-foreground",
};

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

  const latestStatus =
    group.paymentStatus === "paid"
      ? "Delivered"
      : group.paymentStatus === "pending" ||
          group.paymentStatus === "pending_payment"
        ? "Out for Delivery"
        : "Order Placed";

  const trackingEvents = [
    {
      status: latestStatus,
      location: group.deliveryAddress,
      date: formatDate(group.latestOrderDate),
      time: "",
      description:
        group.paymentStatus === "paid"
          ? "Reservation secured and processed"
          : group.paymentStatus === "pending" ||
              group.paymentStatus === "pending_payment"
            ? "Payment required to secure your reservation"
            : "Reservation confirmed and processed",
      completed: true,
    },
    {
      status: "Order Placed",
      location: "CrowdVine",
      date: formatDate(group.latestOrderDate),
      time: "",
      description: "Order confirmed and processed",
      completed: true,
    },
  ];

  const statusConfig =
    timelineStatusConfig[latestStatus] ?? timelineDefaultStatus;
  const StatusIcon = statusConfig.icon;

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

          {/* Overlay (homepage-card style) */}
          <div className="absolute flex p-sides inset-0 items-end justify-end pointer-events-none">
            <div className="pointer-events-auto max-w-full flex items-stretch gap-2 w-full">
              {/* Procenten i utrymmet mellan vänsterkant och vit box */}
              {group.palletCapacity && group.palletCapacity > 0 && (
                <div className="flex items-center justify-center flex-1 min-w-0 group/percentage">
                  <div className="relative">
                    <span className="text-3xl font-semibold text-foreground whitespace-nowrap transition-all duration-300 group-hover/percentage:opacity-0 group-hover/percentage:scale-95">
                      {Math.round((group.totalBottles / group.palletCapacity) * 100)}%
                    </span>
                    <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover/percentage:opacity-100 transition-all duration-300 scale-95 group-hover/percentage:scale-100">
                      <span className="text-2xl font-semibold text-foreground whitespace-nowrap">
                        {group.totalBottles} / {group.palletCapacity}
                      </span>
                      <span className="text-sm text-muted-foreground whitespace-nowrap mt-0.5">
                        bottles
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div className="flex gap-3 items-center p-2.5 pl-4 bg-white/95 backdrop-blur-sm rounded-lg max-w-full shadow-button ring-1 ring-border/10 transition-transform duration-300 ease-out group-hover/card:-translate-y-0.5 group-hover/card:shadow-button-hover">
                <div className="pr-4 leading-4 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <p className="inline-block w-full truncate text-sm md:text-base font-semibold text-foreground/90 mb-1">
                      {group.palletName}
                    </p>
                    <Badge variant="outline" className="text-[10px] mb-1 shrink-0">
                      {group.paymentStatus || "placed"}
                    </Badge>
                  </div>
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

      <DialogContent className="max-h-[90vh] max-w-3xl p-0 overflow-hidden">
        <DialogHeader className="gap-4 px-6 pt-6 pb-5 text-center border-b border-border/50 bg-white/60 backdrop-blur-sm">
          <div className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-border/20 bg-muted shadow-button mx-auto">
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

        <div className="mx-5 rounded-2xl border border-border/50 bg-white/70 backdrop-blur-sm px-6 py-4 shadow-button">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-success/10 p-2 ring-1 ring-success/20">
              <StatusIcon className={`h-5 w-5 ${statusConfig.iconClass}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground">{latestStatus}</h3>
                <Badge
                  variant="outline"
                  className="border-success/30 bg-success/10 text-success text-xs"
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
            <TabsList className="w-full justify-start rounded-xl bg-white/70 backdrop-blur-sm border border-border/50 shadow-button">
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
                <Card className="p-4 bg-white/70 backdrop-blur-sm border-border/50 shadow-button">
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
                                {group.totalBottles} bottles
                              </span>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Progress</span>
                                <span>
                                  {Math.round(
                                    (group.totalBottles / group.palletCapacity) * 100
                                  )}
                                  %
                                </span>
                              </div>
                              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    group.palletIsComplete
                                      ? "bg-success"
                                      : (group.totalBottles / group.palletCapacity) * 100 >= 90
                                        ? "bg-amber-500"
                                        : "bg-primary"
                                  }`}
                                  style={{
                                    width: `${Math.min(
                                      (group.totalBottles / group.palletCapacity) * 100,
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
                              (group.totalBottles / group.palletCapacity) * 100 >= 90 && (
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

                <Card className="p-4 bg-white/70 backdrop-blur-sm border-border/50 shadow-button">
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
                      <span className="text-muted-foreground">Total Bottles</span>
                      <span className="font-medium">{group.totalBottles} bottles</span>
                    </div>
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
                <Card className="p-4 bg-white/70 backdrop-blur-sm border-border/50 shadow-button">
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
                  <div className="space-y-4">
                    {trackingEvents.map((event, index) => {
                      const isLatest = index === 0;
                      const cfg = isLatest
                        ? timelineStatusConfig[event.status] ?? timelineDefaultStatus
                        : timelineCompletedStatus;
                      const Icon = cfg.icon;

                      return (
                        <div key={index} className="relative flex gap-3">
                          {index !== trackingEvents.length - 1 && (
                            <div className="absolute left-[13px] top-6 h-full w-px bg-border" />
                          )}
                          <div className="relative flex-shrink-0">
                            <div
                              className={`flex h-7 w-7 border-none items-center justify-center rounded-full ${cfg.containerClass}`}
                            >
                              <Icon className={`h-4 w-4 ${cfg.iconClass}`} />
                            </div>
                          </div>
                          <div className="flex justify-between gap-4 pb-4 w-full">
                            <div className="flex-1 space-y-1">
                              <p className="text-sm font-semibold leading-none">
                                {event.status}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {event.description}
                              </p>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>{event.location}</span>
                              </div>
                            </div>
                            <div className="text-right text-xs text-muted-foreground shrink-0">
                              <p>{event.date}</p>
                              {event.time ? <p>{event.time}</p> : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="wines" className="mt-0 flex-1 overflow-y-auto pb-6">
              <div className="space-y-4 pt-4">
                <Card className="p-4 bg-white/70 backdrop-blur-sm border-border/50 shadow-button">
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
                      {group.wines.map((w, idx) => {
                        const img = w.image_path || "/placeholder.jpg";
                        return (
                          <div key={`${w.wine_name}-${w.vintage}-${idx}`}>
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
                              <div className="flex items-center gap-3 shrink-0">
                                <Badge variant="secondary" className="text-xs">
                                  {w.totalQuantity} bottle
                                  {w.totalQuantity !== 1 ? "s" : ""}
                                </Badge>
                                <span className="text-sm font-semibold text-foreground">
                                  {formatPrice(w.total_cost_cents)}
                                </span>
                              </div>
                            </div>
                            {idx < group.wines.length - 1 && (
                              <Separator className="my-3" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="details" className="mt-0 flex-1 overflow-y-auto pb-6">
              <div className="space-y-4 pt-4">
                <Card className="p-4 bg-white/70 backdrop-blur-sm border-border/50 shadow-button">
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

                <Card className="p-4 bg-white/70 backdrop-blur-sm border-border/50 shadow-button">
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
                <Card className="p-4 bg-white/70 backdrop-blur-sm border-border/50 shadow-button">
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

                {(group.paymentStatus === "pending" ||
                  group.paymentStatus === "pending_payment") &&
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
        const addressPalletGroups = processAddressPalletData(data);
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
  ): AddressPalletData[] => {
    const addressPalletMap = new Map<string, AddressPalletData>();

    reservations.forEach((reservation) => {
      // Create unique key combining address and pallet
      const addressPalletKey = `${reservation.delivery_address || "No Address"}|${reservation.pallet_name || "Unassigned Pallet"}`;

      if (!addressPalletMap.has(addressPalletKey)) {
        addressPalletMap.set(addressPalletKey, {
          addressPalletKey,
          palletName: reservation.pallet_name || "Unassigned Pallet",
          deliveryAddress:
            reservation.delivery_address || "No delivery address",
          wines: [],
          totalBottles: 0,
          totalCostCents: 0,
          orderCount: 0,
          latestOrderDate: reservation.created_at,
          paymentStatus: reservation.payment_status || reservation.status,
          paymentLink: reservation.payment_link,
          paymentDeadline: reservation.payment_deadline,
          palletCapacity: reservation.pallet_capacity,
          palletIsComplete: reservation.pallet_is_complete,
        });
      }

      const group = addressPalletMap.get(addressPalletKey)!;
      group.orderCount++;
      group.totalBottles += reservation.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      group.totalCostCents += reservation.total_cost_cents;

      // Update pallet capacity and completion status if not set or if we get a better value
      // Only update if current value is null/undefined and new value is valid
      if (
        reservation.pallet_capacity !== undefined &&
        reservation.pallet_capacity !== null &&
        reservation.pallet_capacity > 0
      ) {
        if (
          group.palletCapacity === undefined ||
          group.palletCapacity === null ||
          group.palletCapacity === 0
        ) {
          group.palletCapacity = reservation.pallet_capacity;
        }
      }
      if (reservation.pallet_is_complete !== undefined && reservation.pallet_is_complete !== null) {
        // If any reservation says complete, mark as complete
        group.palletIsComplete = group.palletIsComplete || reservation.pallet_is_complete;
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
        const existingWine = group.wines.find(
          (wine) =>
            wine.wine_name === item.wine_name && wine.vintage === item.vintage,
        );

        if (existingWine) {
          existingWine.totalQuantity += item.quantity;
          existingWine.total_cost_cents += item.total_cost_cents;
        } else {
          group.wines.push({
            wine_name: item.wine_name,
            vintage: item.vintage,
            totalQuantity: item.quantity,
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
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading reservations...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-8 p-sides">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Reservations
            </h1>
            <p className="text-gray-600 mt-2">
              Your wine reservations organized by delivery address and pallet
            </p>
          </div>
        </div>

        {addressPalletData.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <Wine className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No reservations yet
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You haven't made any wine reservations yet. Start exploring our
                collection!
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/shop">
                  <Button size="lg" className="px-8">
                    Browse Wines
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="lg" className="px-8">
                    Go Home
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
    </PageLayout>
  );
}
