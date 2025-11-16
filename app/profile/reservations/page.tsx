"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/components/layout/page-layout";
import {
  Package,
  Wine,
  ArrowLeft,
  Calendar,
  MapPin,
  Truck,
  CreditCard,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { DeliveryProgress } from "@/components/reservations/delivery-progress";
import type { SharedBoxMeta } from "@/lib/shopify/types";

interface Reservation {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  pallet_id?: string;
  pallet_name?: string;
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
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressPalletData, setAddressPalletData] = useState<
    AddressPalletData[]
  >([]);
  const [sharedBoxes, setSharedBoxes] = useState<SharedBoxMeta[]>([]);
  const [sharedBoxesLoading, setSharedBoxesLoading] = useState(true);

  const totalBottleCount = addressPalletData.reduce(
    (sum, group) => sum + group.totalBottles,
    0,
  );
  const uniqueAddresses = new Set(
    addressPalletData.map(
      (group) => group.deliveryAddress || "Unassigned address",
    ),
  ).size;
  const pendingPaymentCount = addressPalletData.filter((group) => {
    const normalized = group.paymentStatus?.toLowerCase();
    return normalized === "pending" || normalized === "pending_payment";
  }).length;
  const totalReservationValue = addressPalletData.reduce(
    (sum, group) => sum + group.totalCostCents,
    0,
  );

  const normalizeStatus = (status?: string) =>
    status ? status.toLowerCase() : undefined;

  const getPaymentStatusLabel = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "paid") return "Paid";
    if (normalized === "pending" || normalized === "pending_payment") {
      return "Payment required";
    }
    if (normalized === "processing") return "Processing";
    return status || "Status unknown";
  };

  const getPaymentBadgeClasses = (status?: string) => {
    const normalized = normalizeStatus(status);
    if (normalized === "paid") return "bg-green-100 text-green-700";
    if (normalized === "pending" || normalized === "pending_payment") {
      return "bg-amber-100 text-amber-800";
    }
    return "bg-gray-100 text-gray-700";
  };

  const isPaymentPending = (status?: string) => {
    const normalized = normalizeStatus(status);
    return normalized === "pending" || normalized === "pending_payment";
  };

  useEffect(() => {
    fetchReservations();
    fetchSharedBoxes();
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

  const fetchSharedBoxes = async () => {
    try {
      setSharedBoxesLoading(true);
      const res = await fetch("/api/shared-boxes");
      if (!res.ok) {
        setSharedBoxes([]);
        return;
      }
      const data = await res.json();
      setSharedBoxes(data.boxes ?? []);
    } catch (error) {
      console.error("Error fetching shared boxes:", error);
      setSharedBoxes([]);
    } finally {
      setSharedBoxesLoading(false);
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
        });
      }

      const group = addressPalletMap.get(addressPalletKey)!;
      group.orderCount++;
      group.totalBottles += reservation.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      group.totalCostCents += reservation.total_cost_cents;

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

  const formatDate = (dateString: string) => {
    try {
      // Validate that dateString is not empty and is a valid date
      if (!dateString || typeof dateString !== "string") {
        return "Invalid Date";
      }

      const date = new Date(dateString);

      // Check if the date is valid
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
      <div className="mx-auto max-w-6xl space-y-10 px-sides py-6">
        <div className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm backdrop-blur md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-4">
              <Link href="/profile">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-fit rounded-full border-gray-200 text-gray-700 hover:text-gray-900"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to profile
                </Button>
              </Link>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                  Reservation overview
                </p>
                <h1 className="text-3xl font-light text-gray-900 md:text-4xl">
                  My reservations
                </h1>
                <p className="mt-2 text-sm text-gray-600 md:text-base">
                  Track every pallet, delivery address, and payment milestone in
                  one premium view.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/shop">
                <Button className="rounded-full bg-gray-900 px-6 text-white hover:bg-gray-800">
                  Browse wines
                </Button>
              </Link>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Reserved bottles
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {totalBottleCount}
              </p>
              <p className="text-xs text-gray-500">
                Across {addressPalletData.length} pallet
                {addressPalletData.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Delivery addresses
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {uniqueAddresses}
              </p>
              <p className="text-xs text-gray-500">Active destinations</p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Pending payments
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {pendingPaymentCount}
              </p>
              <p className="text-xs text-gray-500">Awaiting completion</p>
            </div>
            <div className="rounded-2xl border border-gray-200/70 bg-white/80 p-4 shadow-sm">
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Reserved value
              </p>
              <p className="mt-2 text-3xl font-semibold text-gray-900">
                {formatPrice(totalReservationValue)}
              </p>
              <p className="text-xs text-gray-500">Current commitments</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-gray-200 bg-white/90 p-6 shadow-sm">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-gray-400">
                Shared boxes
              </p>
              <h2 className="text-xl font-semibold text-gray-900">
                Collaborative cases
              </h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full text-gray-500 hover:text-gray-900"
              onClick={fetchSharedBoxes}
            >
              Refresh
            </Button>
          </div>
          {sharedBoxesLoading ? (
            <p className="mt-4 text-sm text-gray-500">
              Loading shared boxes…
            </p>
          ) : sharedBoxes.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-gray-200/80 bg-gray-50/80 p-6 text-sm text-gray-500">
              Start a shared box from the shop to split the 6-bottle minimum
              with friends.
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {sharedBoxes.map((box) => {
                const progress = Math.min(
                  100,
                  Math.round((box.totalQuantity / box.targetQuantity) * 100),
                );
                return (
                  <div
                    key={box.id}
                    className="rounded-2xl border border-gray-200/70 bg-white/70 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {box.producerName || "Shared box"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {box.totalQuantity}/{box.targetQuantity} bottles
                          committed
                        </p>
                      </div>
                      <Badge variant="outline" className="capitalize">
                        {box.status}
                      </Badge>
                    </div>
                    <div className="mt-3 h-2 w-full rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-gray-900"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      {box.remainingQuantity > 0
                        ? `${box.remainingQuantity} bottles left`
                        : "Ready for checkout"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {addressPalletData.length === 0 ? (
          <Card className="rounded-3xl border-2 border-dashed border-gray-200 bg-white/80 shadow-sm">
            <CardContent className="py-16 text-center">
              <Wine className="mx-auto mb-6 h-16 w-16 text-gray-300" />
              <h3 className="text-2xl font-light text-gray-900">
                No reservations yet
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Start building your first pallet to see progress, payments, and
                delivery details appear here.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link href="/shop">
                  <Button className="rounded-full bg-gray-900 px-8 text-white hover:bg-gray-800">
                    Explore wines
                  </Button>
                </Link>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="rounded-full border-gray-200 px-8 text-gray-700 hover:text-gray-900"
                  >
                    Back home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {addressPalletData.map((group) => {
              const paymentPending = isPaymentPending(group.paymentStatus);
              return (
                <Card
                  key={group.addressPalletKey}
                  className="overflow-hidden rounded-3xl border border-gray-200 bg-white/90 shadow-sm backdrop-blur"
                >
                  <CardHeader className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="rounded-2xl bg-white p-3 shadow-inner">
                          <Package className="h-6 w-6 text-gray-700" />
                        </div>
                        <div>
                          <CardTitle className="text-2xl font-semibold text-gray-900">
                            {group.palletName}
                          </CardTitle>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <span className="rounded-full bg-white/80 px-3 py-1">
                              {group.totalBottles} bottles
                            </span>
                            <span className="rounded-full bg-white/80 px-3 py-1">
                              {group.wines.length} wine
                              {group.wines.length !== 1 ? "s" : ""}
                            </span>
                            <span className="rounded-full bg-white/80 px-3 py-1">
                              {group.orderCount} order
                              {group.orderCount !== 1 ? "s" : ""}
                            </span>
                            <span className="rounded-full bg-white/80 px-3 py-1 text-green-600">
                              {formatPrice(group.totalCostCents)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div className="flex items-center justify-end gap-2">
                          <Calendar className="h-4 w-4" />
                          <span>Latest {formatDate(group.latestOrderDate)}</span>
                        </div>
                        <div className="mt-2">
                          <Badge
                            className={`rounded-full px-3 py-1 text-xs ${getPaymentBadgeClasses(group.paymentStatus)}`}
                          >
                            {getPaymentStatusLabel(group.paymentStatus)}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-8 p-6">
                    {group.paymentStatus && (
                      <div className="rounded-2xl border border-gray-100 bg-white/70 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Payment status
                            </p>
                            <p className="text-sm text-gray-500">
                              {paymentPending
                                ? "Complete your payment to secure this pallet."
                                : "All set. We’ll notify you once shipping begins."}
                            </p>
                            {group.paymentDeadline && paymentPending && (
                              <p className="mt-2 text-xs text-amber-700">
                                Deadline{" "}
                                {new Date(
                                  group.paymentDeadline,
                                ).toLocaleDateString("sv-SE")}
                              </p>
                            )}
                          </div>
                          <div>
                            {paymentPending ? (
                              group.paymentLink ? (
                                <Button
                                  className="min-w-[160px] rounded-full bg-amber-600 text-white hover:bg-amber-700"
                                  onClick={() =>
                                    window.open(group.paymentLink, "_blank")
                                  }
                                >
                                  Pay now
                                </Button>
                              ) : (
                                <Button
                                  disabled
                                  className="min-w-[160px] rounded-full bg-gray-200 text-gray-500"
                                >
                                  Generating link...
                                </Button>
                              )
                            ) : (
                              <div className="rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-500">
                                Receipt available on request
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
                      <div className="space-y-6">
                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                            <MapPin className="h-4 w-4" />
                            Delivery address
                          </h3>
                          <div className="rounded-2xl border border-blue-100 bg-blue-50/80 p-4 text-sm text-gray-700">
                            {group.deliveryAddress}
                          </div>
                        </div>

                        <div>
                          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                            <Truck className="h-4 w-4" />
                            Delivery progress
                          </h3>
                          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                            <DeliveryProgress
                              status="placed"
                              created_at={group.latestOrderDate}
                              className="w-full"
                            />
                          </div>
                        </div>

                        <div className="rounded-2xl border border-green-100 bg-green-50/80 p-4">
                          <p className="text-xs uppercase tracking-wide text-green-800">
                            Reserved value
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-green-700">
                            {formatPrice(group.totalCostCents)}
                          </p>
                        </div>
                      </div>

                      <div>
                        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-gray-500">
                          <Wine className="h-4 w-4" />
                          Reserved wines
                        </h3>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          {group.wines.map((wine, index) => (
                            <div
                              key={index}
                              className="rounded-2xl border border-gray-100 bg-white/80 p-4 shadow-sm"
                            >
                              <div className="flex items-start gap-3">
                                {wine.image_path && (
                                  <div className="relative h-16 w-16 overflow-hidden rounded-xl">
                                    <Image
                                      src={wine.image_path}
                                      alt={wine.wine_name}
                                      fill
                                      className="object-cover"
                                      sizes="64px"
                                    />
                                  </div>
                                )}
                                <div className="min-w-0 space-y-1">
                                  <p className="font-medium text-gray-900">
                                    {wine.wine_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {wine.vintage}
                                  </p>
                                  {wine.grape_varieties && (
                                    <p className="text-xs text-gray-500">
                                      {wine.grape_varieties}
                                    </p>
                                  )}
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    {wine.color && (
                                      <Badge variant="outline">{wine.color}</Badge>
                                    )}
                                    <Badge variant="secondary">
                                      {wine.totalQuantity} bottle
                                      {wine.totalQuantity !== 1 ? "s" : ""}
                                    </Badge>
                                  </div>
                                  <div className="pt-2 text-xs text-gray-500">
                                    <p>
                                      {formatPrice(
                                        wine.price_per_bottle_cents,
                                      )}{" "}
                                      / bottle
                                    </p>
                                    <p className="font-semibold text-gray-900">
                                      {formatPrice(wine.total_cost_cents)} total
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
