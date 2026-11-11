"use client";

import { useState, useEffect, type ReactNode } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash2, Plus, Save, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import {
  ADMIN_FIELD_CLASS,
  ADMIN_HELP_TEXT_CLASS,
  ADMIN_LABEL_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
} from "@/lib/admin-form-styles";
import { cn } from "@/lib/utils";
import {
  formatCardBrandLabel,
  formatPaymentMethodTypeLabel,
} from "@/lib/stripe/payment-method-display";

interface ReservationEditFormProps {
  reservation: Reservation;
  zones: Zone[];
  pallets: Pallet[];
  wines: Wine[];
  /** Full-width slot under the Order header (e.g. direct-box panel). */
  afterHeader?: ReactNode;
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
  archived_at?: string | null;
  archive_reason?: string | null;
  status_before_archive?: string | null;
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
      return "Väntar på godkännande";
    case "approved":
      return "Godkänd";
    case "partly_approved":
      return "Delvis godkänd";
    case "placed":
      return "Lagd";
    case "confirmed":
      return "Bekräftad";
    case "pending_payment":
      return "Väntar på betalning";
    case "cancelled":
      return "Avbruten";
    case "rejected":
      return "Avvisad";
    case "archived":
      return "Arkiverad";
    default:
      return status ?? "—";
  }
}

function reservationStatusPillClass(status: string | null | undefined): string {
  switch (status) {
    case "pending_producer_approval":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "partly_approved":
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    case "approved":
    case "confirmed":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case "archived":
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function formatPaymentStatus(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "Betald";
    case "pending":
      return "Väntar på betalning";
    case "failed":
      return "Betalning misslyckades";
    default:
      return "Ej debiterad ännu";
  }
}

function paymentStatusPillClass(status: string | null | undefined): string {
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "pending":
      return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
    case "failed":
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    case null:
    case undefined:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    default:
      return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
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
  afterHeader,
}: ReservationEditFormProps) {
  const router = useRouter();
  const [isArchived, setIsArchived] = useState(
    reservation.status === "archived" ||
      (reservation.archived_at != null &&
        String(reservation.archived_at).trim() !== ""),
  );
  const [archiveReason, setArchiveReason] = useState(
    reservation.archive_reason ?? "",
  );
  const [archiveBusy, setArchiveBusy] = useState(false);
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

  const handleArchiveToggle = async () => {
    setArchiveBusy(true);
    setError("");
    try {
      if (isArchived) {
        const res = await fetch(
          `/api/admin/reservations/${reservation.id}/archive`,
          { method: "DELETE" },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Kunde inte avarkivera reservationen");
        }
        const restored =
          typeof data.reservation?.status === "string"
            ? data.reservation.status
            : reservation.status_before_archive || "cancelled";
        setIsArchived(false);
        setArchiveReason("");
        setFormData((prev) => ({ ...prev, status: restored }));
        router.refresh();
      } else {
        const confirmed = confirm(
          "Arkivera den här reservationen? Den stannar i databasen men räknas inte längre som en aktiv order. Ingen e-post skickas.",
        );
        if (!confirmed) return;
        const res = await fetch(
          `/api/admin/reservations/${reservation.id}/archive`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: archiveReason.trim() || "admin_archive",
            }),
          },
        );
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.error || "Kunde inte arkivera reservationen");
        }
        setIsArchived(true);
        setFormData((prev) => ({ ...prev, status: "archived" }));
        router.refresh();
      }
    } catch (err) {
      console.error("Archive toggle error:", err);
      setError(
        err instanceof Error ? err.message : "Kunde inte uppdatera arkivstatus",
      );
    } finally {
      setArchiveBusy(false);
    }
  };

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
        throw new Error(errorData.error || "Kunde inte uppdatera reservationen");
      }

      router.push("/admin/b2c-orders");
    } catch (err) {
      console.error("Error updating reservation:", err);
      setError(
        err instanceof Error ? err.message : "Kunde inte uppdatera reservationen",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-w-0 w-full max-w-full space-y-10 overflow-x-clip pb-10 text-gray-900 dark:text-zinc-100"
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header (Shopify-like) */}
      <div className="space-y-3">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="-ml-2 h-8 gap-2 px-2 text-sm font-normal text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
        >
          <Link href="/admin/b2c-orders">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            Tillbaka till B2C-ordrar
          </Link>
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight !text-gray-900 dark:!text-white">
                Order #{reservationIdShort}
              </h1>
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${statusPill}`}
              >
                {formatReservationStatus(formData.status)}
              </span>
              <span
                className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${paymentPill}`}
              >
                {formatPaymentStatus(reservation.payment_status)}
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-500">
              Skapad {formatDate(reservation.created_at)}
            </p>
          </div>

          <Button
            type="submit"
            disabled={loading}
            size="sm"
            className="h-8 shrink-0 rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-60"
          >
            <Save className="mr-2 h-4 w-4" />
            {loading ? "Sparar…" : "Spara ändringar"}
          </Button>
        </div>
      </div>

      {afterHeader ? (
        <div className="w-full" data-testid="reservation-after-header">
          {afterHeader}
        </div>
      ) : null}

      <div className="grid min-w-0 gap-6 lg:grid-cols-[1fr_320px]">
        {/* LEFT: main */}
        <div className="min-w-0 space-y-6">
          {/* Orderrader */}
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100 dark:shadow-none sm:p-6">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
              <div className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
                Orderrader
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewItem}
                className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "h-8 text-xs")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Lägg till rad
              </Button>
            </div>

            {/* Mobile: stacked rows (table columns overflow at 390) */}
            <div className="mt-4 space-y-3 sm:hidden">
              {items.map((item, index) => {
                const unitCents = item.wine?.base_price_cents ?? 0;
                const lineTotalCents = unitCents * (item.quantity ?? 0);
                const img = item.wine?.label_image_path ?? null;
                const name = item.wine?.wine_name ?? "Välj vin";
                return (
                  <div
                    key={item.id}
                    className="min-w-0 space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-[#1F1F23] dark:bg-zinc-900/50"
                  >
                    <div className="flex min-w-0 items-start gap-2">
                      {img ? (
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-zinc-800">
                          <Image
                            src={img}
                            alt={name}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : null}
                      <div className="min-w-0 flex-1 space-y-1">
                        <Select
                          value={item.item_id || undefined}
                          onValueChange={(value) =>
                            handleItemWineChange(index, value)
                          }
                        >
                          <SelectTrigger
                            className={cn(
                              "h-9 w-full min-w-0 text-sm",
                              ADMIN_FIELD_CLASS,
                            )}
                          >
                            <SelectValue placeholder="Välj vin" />
                          </SelectTrigger>
                          <SelectContent>
                            {wines.map((wine) => (
                              <SelectItem key={wine.id} value={wine.id}>
                                {wine.wine_name} {wine.vintage}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {item.wine?.grape_varieties ? (
                          <p className={cn("truncate", ADMIN_HELP_TEXT_CLASS)}>
                            {item.wine.grape_varieties}
                          </p>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        className="h-8 w-8 shrink-0 border-0 bg-transparent p-0 text-gray-400 shadow-none ring-0 hover:bg-transparent hover:text-red-600 dark:hover:bg-transparent dark:hover:text-red-400"
                        aria-label="Ta bort rad"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid min-w-0 grid-cols-3 gap-2">
                      <div className="min-w-0 space-y-1">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                          Antal
                        </div>
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
                          className={cn(
                            "no-spinner h-9 w-full min-w-0 text-right text-sm tabular-nums",
                            ADMIN_FIELD_CLASS,
                          )}
                        />
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                          Styckpris
                        </div>
                        <div className="flex h-9 items-center justify-end truncate text-sm tabular-nums text-gray-800 dark:text-zinc-200">
                          {formatPrice(unitCents)}
                        </div>
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500 dark:text-zinc-500">
                          Totalt
                        </div>
                        <div className="flex h-9 items-center justify-end truncate text-sm font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                          {formatPrice(lineTotalCents)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table */}
            <div className="mt-4 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[36rem]">
                <thead>
                  <tr className="border-b border-gray-200 text-[11px] uppercase tracking-wide text-gray-500 dark:border-[#1F1F23] dark:text-zinc-500">
                    <th className="py-2 pr-4 text-left">Artikel</th>
                    <th className="py-2 pr-3 text-right">Antal</th>
                    <th className="py-2 pr-3 text-right">Styckpris</th>
                    <th className="py-2 text-right">Summa</th>
                    <th className="py-2 pl-3 text-right" aria-label="Åtgärder" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => {
                    const unitCents = item.wine?.base_price_cents ?? 0;
                    const lineTotalCents = unitCents * (item.quantity ?? 0);
                    const img = item.wine?.label_image_path ?? null;
                    const name = item.wine?.wine_name ?? "Välj vin";
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-200 last:border-0 dark:border-[#1F1F23]"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex min-w-0 items-center gap-3">
                            {img ? (
                              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-100 dark:bg-zinc-800">
                                <Image
                                  src={img}
                                  alt={name}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                            ) : null}
                            <div className="min-w-0 flex-1">
                              <Select
                                value={item.item_id || undefined}
                                onValueChange={(value) =>
                                  handleItemWineChange(index, value)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    "h-9 w-full text-sm",
                                    ADMIN_FIELD_CLASS,
                                  )}
                                >
                                  <SelectValue placeholder="Välj vin" />
                                </SelectTrigger>
                                <SelectContent>
                                  {wines.map((wine) => (
                                    <SelectItem key={wine.id} value={wine.id}>
                                      {wine.wine_name} {wine.vintage}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {item.wine?.grape_varieties ? (
                                <p
                                  className={cn(
                                    "mt-1 truncate",
                                    ADMIN_HELP_TEXT_CLASS,
                                  )}
                                >
                                  {item.wine.grape_varieties}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 pr-3 align-middle text-right">
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
                            className={cn(
                              "no-spinner h-9 w-20 text-right text-sm tabular-nums",
                              ADMIN_FIELD_CLASS,
                            )}
                          />
                        </td>
                        <td className="py-3 pr-3 align-middle text-right text-sm tabular-nums text-gray-800 dark:text-zinc-200">
                          <div className="flex h-9 items-center justify-end">
                            {formatPrice(unitCents)}
                          </div>
                        </td>
                        <td className="py-3 align-middle text-right text-sm font-medium tabular-nums text-gray-900 dark:text-zinc-100">
                          <div className="flex h-9 items-center justify-end">
                            {formatPrice(lineTotalCents)}
                          </div>
                        </td>
                        <td className="py-3 pl-3 align-middle text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="h-8 w-8 border-0 bg-transparent p-0 text-gray-400 shadow-none ring-0 hover:bg-transparent hover:text-red-600 dark:hover:bg-transparent dark:hover:text-red-400"
                            aria-label="Ta bort rad"
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
                <div className="flex items-center justify-between text-gray-500 dark:text-zinc-400">
                  <span>Delsumma</span>
                  <span className="tabular-nums">
                    {formatPrice(calculateTotalCost())}
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-500 dark:text-zinc-500">
                  <span>Frakt</span>
                  <span>—</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-3 dark:border-[#1F1F23]">
                  <span className="font-semibold text-gray-900 dark:text-zinc-100">Totalt</span>
                  <span className="text-lg font-bold tabular-nums text-gray-900 dark:text-zinc-100">
                    {formatPrice(calculateTotalCost())}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Betalning */}
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100 dark:shadow-none sm:p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
              Betalning
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500 dark:text-zinc-500">Betalningsmetod</span>
                <span className="text-gray-900 dark:text-zinc-100">
                  {formatPaymentMethodTypeLabel(reservation.payment_method_type)}
                </span>
              </div>
              {reservation.payment_method_type === "card" ||
              reservation.payment_method_brand ||
              reservation.payment_method_last4 ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500 dark:text-zinc-500">Kort</span>
                  <span className="text-right text-gray-900 dark:text-zinc-100">
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
                <span className="text-gray-500 dark:text-zinc-500">Stripe-miljö</span>
                <span className="text-gray-900 dark:text-zinc-100">{getStripeEnvLabel()}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500 dark:text-zinc-500">Betalningsläge</span>
                <span className="text-gray-900 dark:text-zinc-100">
                  {reservation.payment_mode ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500 dark:text-zinc-500">Betalningsstatus</span>
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${paymentPill}`}
                >
                  {formatPaymentStatus(reservation.payment_status)}
                </span>
              </div>
              {reservation.payment_intent_id ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500 dark:text-zinc-500">Payment intent</span>
                  <span className="max-w-[220px] truncate font-mono text-xs text-gray-500 dark:text-zinc-400">
                    {reservation.payment_intent_id}
                  </span>
                </div>
              ) : null}
              {reservation.setup_intent_id ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500 dark:text-zinc-500">Setup intent</span>
                  <span className="max-w-[220px] truncate font-mono text-xs text-gray-500 dark:text-zinc-400">
                    {reservation.setup_intent_id}
                  </span>
                </div>
              ) : null}
            </div>
          </section>

          {/* Anteckningar */}
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100 dark:shadow-none sm:p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
              Anteckningar
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="order_id" className={cn("text-xs", ADMIN_LABEL_CLASS)}>
                  Order-ID
                </Label>
                <Input
                  id="order_id"
                  value={formData.order_id}
                  onChange={(e) => handleInputChange("order_id", e.target.value)}
                  placeholder="Orderreferens"
                  className={cn(
                    "h-9 text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-500",
                    ADMIN_FIELD_CLASS,
                  )}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes" className={cn("text-xs", ADMIN_LABEL_CLASS)}>
                  Interna anteckningar
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Övriga anteckningar"
                  rows={3}
                  className={cn(
                    "min-h-[100px] text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-500",
                    ADMIN_FIELD_CLASS,
                  )}
                />
              </div>
            </div>
          </section>
        </div>

        {/* RIGHT: sidebar */}
        <aside className="min-w-0 space-y-6 lg:sticky lg:top-6 lg:self-start">
          {/* Reservationsöversikt */}
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100 dark:shadow-none sm:p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
              Reservationsöversikt
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="shrink-0 text-gray-500 dark:text-zinc-500">
                  Reservation
                </span>
                <span className="min-w-0 truncate font-mono text-xs text-gray-500 dark:text-zinc-400">
                  {reservation.id}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-gray-500 dark:text-zinc-500">Skapad</span>
                <span className="text-gray-900 dark:text-zinc-100">
                  {formatDate(reservation.created_at)}
                </span>
              </div>
              {reservation.checkout_group_id ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500 dark:text-zinc-500">Kassagrupp</span>
                  <span className="font-mono text-xs text-gray-500 dark:text-zinc-400">
                    {reservation.checkout_group_id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
              ) : null}
              {selectedPallet ? (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500 dark:text-zinc-500">Pall</span>
                  <Link
                    href={`/admin/pallets/${selectedPallet.id}`}
                    className="text-sm font-medium text-gray-900 underline underline-offset-2 dark:text-zinc-100"
                  >
                    {selectedPallet.name}
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-4">
                  <span className="text-gray-500 dark:text-zinc-500">Pall</span>
                  <span className="text-gray-900 dark:text-zinc-100">—</span>
                </div>
              )}
            </div>
          </section>

          {/* Kund */}
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100 dark:shadow-none sm:p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
              Kund
            </div>
            <div className="mt-4 space-y-2">
              <div className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                {reservation.user_id ? "Kund" : "—"}
              </div>
              <div className="break-all font-mono text-xs text-gray-500 dark:text-zinc-500">
                {reservation.user_id ?? "Inget user_id"}
              </div>
              {reservation.user_id ? (
                <Link
                  href={`/admin/users/${reservation.user_id}`}
                  className="inline-flex text-xs font-medium text-gray-800 underline underline-offset-2 dark:text-zinc-200"
                >
                  Visa kund
                </Link>
              ) : null}
            </div>
          </section>

          {/* Leverans */}
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100 dark:shadow-none sm:p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
              Leverans
            </div>
            <div className="mt-4 space-y-3">
              <div className="space-y-2">
                <Label htmlFor="delivery_address" className={cn("text-xs", ADMIN_LABEL_CLASS)}>
                  Adress
                </Label>
                <Textarea
                  id="delivery_address"
                  value={formData.delivery_address}
                  onChange={(e) =>
                    handleInputChange("delivery_address", e.target.value)
                  }
                  placeholder="Fullständig leveransadress"
                  rows={3}
                  className={cn(
                    "min-h-[100px] text-sm placeholder:text-gray-400 dark:placeholder:text-zinc-500",
                    ADMIN_FIELD_CLASS,
                  )}
                />
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-500">Leveranszon</span>
                <span className="text-gray-900 dark:text-zinc-100">
                  {selectedDeliveryZone?.name ?? "—"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500 dark:text-zinc-500">Upphämtningszon</span>
                <span className="text-gray-900 dark:text-zinc-100">
                  {selectedPickupZone?.name ?? "—"}
                </span>
              </div>
            </div>
          </section>

          {/* Statushantering */}
          <section className="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm text-gray-900 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100 dark:shadow-none sm:p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-gray-500 dark:text-zinc-500">
              Statushantering
            </div>
            <div className="mt-4 space-y-4">
              <div className="rounded-md border border-gray-200 bg-gray-50 p-3 space-y-3 dark:border-[#1F1F23] dark:bg-zinc-900/50">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-900 dark:text-zinc-100">Arkiv</p>
                    <p className="text-[11px] text-gray-500 dark:text-zinc-500 mt-0.5">
                      Stannar i databasen; räknas inte som aktiv order. Ingen e-post skickas.
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                      isArchived
                        ? "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}
                  >
                    {isArchived ? "Arkiverad" : "Aktiv"}
                  </span>
                </div>
                {!isArchived ? (
                  <div className="space-y-2">
                    <Label
                      htmlFor="archive_reason"
                      className={cn("text-xs", ADMIN_LABEL_CLASS)}
                    >
                      Arkivorsak (valfritt)
                    </Label>
                    <Input
                      id="archive_reason"
                      value={archiveReason}
                      onChange={(e) => setArchiveReason(e.target.value)}
                      placeholder="t.ex. gammal Middle Languedoc-pall"
                      className={cn("h-9 text-sm", ADMIN_FIELD_CLASS)}
                    />
                  </div>
                ) : reservation.status_before_archive ? (
                  <p className="text-[11px] text-gray-500 dark:text-zinc-500">
                    Tidigare status: {reservation.status_before_archive}
                  </p>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={archiveBusy}
                  onClick={handleArchiveToggle}
                  className={cn(ADMIN_OUTLINE_BUTTON_CLASS, "w-full text-xs")}
                >
                  {archiveBusy
                    ? "Arbetar…"
                    : isArchived
                      ? "Avarkivera"
                      : "Arkivera reservation"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className={cn("text-xs", ADMIN_LABEL_CLASS)}>
                  Reservationsstatus
                </Label>
                <Select
                  value={formData.status || undefined}
                  onValueChange={(value) => handleInputChange("status", value)}
                  disabled={isArchived}
                >
                  <SelectTrigger className={cn("h-9 text-sm", ADMIN_FIELD_CLASS)}>
                    <SelectValue placeholder="Välj status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Väntande</SelectItem>
                    <SelectItem value="pending_producer_approval">
                      Väntar på godkännande
                    </SelectItem>
                    <SelectItem value="approved">Godkänd</SelectItem>
                    <SelectItem value="partly_approved">Delvis godkänd</SelectItem>
                    <SelectItem value="placed">Lagd</SelectItem>
                    <SelectItem value="pending_payment">Väntar på betalning</SelectItem>
                    <SelectItem value="confirmed">Bekräftad</SelectItem>
                    <SelectItem value="rejected">Avvisad</SelectItem>
                    <SelectItem value="cancelled">Avbruten</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pallet_id" className={cn("text-xs", ADMIN_LABEL_CLASS)}>
                  Pall
                </Label>
                <Select
                  value={formData.pallet_id || undefined}
                  onValueChange={(value) => handleInputChange("pallet_id", value)}
                >
                  <SelectTrigger className={cn("h-9 text-sm", ADMIN_FIELD_CLASS)}>
                    <SelectValue placeholder="Välj pall" />
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
                  <Label htmlFor="pickup_zone" className={cn("text-xs", ADMIN_LABEL_CLASS)}>
                    Upphämtningszon
                  </Label>
                  <Select
                    value={formData.pickup_zone_id || undefined}
                    onValueChange={(value) =>
                      handleInputChange("pickup_zone_id", value)
                    }
                  >
                    <SelectTrigger className={cn("h-9 text-sm", ADMIN_FIELD_CLASS)}>
                      <SelectValue placeholder="Välj upphämtningszon" />
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
                  <Label htmlFor="delivery_zone" className={cn("text-xs", ADMIN_LABEL_CLASS)}>
                    Leveranszon
                  </Label>
                  <Select
                    value={formData.delivery_zone_id || undefined}
                    onValueChange={(value) =>
                      handleInputChange("delivery_zone_id", value)
                    }
                  >
                    <SelectTrigger className={cn("h-9 text-sm", ADMIN_FIELD_CLASS)}>
                      <SelectValue placeholder="Välj leveranszon" />
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
                className="h-9 w-full rounded-lg text-xs font-medium bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 disabled:opacity-60"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Sparar…" : "Spara ändringar"}
              </Button>
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
