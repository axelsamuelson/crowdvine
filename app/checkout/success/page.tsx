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
    <div className="min-h-screen bg-gray-50 py-8 pt-top-spacing">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            🍷 Wine Reservation Confirmed!
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Your premium wine collection has been successfully reserved
          </p>
          {reservation && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>Reserved on {formatDate(reservation.created_at)}</span>
            </div>
          )}
        </div>

        {/* Reservation Details */}
        {reservation && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Reservation Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Status and ID */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Reservation ID</p>
                  <p className="font-mono text-lg font-semibold">
                    {reservation.id}
                  </p>
                </div>
                <Badge className={getStatusColor(reservation.status)}>
                  {reservation.status.charAt(0).toUpperCase() +
                    reservation.status.slice(1)}
                </Badge>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Placed on</p>
                  <p className="font-medium">
                    {formatDate(reservation.created_at)}
                  </p>
                </div>
              </div>

              {/* Zones and Pallet */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {reservation.pickup_zone && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm text-gray-500">Pickup Zone</p>
                      <p className="font-medium">{reservation.pickup_zone}</p>
                    </div>
                  </div>
                )}

                {reservation.delivery_zone && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm text-gray-500">Delivery Zone</p>
                      <p className="font-medium">{reservation.delivery_zone}</p>
                    </div>
                  </div>
                )}

                {reservation.pallet_name && (
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="text-sm text-gray-500">Pallet</p>
                      <p className="font-medium">{reservation.pallet_name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Reserved Wines
                </h3>
                <div className="grid gap-4">
                  {reservation.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex gap-4 p-4 bg-gray-50 rounded-lg border"
                    >
                      {/* Wine Image */}
                      <div className="relative w-20 h-20 shrink-0 overflow-hidden rounded-md">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={`${item.wine_name} ${item.vintage}`}
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Wine Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 truncate">
                              {item.wine_name}
                            </h4>
                            {item.producer_name && (
                              <p className="text-sm text-gray-600 truncate">
                                by {item.producer_name}
                              </p>
                            )}
                            <p className="text-sm text-gray-500">
                              Vintage {item.vintage}
                            </p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-sm text-gray-600">
                                {item.quantity}{" "}
                                {item.quantity === 1 ? "bottle" : "bottles"}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {formatPrice(item.price_cents * item.quantity)}
                              </span>
                            </div>
                          </div>

                          {/* View Product Link */}
                          {item.product_handle && (
                            <Link
                              href={`/product/${item.product_handle}`}
                              className="shrink-0 text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cost Breakdown */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Cost Breakdown
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Wine Subtotal:</span>
                    <span className="font-medium">
                      {formatPrice(
                        reservation.items.reduce(
                          (sum, item) => sum + item.price_cents * item.quantity,
                          0,
                        ),
                      )}
                    </span>
                  </div>
                  {reservation.shipping_cost_cents &&
                    reservation.shipping_cost_cents > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">
                          {formatPrice(reservation.shipping_cost_cents)}
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Total:</span>
                    <span>
                      {formatPrice(reservation.total_amount_cents || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Address */}
              {reservation.delivery_address && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Home className="w-5 h-5" />
                    Delivery Address
                  </h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-900">
                      {reservation.delivery_address}
                    </p>
                  </div>
                </div>
              )}

              {/* Pallet Information */}
              {reservation.pallet_name && (
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Truck className="w-5 h-5" />
                    Pallet Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600 font-medium">
                        Pallet Name
                      </p>
                      <p className="text-blue-900 font-semibold">
                        {reservation.pallet_name}
                      </p>
                    </div>
                    {reservation.pallet_cost_cents && (
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-600 font-medium">
                          Pallet Cost
                        </p>
                        <p className="text-green-900 font-semibold">
                          {formatPrice(reservation.pallet_cost_cents)}
                        </p>
                      </div>
                    )}
                    {reservation.pallet_capacity && (
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <p className="text-sm text-purple-600 font-medium">
                          Capacity
                        </p>
                        <p className="text-purple-900 font-semibold">
                          {reservation.pallet_capacity} bottles
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Next Steps */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium">Confirmation Email</p>
                <p className="text-sm text-gray-600">
                  You'll receive a confirmation email with your reservation
                  details and tracking information.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium">Preparation</p>
                <p className="text-sm text-gray-600">
                  Your wines will be prepared and loaded onto the assigned
                  pallet for delivery.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium">Delivery</p>
                <p className="text-sm text-gray-600">
                  Your wines will be delivered to your specified address within
                  the delivery zone.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => router.push("/profile/reservations")}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            View All Reservations
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/")}
            className="flex items-center gap-2"
          >
            Continue Shopping
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
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
