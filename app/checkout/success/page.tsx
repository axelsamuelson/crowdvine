"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Package,
  MapPin,
  Calendar,
  ArrowRight,
  Eye,
  DollarSign,
  Truck,
  Home,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

interface ReservationDetails {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  pallet_name?: string;
  pallet_cost_cents?: number;
  pallet_capacity?: number;
  pickup_zone?: string;
  delivery_zone?: string;
  delivery_address?: string;
  total_amount_cents?: number;
  shipping_cost_cents?: number;
  customer_email?: string;
  customer_name?: string;
  order_type?: "producer" | "warehouse";
  payment_method_type?: "card" | "invoice";
  items: Array<{
    wine_name: string;
    quantity: number;
    vintage: string;
    price_cents: number;
    image_url?: string;
    product_handle?: string;
    producer_name?: string;
    customer_email?: string;
    customer_name?: string;
    source?: "producer" | "warehouse";
  }>;
  shared?: Array<{
    to_user: { id: string; full_name?: string; avatar_image_path?: string };
    total_cents: number;
    items: Array<{
      wine_id: string;
      wine_name: string;
      vintage: string;
      producer_name?: string;
      product_handle?: string;
      image_url?: string;
      quantity: number;
      price_cents: number;
    }>;
  }>;
}

function CheckoutConfirmationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetails | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const reservationId = searchParams.get("reservationId");
  const message = searchParams.get("message");

  useEffect(() => {
    if (message) {
      toast.success(decodeURIComponent(message));
    }

    if (reservationId) {
      fetchReservationDetails();
    } else {
      setLoading(false);
    }

    // Clear cart cache when success page loads
    localStorage.removeItem("cart-cache");
    localStorage.removeItem("cart-cache-time");
  }, [reservationId, message]);

  const fetchReservationDetails = async () => {
    try {
      const response = await fetch(`/api/user/reservations/${reservationId}`);
      if (response.ok) {
        const data = await response.json();
        setReservation(data);

        // Send order confirmation email
        await sendOrderConfirmationEmail(data);
      } else {
        toast.error("Failed to fetch reservation details");
      }
    } catch (error) {
      console.error("Error fetching reservation:", error);
      toast.error("Failed to fetch reservation details");
    } finally {
      setLoading(false);
    }
  };

  const sendOrderConfirmationEmail = async (
    reservationData: ReservationDetails,
  ) => {
    try {
      console.log("📧 Attempting to send order confirmation email...");
      console.log("📧 Reservation data:", reservationData);

      // Get user email from reservation data
      const userEmail =
        reservationData.customer_email ||
        reservationData.items[0]?.customer_email ||
        "customer@pactwines.com"; // Fallback
      const userName =
        reservationData.customer_name ||
        reservationData.items[0]?.customer_name ||
        "Valued Customer"; // Fallback

      console.log("📧 Using email:", userEmail, "and name:", userName);

      const emailData = {
        customerEmail: userEmail,
        customerName: userName,
        orderId: reservationData.order_id || reservationData.id,
        orderDate: new Date(reservationData.created_at).toLocaleDateString(),
        items: reservationData.items.map((item) => ({
          name: `${item.wine_name} ${item.vintage}`,
          quantity: item.quantity,
          price: item.price_cents / 100, // Convert to SEK
          image: undefined, // Could add wine images if available
        })),
        subtotal:
          reservationData.items.reduce(
            (sum, item) => sum + item.price_cents * item.quantity,
            0,
          ) / 100,
        tax: 0, // Could calculate tax if needed
        shipping: (reservationData.shipping_cost_cents || 0) / 100,
        total: (reservationData.total_amount_cents || 0) / 100,
        shippingAddress: {
          name: userName,
          street: reservationData.delivery_address || "Address not provided",
          city: "City", // Could extract from delivery address
          postalCode: "12345", // Could extract from delivery address
          country: "Sweden",
        },
      };

      console.log("📧 Email data prepared:", emailData);

      const response = await fetch("/api/email/order-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(emailData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("📧 Order confirmation email sent successfully:", result);
        toast.success("Confirmation email sent!");
      } else {
        const errorText = await response.text();
        console.error("📧 Failed to send order confirmation email:", errorText);
        toast.error("Failed to send confirmation email");
      }
    } catch (error) {
      console.error("📧 Error sending order confirmation email:", error);
      toast.error("Error sending confirmation email");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "placed":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-emerald-100 text-emerald-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatPrice = (cents: number) => {
    return `${Math.round(cents / 100)} SEK`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading reservation details...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto p-6 pt-top-spacing space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl font-medium text-gray-900 mb-2">
              Reservation confirmed
            </h1>
            <p className="text-gray-500">
              Your bottles are reserved. We’ll notify you when your pallet is
              ready for payment and shipment.
            </p>
            {reservation && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mt-3">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(reservation.created_at)}</span>
              </div>
            )}
          </div>

          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="h-6 w-6 text-green-700" />
          </div>
        </div>

        {!reservation ? (
          <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
            <CardContent className="p-0">
              <p className="text-gray-600">
                We couldn’t load reservation details. Please try again.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button
                  onClick={() => router.push("/profile/reservations")}
                  className="bg-black hover:bg-black/90 text-white rounded-full"
                >
                  View reservations
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/shop")}
                  className="rounded-full"
                >
                  Continue shopping
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Summary */}
            <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
              <CardContent className="p-0 space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-sm text-gray-500">Reservation ID</div>
                    <div className="font-mono text-sm text-gray-900 break-all mt-1">
                      {reservation.id}
                    </div>
                  </div>
                  <Badge className={getStatusColor(reservation.status)}>
                    {reservation.status.charAt(0).toUpperCase() +
                      reservation.status.slice(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {reservation.pickup_zone && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs text-gray-500 mb-1">
                        Pickup zone
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.pickup_zone}
                      </div>
                    </div>
                  )}
                  {reservation.delivery_zone && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs text-gray-500 mb-1">
                        Delivery zone
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.delivery_zone}
                      </div>
                    </div>
                  )}
                  {reservation.pallet_name && (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="text-xs text-gray-500 mb-1">Pallet</div>
                      <div className="text-sm font-medium text-gray-900">
                        {reservation.pallet_name}
                      </div>
                    </div>
                  )}
                </div>

                {reservation.delivery_address && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-2">
                      <Home className="h-4 w-4 text-gray-600" />
                      Delivery address
                    </div>
                    <div className="text-sm text-gray-600">
                      {reservation.delivery_address}
                    </div>
                  </div>
                )}

                {reservation.shared && reservation.shared.length > 0 && (
                  <div className="rounded-2xl border border-gray-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-4 mb-3">
                      <div className="text-sm font-medium text-gray-900">
                        Shared bottles
                      </div>
                      <div className="text-xs text-gray-500">
                        {reservation.shared.length}{" "}
                        {reservation.shared.length === 1 ? "person" : "people"}
                      </div>
                    </div>

                    <div className="space-y-3">
                      {reservation.shared.map((share) => (
                        <div
                          key={share.to_user.id}
                          className="rounded-xl border border-gray-200 bg-gray-50 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">
                                {share.to_user.full_name || "Friend"}
                              </div>
                              <div className="text-xs text-gray-500">
                                {share.items.reduce(
                                  (sum, i) => sum + (i.quantity || 0),
                                  0,
                                )}{" "}
                                bottles
                              </div>
                            </div>
                            <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                              {formatPrice(share.total_cents || 0)}
                            </div>
                          </div>

                          <div className="mt-3 space-y-2">
                            {share.items.map((i) => (
                              <div
                                key={`${share.to_user.id}-${i.wine_id}`}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <div className="min-w-0">
                                  <div className="text-gray-900 truncate">
                                    {i.wine_name} {i.vintage}
                                  </div>
                                  {i.producer_name ? (
                                    <div className="text-xs text-gray-500 truncate">
                                      {i.producer_name}
                                    </div>
                                  ) : null}
                                </div>
                                <div className="text-gray-700 whitespace-nowrap">
                                  × {i.quantity}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-gray-500 mt-3">
                      Split reflects bottle prices only. Shipping is not split.
                    </div>
                  </div>
                )}

                <div className="rounded-2xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-900 mb-3">
                    <DollarSign className="h-4 w-4 text-gray-600" />
                    Total
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div className="text-sm text-gray-500">Amount</div>
                    <div className="text-xl font-medium text-gray-900">
                      {formatPrice(reservation.total_amount_cents || 0)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Right: Items + next steps */}
            <div className="space-y-6">
              <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
                <CardContent className="p-0">
                  <div className="flex items-center justify-between gap-4 mb-4">
                    <div className="text-lg font-medium text-gray-900">
                      Reserved bottles
                    </div>
                    {reservation.order_type && (
                      <Badge 
                        variant="outline" 
                        className={
                          reservation.order_type === "warehouse"
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-blue-50 border-blue-200 text-blue-700"
                        }
                      >
                        {reservation.order_type === "warehouse" 
                          ? "Warehouse Order" 
                          : "Producer Order"}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    {reservation.items.map((item, index) => (
                      <div
                        key={index}
                        className={`flex gap-4 rounded-2xl border p-4 ${
                          item.source === "warehouse"
                            ? "border-green-200 bg-green-50"
                            : "border-gray-200 bg-gray-50"
                        }`}
                      >
                        <div className="relative w-16 h-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 border border-gray-200">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={`${item.wine_name} ${item.vintage}`}
                              fill
                              className="object-cover"
                              sizes="64px"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="text-sm font-medium text-gray-900 truncate">
                                  {item.wine_name} {item.vintage}
                                </div>
                                {item.source && (
                                  <Badge 
                                    variant="outline" 
                                    className={
                                      item.source === "warehouse"
                                        ? "bg-green-100 border-green-300 text-green-700 text-[10px] px-1.5 py-0"
                                        : "bg-blue-100 border-blue-300 text-blue-700 text-[10px] px-1.5 py-0"
                                    }
                                  >
                                    {item.source === "warehouse" ? "Warehouse" : "Producer"}
                                  </Badge>
                                )}
                              </div>
                              {item.producer_name && (
                                <div className="text-sm text-gray-500 truncate">
                                  {item.producer_name}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 mt-1">
                                {item.quantity}{" "}
                                {item.quantity === 1 ? "bottle" : "bottles"}
                                {item.source === "warehouse" && (
                                  <span className="ml-2 text-green-600">
                                    • Direct delivery
                                  </span>
                                )}
                                {item.source === "producer" && (
                                  <span className="ml-2 text-blue-600">
                                    • On pallet
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="text-sm font-medium text-gray-900 whitespace-nowrap">
                              {formatPrice(item.price_cents * item.quantity)}
                            </div>
                          </div>

                          {item.product_handle && (
                            <div className="mt-3">
                              <Link
                                href={`/product/${item.product_handle}`}
                                className="text-sm font-medium text-gray-900 underline underline-offset-4 hover:opacity-80"
                              >
                                View product
                              </Link>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="p-6 bg-white border border-gray-200 rounded-2xl">
                <CardContent className="p-0 space-y-4">
                  <div className="text-lg font-medium text-gray-900">
                    What happens next
                  </div>
                  <div className="space-y-3 text-sm text-gray-600">
                    <div className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium shrink-0">
                        1
                      </div>
                      <div>
                        You’ll get updates as the pallet fills up with other
                        orders.
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium shrink-0">
                        2
                      </div>
                      <div>
                        When it reaches 100%, we’ll email you a secure payment
                        link.
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="h-6 w-6 rounded-full bg-gray-900 text-white flex items-center justify-center text-xs font-medium shrink-0">
                        3
                      </div>
                      <div>
                        After payment, your wines ship to your pickup location.
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={() => router.push("/profile/reservations")}
                  className="bg-black hover:bg-black/90 text-white rounded-full flex-1"
                >
                  View reservations
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push("/shop")}
                  className="rounded-full flex-1"
                >
                  Continue shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function CheckoutConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto p-6 pt-top-spacing">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      }
    >
      <CheckoutConfirmationContent />
    </Suspense>
  );
}
