"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Mail, CreditCard } from "lucide-react";

function PaymentCancelledContent() {
  const searchParams = useSearchParams();
  const reservationId = searchParams.get("reservation_id");
  const [reservationDetails, setReservationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (reservationId) {
      fetchReservationDetails(reservationId);
    } else {
      setLoading(false);
    }
  }, [reservationId]);

  const fetchReservationDetails = async (reservationId: string) => {
    try {
      // You could create an API endpoint to fetch reservation details
      // For now, we'll show a generic message
      setReservationDetails({
        id: reservationId,
        deadline: "7 days from now",
      });
    } catch (error) {
      console.error("Error fetching reservation details:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 pt-top-spacing">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 pt-top-spacing">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle className="w-12 h-12 text-amber-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Payment Cancelled
        </h1>

        <p className="text-lg text-gray-600 mb-6">
          Your payment was cancelled. Don't worry - your reservation is still
          valid.
        </p>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Your Reservation Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-amber-900">
                  Payment Pending
                </h3>
                <p className="text-amber-800 text-sm">
                  Your reservation is still active and waiting for payment.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Payment deadline:{" "}
                {reservationDetails?.deadline ||
                  "7 days from pallet completion"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                Check your email for the payment link
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>What You Can Do Now</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">
              Option 1: Complete Payment
            </h3>
            <p className="text-gray-600 text-sm">
              Check your email for the payment link and complete your payment to
              secure your order.
            </p>
            <Button className="w-full sm:w-auto">Check My Email</Button>
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900">
              Option 2: Contact Support
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              If you're having trouble with payment or need assistance, our
              support team can help.
            </p>
            <Button variant="outline" className="w-full sm:w-auto">
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-red-900 mb-2">Important Notice</h3>
        <p className="text-red-800 text-sm">
          If you don't complete your payment by the deadline, your reservation
          will be released and made available to other customers. Make sure to
          complete your payment to secure your order.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link href="/profile">
          <Button variant="outline" className="w-full sm:w-auto">
            View My Reservations
          </Button>
        </Link>

        <Link href="/">
          <Button variant="outline" className="w-full sm:w-auto">
            Browse More Wines
          </Button>
        </Link>
      </div>

      <div className="text-center mt-8">
        <p className="text-sm text-gray-500">
          Need help? Contact us at{" "}
          <a
            href="mailto:support@pactwines.com"
            className="text-blue-600 hover:underline"
          >
            support@pactwines.com
          </a>
        </p>
      </div>
    </div>
  );
}

export default function PaymentCancelledPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-2xl mx-auto p-6 pt-top-spacing">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      }
    >
      <PaymentCancelledContent />
    </Suspense>
  );
}
