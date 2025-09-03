'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface ReservationSuccess {
  success: boolean;
  reservationId: string;
  message: string;
}

export default function CheckoutSuccessPage() {
  const [reservationData, setReservationData] = useState<ReservationSuccess | null>(null);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if we have reservation data in URL params
    const success = searchParams.get('success');
    const reservationId = searchParams.get('reservationId');
    const message = searchParams.get('message');

    if (success === 'true' && reservationId) {
      setReservationData({
        success: true,
        reservationId,
        message: message || 'Reservation placed successfully'
      });
    }
    setLoading(false);
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

  if (!reservationData) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Reservation Not Found</h1>
          <p className="text-gray-600 mb-6">
            We couldn't find your reservation details. Please check your email for confirmation or contact support.
          </p>
          <Link href="/" className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
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
          <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reservation Confirmed!</h1>
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
            <span>{new Date().toLocaleDateString('sv-SE')}</span>
          </div>
        </div>
      </div>

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
                We'll match your reservation with other customers in the same pickup and delivery zones.
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
                When enough reservations match, we'll form a pallet and notify you.
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
                We'll charge your saved payment method and arrange delivery to your address.
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
            <span>No payment has been charged yet. We only charge when a pallet is formed.</span>
          </li>
          <li className="flex items-start">
            <span className="text-yellow-600 mr-2">•</span>
            <span>You can cancel your reservation at any time before the pallet is formed.</span>
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
