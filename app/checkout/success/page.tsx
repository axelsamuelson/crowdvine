"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface ReservationSuccess {
  success: boolean;
  reservationId: string;
  message: string;
}

interface WineItem {
  quantity: number;
  price_band: string;
  wines: {
    id: string;
    wine_name: string;
    vintage: string;
    grape_varieties: string;
    color: string;
    base_price_cents: number;
    producers: {
      name: string;
      region: string;
      country_code: string;
    };
  };
}

interface ReservationDetails {
  reservation: {
    id: string;
    status: string;
    created_at: string;
    address: {
      full_name: string;
      email: string;
      phone: string;
      address_street: string;
      address_postcode: string;
      address_city: string;
      country_code: string;
    };
    zones: {
      pickup: { name: string; zone_type: string } | null;
      delivery: { name: string; zone_type: string } | null;
    } | null;
    pallet: {
      id: string;
      name: string;
      bottle_capacity: number;
      currentBottles: number;
      remainingBottles: number;
    } | null;
    tracking: {
      code: string;
      created_at: string;
    } | null;
  };
  items: WineItem[];
}

export default function CheckoutSuccessPage() {
  const [reservationData, setReservationData] =
    useState<ReservationSuccess | null>(null);
  const [reservationDetails, setReservationDetails] =
    useState<ReservationDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we have reservation data in URL params
    const success = searchParams.get("success");
    const reservationId = searchParams.get("reservationId");
    const message = searchParams.get("message");

    if (success === "true" && reservationId) {
      setReservationData({
        success: true,
        reservationId,
        message: message || "Reservation placed successfully",
      });

      // Fetch detailed reservation information
      fetchReservationDetails(reservationId);
    }
    setLoading(false);
  }, [searchParams]);

  const fetchReservationDetails = async (reservationId: string) => {
    setDetailsLoading(true);
    try {
      const response = await fetch(
        `/api/reservation-details?reservationId=${reservationId}`,
      );
      if (response.ok) {
        const details = await response.json();
        setReservationDetails(details);
      }
    } catch (error) {
      console.error("Failed to fetch reservation details:", error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(priceCents / 100);
  };

  const calculateTotal = () => {
    if (!reservationDetails?.items) return 0;
    return reservationDetails.items.reduce((total, item) => {
      return total + item.wines.base_price_cents * item.quantity;
    }, 0);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!reservationData) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Reservation Not Found</h1>
          <p className="text-gray-600 mb-6">
            We couldn't find your reservation details. Please check your email
            for confirmation or contact support.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Reservation Confirmed!
        </h1>
        <p className="text-lg text-gray-600">
          Your wine reservation has been successfully placed.
        </p>
      </div>

      {/* Reservation Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Reservation Details</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Reservation ID:</span>
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {reservationData.reservationId}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Status:</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Placed
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span>{new Date().toLocaleDateString("sv-SE")}</span>
          </div>
          {reservationDetails?.reservation.tracking && (
            <div className="flex justify-between">
              <span className="text-gray-600">Tracking Code:</span>
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                {reservationDetails.reservation.tracking.code}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Wine Items */}
      {detailsLoading ? (
        <div className="bg-white rounded-lg p-6 mb-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      ) : reservationDetails?.items && reservationDetails.items.length > 0 ? (
        <div className="bg-white rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Wines</h2>
          <div className="space-y-4">
            {reservationDetails.items.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-gray-900">
                    {item.wines.wine_name}
                  </h3>
                  <span className="text-lg font-semibold text-gray-900">
                    {formatPrice(item.wines.base_price_cents * item.quantity)}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  {item.wines.vintage} • {item.wines.grape_varieties} •{" "}
                  {item.wines.color}
                </p>
                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>Producer: {item.wines.producers.name}</span>
                  <span>Quantity: {item.quantity} bottles</span>
                </div>
                <div className="text-sm text-gray-500">
                  <span>
                    Region: {item.wines.producers.region},{" "}
                    {item.wines.producers.country_code}
                  </span>
                </div>
              </div>
            ))}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total:</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatPrice(calculateTotal())}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Zone and Pallet Information */}
      {reservationDetails?.reservation.zones && (
        <div className="bg-blue-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Zone Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reservationDetails.reservation.zones.pickup && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Pickup Zone</h3>
                <p className="text-gray-600">
                  {reservationDetails.reservation.zones.pickup.name}
                </p>
              </div>
            )}
            {reservationDetails.reservation.zones.delivery && (
              <div className="bg-white rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">
                  Delivery Zone
                </h3>
                <p className="text-gray-600">
                  {reservationDetails.reservation.zones.delivery.name}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Pallet Information */}
      {reservationDetails?.reservation.pallet && (
        <div className="bg-green-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Pallet Information</h2>
          <div className="bg-white rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-gray-900">
                {reservationDetails.reservation.pallet.name}
              </h3>
              <span className="text-sm text-gray-500">
                {reservationDetails.reservation.pallet.currentBottles} /{" "}
                {reservationDetails.reservation.pallet.bottle_capacity} bottles
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
              <div
                className="bg-green-600 h-2.5 rounded-full"
                style={{
                  width: `${(reservationDetails.reservation.pallet.currentBottles / reservationDetails.reservation.pallet.bottle_capacity) * 100}%`,
                }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {reservationDetails.reservation.pallet.remainingBottles} bottles
              remaining to complete the pallet
            </p>
          </div>
        </div>
      )}

      {/* Delivery Address */}
      {reservationDetails?.reservation.address && (
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Delivery Address</h2>
          <div className="bg-white rounded-lg p-4">
            <p className="font-medium text-gray-900">
              {reservationDetails.reservation.address.full_name}
            </p>
            <p className="text-gray-600">
              {reservationDetails.reservation.address.address_street}
            </p>
            <p className="text-gray-600">
              {reservationDetails.reservation.address.address_postcode}{" "}
              {reservationDetails.reservation.address.address_city}
            </p>
            <p className="text-gray-600">
              {reservationDetails.reservation.address.country_code}
            </p>
            <p className="text-gray-600 mt-2">
              Phone: {reservationDetails.reservation.address.phone}
            </p>
            <p className="text-gray-600">
              Email: {reservationDetails.reservation.address.email}
            </p>
          </div>
        </div>
      )}

      {/* Next Steps */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">What Happens Next?</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs font-bold">1</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Zone Matching</h3>
              <p className="text-sm text-gray-600">
                We'll match your reservation with other customers in the same
                pickup and delivery zones.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs font-bold">2</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Pallet Formation</h3>
              <p className="text-sm text-gray-600">
                When enough reservations match, we'll form a pallet and notify
                you.
              </p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
              <span className="text-white text-xs font-bold">3</span>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Payment & Delivery</h3>
              <p className="text-sm text-gray-600">
                We'll charge your saved payment method and arrange delivery to
                your address.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Important Notes */}
      <div className="bg-yellow-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Important Information</h2>
        <ul className="space-y-2 text-sm text-gray-700">
          <li className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <span>
              No payment has been charged yet. We only charge when a pallet is
              formed.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <span>
              You can cancel your reservation at any time before the pallet is
              formed.
            </span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <span>We'll notify you via email when your pallet is ready.</span>
          </li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="flex-1 px-6 py-3 bg-gray-600 text-white text-center rounded-lg hover:bg-gray-700 transition-colors"
        >
          Continue Shopping
        </Link>
        <Link
          href="/profile"
          className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
        >
          View My Reservations
        </Link>
      </div>
    </div>
  );
}
