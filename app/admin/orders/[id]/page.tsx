"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, User, Package, MapPin, CreditCard, CheckCircle } from "lucide-react";

export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string; // Change to 'id' to match existing dynamic route pattern
  
  const [orderData, setOrderData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      // Fetch reservation details (handles both order_id and id lookup)
      const reservationResponse = await fetch(`/api/admin/reservations/${orderId}`);
      const reservationData = await reservationResponse.json();
      
      if (!reservationData.reservation) {
        throw new Error("Reservation not found");
      }
      
      const reservation = reservationData.reservation;
      
      // Convert reservation items to booking-like structure for easier display
      const reservationBookings = reservation.order_reservation_items?.map((item: any) => ({
        id: item.id,
        quantity: item.quantity,
        wines: item.wines,
        pallets: { name: "No Pallet" }, // No pallet info available in reservation_items
        created_at: reservation.created_at,
        band: null, // Not available in reservation data
      })) || [];
      
      setOrderData(reservation);
      setBookings(reservationBookings);
    } catch (error) {
      console.error("Failed to fetch order details:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(priceCents / 100);
  };

  const calculateTotal = () => {
    return bookings.reduce((sum, booking) => 
      sum + (booking.wines?.base_price_cents || 0) * booking.quantity, 0
    );
  };

  const totalBottles = bookings.reduce((sum, booking) => sum + booking.quantity, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-10 w-10"></div>
          <div className="space-y-2 flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!orderData) {
    return (
      <div className="space-y-6">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2 text-gray-900">
                Order not found
              </h3>
              <p className="text-gray-500">
                The order with ID {orderId} could not be found.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Orders
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            Edit Order
          </Button>
          <Button variant="outline" size="sm">
            Export PDF
          </Button>
        </div>
      </div>

      {/* Order Info */}
      <Card>
        <CardHeader>
          <CardTitle>Order #{orderData.order_id?.substring(0, 8) || "Unknown"}</CardTitle>
          <CardDescription>
            Order placed on {new Date(orderData.created_at).toLocaleDateString("sv-SE")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Customer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="w-4 h-4" />
                Customer
              </div>
              <div>
                <div className="font-medium">
                  {orderData.profiles?.full_name || 
                   `${orderData.profiles?.first_name || ''} ${orderData.profiles?.last_name || ''}`.trim() ||
                   orderData.profiles?.email ||
                   'Unknown Customer'}
                </div>
                <div className="text-sm text-gray-500">
                  {orderData.profiles?.email}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                Status
              </div>
              <Badge
                variant="secondary"
                className={
                  orderData.status === "placed"
                    ? "bg-green-100 text-green-800"
                    : orderData.status === "confirmed"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }
              >
                {orderData.status || "Unknown"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Package className="w-4 h-4" />
                Total Value
              </div>
              <div className="text-lg font-semibold">
                {formatPrice(calculateTotal())}
              </div>
              <div className="text-xs text-gray-500">
                {totalBottles} bottles
              </div>
            </div>
          </div>

          {/* Payment & Fulfillment Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CreditCard className="w-4 h-4" />
                Payment Status
              </div>
              <Badge
                variant="secondary"
                className={
                  orderData.payment_status === "paid"
                    ? "bg-green-100 text-green-800"
                    : orderData.payment_status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {orderData.payment_status || "Unknown"}
              </Badge>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4" />
                Fulfillment Status
              </div>
              <Badge
                variant="secondary"
                className={
                  orderData.fulfillment_status === "fulfilled"
                    ? "bg-green-100 text-green-800"
                    : orderData.fulfillment_status === "processing"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-gray-100 text-gray-800"
                }
              >
                {orderData.fulfillment_status || "Pending"}
              </Badge>
            </div>
          </div>

          {/* Delivery Zones */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              Delivery Information
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">Delivery Zone</div>
                <div className="text-sm">
                  {orderData.delivery_zone_id ? `Zone ${orderData.delivery_zone_id}` : "None"}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Pickup Zone</div>
                <div className="text-sm">
                  {orderData.pickup_zone_id ? `Zone ${orderData.pickup_zone_id}` : "None"}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <CardTitle>Order Items ({bookings.length})</CardTitle>
          <CardDescription>
            Wine bottles included in this order
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length > 0 ? (
            <div className="space-y-4">
              {bookings.map((order: any, index) => (
                <div key={order.id} className="border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-start">
                    <div className="md:col-span-2">
                      <div className="font-medium text-gray-900">
                        {order.wines?.wine_name} {order.wines?.vintage}
                      </div>
                      <div className="text-sm text-gray-500">
                        {order.wines?.producers?.name}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Quantity</div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        {order.quantity} bottles
                      </Badge>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Price Each</div>
                      <div className="text-sm font-medium">
                        {formatPrice(order.wines?.base_price_cents || 0)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Total</div>
                      <div className="text-sm font-semibold">
                        {formatPrice((order.wines?.base_price_cents || 0) * order.quantity)}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Pallet</div>
                      <div className="text-sm">
                        {order.pallets?.name || "No Pallet Assigned"}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No items found for this order.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
