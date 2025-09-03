'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Reservation {
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
  items: WineItem[];
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

export default function ProfilePage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchUserReservations();
  }, []);

  const fetchUserReservations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/reservations');
      
      if (response.status === 401) {
        // User not authenticated
        setIsAuthenticated(false);
        setError(null);
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch reservations');
      }
      
      const data = await response.json();
      setReservations(data.reservations || []);
      setIsAuthenticated(true);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setError('Failed to load your reservations');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(priceCents / 100);
  };

  const calculateTotal = (items: WineItem[]) => {
    return items.reduce((total, item) => {
      return total + (item.wines.base_price_cents * item.quantity);
    }, 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('sv-SE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'placed':
        return 'bg-blue-100 text-blue-800';
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show signup/login page for unauthenticated users
  if (isAuthenticated === false) {
    // Use useEffect to handle redirect instead of doing it in render
    useEffect(() => {
      router.push('/log-in');
    }, [router]);
    
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Redirecting...</h1>
          <p className="text-gray-600 mb-6">Taking you to the login page...</p>
        </div>
      </div>
    );
  }

  // Show error for authenticated users with other errors
  if (error && isAuthenticated === true) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button 
            onClick={fetchUserReservations}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Reservations</h1>
        <p className="text-gray-600">
          View and track all your wine reservations
        </p>
      </div>

      {/* Reservations List */}
      {reservations.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Reservations Yet</h2>
          <p className="text-gray-600 mb-6">
            You haven't made any reservations yet. Start shopping to create your first reservation!
          </p>
          <Link 
            href="/shop" 
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Browse Wines
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {reservations.map((reservation) => (
            <div key={reservation.id} className="bg-white rounded-lg shadow-md border">
              {/* Reservation Header */}
              <div className="p-6 border-b">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Reservation #{reservation.id.slice(0, 8)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(reservation.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reservation.status)}`}>
                      {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                    </span>
                    {reservation.tracking && (
                      <span className="text-sm text-gray-500">
                        Tracking: {reservation.tracking.code}
                      </span>
                    )}
                  </div>
                </div>

                {/* Zone Information */}
                {reservation.zones && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    {reservation.zones.pickup && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-1">Pickup Zone</h4>
                        <p className="text-sm text-gray-600">{reservation.zones.pickup.name}</p>
                      </div>
                    )}
                    {reservation.zones.delivery && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <h4 className="font-medium text-gray-900 mb-1">Delivery Zone</h4>
                        <p className="text-sm text-gray-600">{reservation.zones.delivery.name}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pallet Information */}
                {reservation.pallet && (
                  <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Pallet Status</h4>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{reservation.pallet.name}</span>
                      <span className="text-sm text-gray-500">
                        {reservation.pallet.currentBottles} / {reservation.pallet.bottle_capacity} bottles
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${(reservation.pallet.currentBottles / reservation.pallet.bottle_capacity) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600">
                      {reservation.pallet.remainingBottles} bottles remaining to complete the pallet
                    </p>
                  </div>
                )}
              </div>

              {/* Wine Items */}
              {reservation.items && reservation.items.length > 0 && (
                <div className="p-6">
                  <h4 className="font-medium text-gray-900 mb-4">Wines</h4>
                  <div className="space-y-3">
                    {reservation.items.map((item, index) => (
                      <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex-1">
                          <h5 className="font-medium text-gray-900">{item.wines.wine_name}</h5>
                          <p className="text-sm text-gray-500">
                            {item.wines.vintage} • {item.wines.grape_varieties} • {item.wines.color}
                          </p>
                          <p className="text-sm text-gray-500">
                            Producer: {item.wines.producers.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-gray-900">
                            {item.quantity} × {formatPrice(item.wines.base_price_cents)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatPrice(item.wines.base_price_cents * item.quantity)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold">Total:</span>
                      <span className="text-xl font-bold text-gray-900">
                        {formatPrice(calculateTotal(reservation.items))}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Delivery Address */}
              {reservation.address && (
                <div className="p-6 bg-gray-50 rounded-b-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Delivery Address</h4>
                  <div className="text-sm text-gray-600">
                    <p className="font-medium">{reservation.address.full_name}</p>
                    <p>{reservation.address.address_street}</p>
                    <p>{reservation.address.address_postcode} {reservation.address.address_city}</p>
                    <p>{reservation.address.country_code}</p>
                    <p className="mt-2">Phone: {reservation.address.phone}</p>
                    <p>Email: {reservation.address.email}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex flex-col sm:flex-row gap-4">
        <Link 
          href="/shop" 
          className="flex-1 px-6 py-3 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 transition-colors"
        >
          Browse More Wines
        </Link>
        <Link 
          href="/" 
          className="flex-1 px-6 py-3 bg-gray-600 text-white text-center rounded-lg hover:bg-gray-700 transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
