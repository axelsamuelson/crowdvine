"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Trash2,
  Plus,
  Save,
  ArrowLeft,
  Package,
  User,
  MapPin,
  Calendar,
  DollarSign,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  formatCardBrandLabel,
  formatPaymentMethodTypeLabel,
} from "@/lib/stripe/payment-method-display";

interface ReservationEditFormProps {
  reservation: Reservation;
  zones: Zone[];
  pallets: Pallet[];
  wines: Wine[];
}

type Zone = { id: string; name: string; type: "pickup" | "delivery" | string };

type Pallet = {
  id: string;
  name: string;
  pickup_zone_id?: string | null;
  delivery_zone_id?: string | null;
};

type Wine = {
  id: string;
  wine_name: string;
  vintage?: string | null;
  grape_varieties?: string | null;
  color?: string | null;
  base_price_cents?: number | null;
  label_image_path?: string | null;
};

type ReservationItem = {
  id: string;
  item_id: string;
  quantity: number;
  wines?: Wine | null;
};

type ReservationAddress = {
  address_street?: string | null;
  address_city?: string | null;
  address_postcode?: string | null;
  country_code?: string | null;
};

type Reservation = {
  id: string;
  created_at: string;
  user_id?: string | null;
  status?: string | null;
  payment_status?: string | null;
  payment_mode?: string | null;
  payment_method_type?: string | null;
  payment_method_brand?: string | null;
  payment_method_last4?: string | null;
  payment_method_id?: string | null;
  payment_intent_id?: string | null;
  setup_intent_id?: string | null;
  order_id?: string | null;
  notes?: string | null;
  pickup_zone_id?: string | null;
  delivery_zone_id?: string | null;
  address_id?: string | null;
  delivery_address?: string | null;
  pallet_id?: string | null;
  checkout_group_id?: string | null;
  shipping_region_id?: string | null;
  user_addresses?: ReservationAddress | null;
  order_reservation_items?: ReservationItem[] | null;
};

function formatReservationStatus(status: string | null | undefined): string {
  switch (status) {
    case "pending_producer_approval":
      return "Pending approval";
    case "approved":
      return "Approved";
    case "partly_approved":
      return "Partly approved";
    case "placed":
      return "Placed";
    case "confirmed":
      return "Confirmed";
    case "pending_payment":
      return "Pending payment";
    case "cancelled":
      return "Cancelled";
    case "rejected":
      return "Rejected";
    default:
      return status ?? "—";
  }
}

function reservationStatusPillClass(status: string | null | undefined): string {
  switch (status) {
    case "pending_producer_approval":
      return "border border-amber-500/20 bg-amber-500/10 text-amber-400";
    case "partly_approved":
      return "border border-blue-500/20 bg-blue-500/10 text-blue-400";
    case "approved":
    case "confirmed":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "cancelled":
    case "rejected":
      return "border border-red-500/20 bg-red-500/10 text-red-400";
    default:
      return "border border-zinc-800 bg-zinc-900/40 text-zinc-400";
  }
}

function formatPaymentStatus(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "Paid";
    case "pending":
      return "Awaiting payment";
    case "failed":
      return "Payment failed";
    default:
      return "Not charged yet";
  }
}

function paymentStatusPillClass(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400";
    case "pending":
      return "border border-amber-500/20 bg-amber-500/10 text-amber-400";
    case "failed":
      return "border border-red-500/20 bg-red-500/10 text-red-400";
    case null:
    case undefined:
      return "border border-zinc-800 bg-zinc-900/40 text-zinc-400";
    default:
      return "border border-zinc-800 bg-zinc-900/40 text-zinc-400";
  }
}

function getStripeEnvLabel(): "Live" | "Test" | "—" {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
  if (pk.startsWith("pk_live_")) return "Live";
  if (pk.startsWith("pk_test_")) return "Test";
  return "—";
}

export default function ReservationEditForm({
  reservation,
  zones,
  pallets,
  wines,
}: ReservationEditFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState({
    status: reservation.status ?? "",
    order_id: reservation.order_id ?? "",
    notes: reservation.notes ?? "",
    pickup_zone_id: reservation.pickup_zone_id ?? "",
    delivery_zone_id: reservation.delivery_zone_id ?? "",
    address_id: reservation.address_id ?? "",
    delivery_address: reservation.user_addresses
      ? `${reservation.user_addresses.address_street || ""}, ${reservation.user_addresses.address_postcode || ""} ${reservation.user_addresses.address_city || ""}, ${reservation.user_addresses.country_code || ""}`
          .replace(/^,\s*/, "")
          .replace(/,\s*$/, "")
      : reservation.delivery_address ?? "",
    pallet_id: reservation.pallet_id ?? "",
  });

  const [items, setItems] = useState<
    Array<{ id: string; item_id: string; quantity: number; wine: Wine | null }>
  >(
    (reservation.order_reservation_items ?? []).map((item) => ({
      id: item.id,
      item_id: item.item_id,
      quantity: item.quantity,
      wine: item.wines ?? null,
    })),
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Debug: Log the reservation data when component mounts
  useEffect(() => {
    console.log("Reservation data:", reservation);
    console.log("Form data initialized:", {
      status: reservation.status || "",
      order_id: reservation.order_id || "",
      notes: reservation.notes || "",
      pickup_zone_id: reservation.pickup_zone_id || "",
      delivery_zone_id: reservation.delivery_zone_id || "",
      address_id: reservation.address_id || "",
      pallet_id: reservation.pallet_id || "",
      delivery_address: reservation.user_addresses
        ? `${reservation.user_addresses.address_street || ""}, ${reservation.user_addresses.address_postcode || ""} ${reservation.user_addresses.address_city || ""}, ${reservation.user_addresses.country_code || ""}`
            .replace(/^,\s*/, "")
            .replace(/,\s*$/, "")
        : reservation.delivery_address || "",
    });
  }, [reservation]);

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemQuantityChange = (index: number, quantity: number) => {
    const newItems = [...items];
    newItems[index].quantity = quantity;
    setItems(newItems);
  };

  const handleItemWineChange = (index: number, wineId: string) => {
    const selectedWine = wines.find((w) => w.id === wineId);
    if (selectedWine) {
      const newItems = [...items];
      newItems[index].item_id = wineId;
      newItems[index].wine = selectedWine;
      setItems(newItems);
    }
  };

  const addNewItem = () => {
    const newItem = {
      id: `new-${Date.now()}`,
      item_id: "",
      quantity: 1,
      wine: null,
    };
    setItems([...items, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const calculateTotalCost = () => {
    return items.reduce((total, item) => {
      const winePrice = item.wine?.base_price_cents || 0;
      return total + winePrice * item.quantity;
    }, 0);
  };

  const reservationIdShort = reservation.id.substring(0, 8).toUpperCase();
  const statusPill = reservationStatusPillClass(formData.status);
  const paymentPill = paymentStatusPillClass(reservation.payment_status);
  const palletById = new Map(pallets.map((p) => [p.id, p]));
  const zoneById = new Map(zones.map((z) => [z.id, z]));
  const selectedPallet = formData.pallet_id
    ? palletById.get(formData.pallet_id) ?? null
    : null;
  const selectedDeliveryZone = formData.delivery_zone_id
    ? zoneById.get(formData.delivery_zone_id) ?? null
    : null;
  const selectedPickupZone = formData.pickup_zone_id
    ? zoneById.get(formData.pickup_zone_id) ?? null
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Update reservation
      const reservationResponse = await fetch(
        `/api/admin/reservations/${reservation.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...formData,
            items: items.map((item) => ({
              id: item.id.startsWith("new-") ? null : item.id,
              item_id: item.item_id,
              quantity: item.quantity,
            })),
          }),
        },
      );

      if (!reservationResponse.ok) {
        const errorData = await reservationResponse.json();
        throw new Error(errorData.error || "Failed to update reservation");
      }

      router.push("/admin/b2c-orders");
    } catch (err) {
      console.error("Error updating reservation:", err);
      setError(
        err instanceof Error ? err.message : "Failed to update reservation",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10 pb-10">
      {error && (
        <Alert
          variant="destructive"
          className="border-red-500/30 bg-red-950/30 text-red-200"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header (Shopify-like) */}
      <div className="space-y-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-2 px-2 text-sm font-normal text-zinc-500 hover:bg-zinc-900/40 hover:text-zinc-50 dark:text-zinc-400"
        >
          <Link href="/admin/b2c-orders">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Back to B2C Orders
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
                Order #{reservationIdShort}
              </h1>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${statusPill}`}
              >
                {formatReservationStatus(formData.status)}
              </span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentPill}`}
              >
                {formatPaymentStatus(reservation.payment_status)}
              </span>
            </div>
            <p className="text-sm text-zinc-500">
              Created {formatDate(reservation.created_at)}
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="sm"
            className="h-8 shrink-0 bg-zinc-100 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT: main */}
        <div className="space-y-6">
          {/* Order items */}
          <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
            <div className="flex items-start justify-between gap-4">
              <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                Order items
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewItem}
                className="h-8 rounded-md border-[#1F1F23] bg-transparent text-xs text-zinc-200 hover:bg-zinc-900"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add item
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1F1F23] text-[11px] uppercase tracking-wide text-zinc-500">
                    <th className="py-2 pr-4 text-left">Item</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Unit</th>
                    <th className="py-2 text-right">Total</th>
                    <th className="py-2 pl-3 text-right" aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const unitCents = item.wine?.base_price_cents ?? 0;
                    const lineTotalCents = unitCents * (item.quantity ?? 0);
                    const img = item.wine?.label_image_path ?? null;
                    const name = item.wine?.wine_name ?? "Select wine";
                    const vintage = item.wine?.vintage ?? "";
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-[#1F1F23] last:border-0"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                              {img ? (
                                <Image
                                  src={img}
                                  alt={name}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-zinc-100 truncate">
                                {item.wine ? `${name} ${vintage}`.trim() : name}
                              </div>
                              <div className="mt-1">
                                <Select
                                  value={item.item_id || undefined}
                                  onValueChange={(value) =>
                                    handleItemWineChange(index, value)
                                  }
                                >
                                  <SelectTrigger className="h-9 w-full border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100">
                                    <SelectValue placeholder="Select wine" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {wines.map((wine) => (
                                      <SelectItem key={wine.id} value={wine.id}>
                                        {wine.wine_name} {wine.vintage}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              {item.wine?.grape_varieties ? (
                                <p className="mt-1 text-xs text-zinc-500 truncate">
                                  {item.wine.grape_varieties}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 pr-3 align-top text-right">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              handleItemQuantityChange(
                                index,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="h-9 w-20 border-[#1F1F23] bg-zinc-900 text-right text-sm text-zinc-100 tabular-nums"
                          />
                        </td>
                        <td className="py-3 pr-3 align-top text-right text-sm tabular-nums text-zinc-200">
                          {formatPrice(unitCents)}
                        </td>
                        <td className="py-3 align-top text-right text-sm font-medium tabular-nums text-zinc-100">
                          {formatPrice(lineTotalCents)}
                        </td>
                        <td className="py-3 pl-3 align-top text-right">
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            onClick={() => removeItem(index)}
                            className="h-9 px-2"
                            aria-label="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-end">
              <div className="w-full max-w-sm space-y-2 text-sm">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="tabular-nums">
                    {formatPrice(calculateTotalCost())}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Shipping</span>
                  <span>—</span>
                </div>
                <div className="flex items-center justify-between border-t border-[#1F1F23] pt-3">
                  <span className="font-semibold text-zinc-100">Total</span>
                  <span className="text-lg font-bold tabular-nums text-zinc-100">
                    {formatPrice(calculateTotalCost())}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Payment */}
          <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Payment
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Payment method</span>
                <span className="text-zinc-100">
                  {formatPaymentMethodTypeLabel(reservation.payment_method_type)}
                </span>
              </div>
              {reservation.payment_method_type === "card" ||
              reservation.payment_method_brand ||
              reservation.payment_method_last4 ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Card used</span>
                  <span className="text-right text-zinc-100">
                    {[
                      reservation.payment_method_brand
                        ? formatCardBrandLabel(reservation.payment_method_brand)
                        : null,
                      reservation.payment_method_last4
                        ? `•••• ${reservation.payment_method_last4}`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Stripe environment</span>
                <span className="text-zinc-100">{getStripeEnvLabel()}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Payment mode</span>
                <span className="text-zinc-100">
                  {reservation.payment_mode ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Payment status</span>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${paymentPill}`}
                >
                  {formatPaymentStatus(reservation.payment_status)}
                </span>
              </div>
              {reservation.payment_intent_id ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Payment intent</span>
                  <span className="max-w-[220px] truncate font-mono text-xs text-zinc-400">
                    {reservation.payment_intent_id}
                  </span>
                </div>
              ) : null}
              {reservation.setup_intent_id ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Setup intent</span>
                  <span className="max-w-[220px] truncate font-mono text-xs text-zinc-400">
                    {reservation.setup_intent_id}
                  </span>
                </div>
              ) : null}
            </div>
          </Card>

          {/* Notes */}
          <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Notes
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order_id" className="text-xs text-zinc-500">
                  Order ID
                </Label>
                <Input
                  id="order_id"
                  value={formData.order_id}
                  onChange={(e) => handleInputChange("order_id", e.target.value)}
                  placeholder="Order reference"
                  className="h-9 border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes" className="text-xs text-zinc-500">
                  Internal notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Additional notes or comments"
                  rows={3}
                  className="min-h-[100px] border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-500"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* RIGHT: sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Reservation summary */}
          <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Reservation summary
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Reservation</span>
                <span className="font-mono text-xs text-zinc-400">
                  {reservation.id}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-zinc-500">Created</span>
                <span className="text-zinc-100">
                  {formatDate(reservation.created_at)}
                </span>
              </div>
              {reservation.checkout_group_id ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Checkout group</span>
                  <span className="font-mono text-xs text-zinc-400">
                    {reservation.checkout_group_id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
              ) : null}
              {selectedPallet ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Pallet</span>
                  <Link
                    href={`/admin/pallets/${selectedPallet.id}`}
                    className="text-sm font-medium text-zinc-100 underline underline-offset-2"
                  >
                    {selectedPallet.name}
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-zinc-500">Pallet</span>
                  <span className="text-zinc-100">—</span>
                </div>
              )}
            </div>
          </Card>

          {/* Customer */}
          <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Customer
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm font-semibold text-zinc-100">
                {reservation.user_id ? "Customer" : "—"}
              </div>
              <div className="text-xs font-mono text-zinc-500">
                {reservation.user_id ?? "No user_id"}
              </div>
              {reservation.user_id ? (
                <Link
                  href={`/admin/users/${reservation.user_id}`}
                  className="inline-flex text-xs font-medium text-zinc-200 underline underline-offset-2"
                >
                  View customer →
                </Link>
              ) : null}
            </div>
          </Card>

          {/* Delivery */}
          <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Delivery
            </div>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="delivery_address" className="text-xs text-zinc-500">
                  Address
                </Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) =>
                    handleInputChange("delivery_address", e.target.value)
                  }
                  placeholder="Full delivery address"
                  rows={3}
                  className="min-h-[100px] border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100 placeholder:text-zinc-500"
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Delivery zone</span>
                <span className="text-zinc-100">
                  {selectedDeliveryZone?.name ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-500">Pickup zone</span>
                <span className="text-zinc-100">
                  {selectedPickupZone?.name ?? "—"}
                </span>
              </div>
            </div>
          </Card>

          {/* Status management */}
          <Card className="rounded-lg border border-[#1F1F23] bg-[#0F0F12] p-6 shadow-none">
            <div className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Status management
            </div>
            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status" className="text-xs text-zinc-500">
                  Reservation status
                </Label>
                <Select
                  value={formData.status || undefined}
                  onValueChange={(value) => handleInputChange("status", value)}
                >
                  <SelectTrigger className="h-9 border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="pending_producer_approval">
                      pending_producer_approval
                    </SelectItem>
                    <SelectItem value="approved">approved</SelectItem>
                    <SelectItem value="partly_approved">partly_approved</SelectItem>
                    <SelectItem value="placed">placed</SelectItem>
                    <SelectItem value="pending_payment">pending_payment</SelectItem>
                    <SelectItem value="confirmed">confirmed</SelectItem>
                    <SelectItem value="rejected">rejected</SelectItem>
                    <SelectItem value="cancelled">cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pallet_id" className="text-xs text-zinc-500">
                  Pallet
                </Label>
                <Select
                  value={formData.pallet_id || undefined}
                  onValueChange={(value) => handleInputChange("pallet_id", value)}
                >
                  <SelectTrigger className="h-9 border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100">
                    <SelectValue placeholder="Select pallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {pallets.map((pallet) => (
                      <SelectItem key={pallet.id} value={pallet.id}>
                        {pallet.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pickup_zone" className="text-xs text-zinc-500">
                    Pickup zone
                  </Label>
                  <Select
                    value={formData.pickup_zone_id || undefined}
                    onValueChange={(value) =>
                      handleInputChange("pickup_zone_id", value)
                    }
                  >
                    <SelectTrigger className="h-9 border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100">
                      <SelectValue placeholder="Select pickup zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones
                        .filter((z) => z.type === "pickup")
                        .map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="delivery_zone" className="text-xs text-zinc-500">
                    Delivery zone
                  </Label>
                  <Select
                    value={formData.delivery_zone_id || undefined}
                    onValueChange={(value) =>
                      handleInputChange("delivery_zone_id", value)
                    }
                  >
                    <SelectTrigger className="h-9 border-[#1F1F23] bg-zinc-900 text-sm text-zinc-100">
                      <SelectValue placeholder="Select delivery zone" />
                    </SelectTrigger>
                    <SelectContent>
                      {zones
                        .filter((z) => z.type === "delivery")
                        .map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="sm"
                className="h-9 w-full bg-zinc-100 text-xs font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </Card>
        </aside>
      </div>
    </form>
  );
}
