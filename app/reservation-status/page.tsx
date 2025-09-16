"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

interface ReservationStatus {
  id: string;
  status: string;
  created_at: string;
  customer_name: string;
  customer_email: string;
  items: Array<{
    wine_name: string;
    vintage: string;
    quantity: number;
    price_band: string;
  }>;
  address: {
    street: string;
    postcode: string;
    city: string;
    country_code: string;
  };
}

function ReservationStatusContent() {
  const [reservation, setReservation] = useState<ReservationStatus | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const email = searchParams.get("email");
    const reservationId = searchParams.get("reservationId");
    const trackingCode = searchParams.get("trackingCode");

    if (!email || (!reservationId && !trackingCode)) {
      setError(
        "Email och antingen reservations-ID eller tracking-kod krävs för att kolla status",
      );
      setLoading(false);
      return;
    }

    const fetchReservationStatus = async () => {
      try {
        const params = new URLSearchParams();
        params.append("email", email);
        if (trackingCode) {
          params.append("trackingCode", trackingCode);
        } else if (reservationId) {
          params.append("reservationId", reservationId);
        }

        const response = await fetch(
          `/api/reservation-status?${params.toString()}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError(
              "Reservationen hittades inte. Kontrollera att email och reservations-ID/tracking-kod är korrekt.",
            );
          } else {
            setError("Ett fel uppstod när reservationsstatus skulle hämtas.");
          }
          return;
        }

        const data = await response.json();
        setReservation(data);
      } catch (err) {
        setError("Ett fel uppstod när reservationsstatus skulle hämtas.");
      } finally {
        setLoading(false);
      }
    };

    fetchReservationStatus();
  }, [searchParams]);

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

  if (error) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-8 h-8 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold mb-4">
            Kunde inte hitta reservationen
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tillbaka till startsidan
          </Link>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">
            Reservationen hittades inte
          </h1>
          <p className="text-gray-600 mb-6">
            Kontrollera att email och reservations-ID är korrekt.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tillbaka till startsidan
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "placed":
        return "bg-blue-100 text-blue-800";
      case "allocated":
        return "bg-yellow-100 text-yellow-800";
      case "charged":
        return "bg-green-100 text-green-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "delivered":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "placed":
        return "Placerad";
      case "allocated":
        return "Allokerad till pall";
      case "charged":
        return "Debiterad";
      case "shipped":
        return "Skickad";
      case "delivered":
        return "Levererad";
      case "cancelled":
        return "Avbruten";
      default:
        return status;
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-blue-600"
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
          Reservationsstatus
        </h1>
        <p className="text-lg text-gray-600">Status för din vinreservation</p>
      </div>

      {/* Reservation Details */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Reservationsdetaljer</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600">Reservations-ID:</span>
            <p className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {reservation.id}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Status:</span>
            <p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}
              >
                {getStatusText(reservation.status)}
              </span>
            </p>
          </div>
          <div>
            <span className="text-gray-600">Datum:</span>
            <p>
              {new Date(reservation.created_at).toLocaleDateString("sv-SE")}
            </p>
          </div>
          <div>
            <span className="text-gray-600">Kund:</span>
            <p>{reservation.customer_name}</p>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Beställda viner</h2>
        <div className="space-y-3">
          {reservation.items.map((item, index) => (
            <div
              key={index}
              className="flex justify-between items-center p-3 bg-white rounded border"
            >
              <div>
                <p className="font-medium">
                  {item.wine_name} {item.vintage}
                </p>
                <p className="text-sm text-gray-600">
                  Antal: {item.quantity} st
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  Prisband: {item.price_band}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Delivery Address */}
      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Leveransadress</h2>
        <div className="space-y-2">
          <p>{reservation.address.street}</p>
          <p>
            {reservation.address.postcode} {reservation.address.city}
          </p>
          <p>{reservation.address.country_code}</p>
        </div>
      </div>

      {/* Status Information */}
      <div className="bg-blue-50 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Statusinformation</h2>
        <div className="space-y-4">
          {reservation.status === "placed" && (
            <div className="flex items-start">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-white text-xs font-bold">1</span>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">
                  Reservation placerad
                </h3>
                <p className="text-sm text-gray-600">
                  Din reservation har mottagits och väntar på att matchas med
                  andra kunder i samma zon.
                </p>
              </div>
            </div>
          )}
          {reservation.status === "allocated" && (
            <>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-green-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    Allokerad till pall
                  </h3>
                  <p className="text-sm text-gray-600">
                    Din reservation har matchats med andra kunder och allokerats
                    till en pall.
                  </p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-yellow-600 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-white text-xs font-bold">2</span>
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">
                    Betalning kommer snart
                  </h3>
                  <p className="text-sm text-gray-600">
                    Vi kommer att debitera din sparade betalningsmetod när
                    pallen är redo att skickas.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/"
          className="flex-1 px-6 py-3 bg-gray-600 text-white text-center rounded-lg hover:bg-gray-700 transition-colors"
        >
          Tillbaka till startsidan
        </Link>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
        >
          Uppdatera status
        </button>
      </div>
    </div>
  );
}

export default function ReservationStatusPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto p-6 pt-top-spacing">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <ReservationStatusContent />
    </Suspense>
  );
}
