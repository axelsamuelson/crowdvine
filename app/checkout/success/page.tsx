"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Package, MapPin, Calendar, ArrowRight, Eye } from "lucide-react";
import { toast } from "sonner";

interface ReservationDetails {
  id: string;
  status: string;
  created_at: string;
  pallet_name?: string;
  pickup_zone?: string;
  delivery_zone?: string;
  items: Array<{
    wine_name: string;
    quantity: number;
    vintage: string;
  }>;
}

export default function CheckoutConfirmationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetails | null>(null);
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
  }, [reservationId, message]);

  const fetchReservationDetails = async () => {
    try {
      const response = await fetch(`/api/user/reservations/${reservationId}`);
      if (response.ok) {
        const data = await response.json();
        setReservation(data);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reservation Confirmed!
          </h1>
          <p className="text-lg text-gray-600">
            Your wine reservation has been successfully placed
          </p>
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
                  <p className="font-mono text-lg font-semibold">{reservation.id}</p>
                </div>
                <Badge className={getStatusColor(reservation.status)}>
                  {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                </Badge>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm text-gray-500">Placed on</p>
                  <p className="font-medium">{formatDate(reservation.created_at)}</p>
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
                <h3 className="text-lg font-semibold mb-3">Wine Selection</h3>
                <div className="space-y-2">
                  {reservation.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="font-medium">{item.wine_name}</p>
                        <p className="text-sm text-gray-500">{item.vintage}</p>
                      </div>
                      <Badge variant="outline">{item.quantity} bottles</Badge>
                    </div>
                  ))}
                </div>
              </div>
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
                <p className="text-sm text-gray-600">You'll receive a confirmation email with your reservation details and tracking information.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium">Preparation</p>
                <p className="text-sm text-gray-600">Your wines will be prepared and loaded onto the assigned pallet for delivery.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <p className="font-medium">Delivery</p>
                <p className="text-sm text-gray-600">Your wines will be delivered to your specified address within the delivery zone.</p>
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