"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

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
  const hasRedirected = useRef(false);

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      setIsAuthenticated(false);
      router.push("/log-in");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  useEffect(() => {
    fetchUserReservations();

    // Listen for auth changes
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
      } else if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        fetchUserReservations();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle redirect for unauthenticated users
  useEffect(() => {
    if (isAuthenticated === false && !hasRedirected.current) {
      hasRedirected.current = true;
      router.push("/log-in");
    }
  }, [isAuthenticated, router]);

  const fetchUserReservations = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } = {} } = await supabase.auth.getUser();

      if (!user) {
        setIsAuthenticated(false);
        return;
      }

      setIsAuthenticated(true);

      const response = await fetch("/api/user/reservations");

      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setReservations(data.reservations || []);
    } catch (err) {
      console.error("Error fetching reservations:", err);
      setError("Failed to load your reservations");
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

  const calculateTotal = (items: WineItem[]) => {
    return items.reduce((total, item) => {
      return total + item.wines.base_price_cents * item.quantity;
    }, 0);
  };

  // Group reservations by pallet and consolidate information
  const groupedReservations = reservations.reduce((groups, reservation) => {
    const palletId = reservation.pallet?.id || 'no-pallet';
    if (!groups[palletId]) {
      groups[palletId] = {
        pallet: reservation.pallet,
        reservations: [],
        // Consolidate common information
        zones: reservation.zones,
        address: reservation.address,
        totalWines: 0,
        totalPrice: 0,
        allStatuses: new Set(),
        trackingCodes: new Set(),
        // Group wines by wine ID
        wines: new Map<string, {
          wine: WineItem['wines'];
          totalQuantity: number;
          orderIds: string[];
          totalPrice: number;
        }>()
      };
    }
    
    groups[palletId].reservations.push(reservation);
    
    // Aggregate information
    if (reservation.items) {
      groups[palletId].totalWines += reservation.items.reduce((sum, item) => sum + item.quantity, 0);
      groups[palletId].totalPrice += calculateTotal(reservation.items);
      
      // Group wines by wine ID
      reservation.items.forEach(item => {
        const wineId = item.wines.id;
        if (groups[palletId].wines.has(wineId)) {
          const existingWine = groups[palletId].wines.get(wineId)!;
          existingWine.totalQuantity += item.quantity;
          existingWine.orderIds.push(reservation.id);
          existingWine.totalPrice += item.wines.base_price_cents * item.quantity;
        } else {
          groups[palletId].wines.set(wineId, {
            wine: item.wines,
            totalQuantity: item.quantity,
            orderIds: [reservation.id],
            totalPrice: item.wines.base_price_cents * item.quantity
          });
        }
      });
    }
    
    groups[palletId].allStatuses.add(reservation.status);
    if (reservation.tracking?.code) {
      groups[palletId].trackingCodes.add(reservation.tracking.code);
    }
    
    return groups;
  }, {} as Record<string, { 
    pallet: Reservation['pallet']; 
    reservations: Reservation[];
    zones: Reservation['zones'];
    address: Reservation['address'];
    totalWines: number;
    totalPrice: number;
    allStatuses: Set<string>;
    trackingCodes: Set<string>;
    wines: Map<string, {
      wine: WineItem['wines'];
      totalQuantity: number;
      orderIds: string[];
      totalPrice: number;
    }>;
  }>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("sv-SE", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "placed":
        return "bg-blue-100 text-blue-800";
      case "confirmed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="animate-pulse space-y-8">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="h-20 bg-gray-200"></div>
              <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="h-20 bg-gray-200"></div>
              <div className="p-6 space-y-4">
                <div className="h-4 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show signup/login page for unauthenticated users
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-900 mb-2">Redirecting...</h1>
          <p className="text-gray-500">Taking you to the login page...</p>
        </div>
      </div>
    );
  }

  // Show error for authenticated users with other errors
  if (error && isAuthenticated === true) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 py-8">
            <div>
              <h1 className="text-2xl font-light text-gray-900">My Reservations</h1>
              <p className="text-sm text-gray-500 mt-1">Track your wine orders and pallet progress</p>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">{error}</p>
            <button
              onClick={fetchUserReservations}
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-light text-gray-900">
                My Reservations
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Track your wine orders and pallet progress
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-md hover:border-gray-400 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {reservations.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h2 className="text-lg font-medium text-gray-900 mb-2">No reservations yet</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              Start exploring our collection and create your first wine reservation.
            </p>
            <Link
              href="/shop"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Browse Wines
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedReservations).map(([palletId, group]) => (
              <div key={palletId} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {/* Pallet Header with consolidated info */}
                {group.pallet ? (
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-6 border-b border-gray-200">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-medium text-gray-900 mb-2">{group.pallet.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>{group.pallet.currentBottles} of {group.pallet.bottle_capacity} bottles</span>
                          <span>•</span>
                          <span>{group.totalWines} wines in this pallet</span>
                          <span>•</span>
                          <span>{formatPrice(group.totalPrice)} total</span>
                          {group.pallet.estimatedDaysRemaining && group.pallet.currentBottles < group.pallet.bottle_capacity && (
                            <>
                              <span>•</span>
                              <span className="text-blue-600 font-medium">~{group.pallet.estimatedDaysRemaining} days to completion</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900 mb-2">
                          {Math.round((group.pallet.currentBottles / group.pallet.bottle_capacity) * 100)}% Complete
                        </div>
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gray-900 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${(group.pallet.currentBottles / group.pallet.bottle_capacity) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Status and Tracking */}
                    <div className="flex items-center space-x-4 mb-4">
                      {Array.from(group.allStatuses).map((status) => (
                        <span key={status} className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      ))}
                      {group.trackingCodes.size > 0 && (
                        <div className="text-sm text-gray-600">
                          Tracking: {Array.from(group.trackingCodes).join(', ')}
                        </div>
                      )}
                    </div>

                    {/* Zones */}
                    {group.zones && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {group.zones.pickup && (
                          <div className="bg-blue-50 rounded-md p-3">
                            <p className="text-xs font-medium text-blue-900 mb-1">Pickup Zone</p>
                            <p className="text-sm text-blue-700">{group.zones.pickup.name}</p>
                          </div>
                        )}
                        {group.zones.delivery && (
                          <div className="bg-green-50 rounded-md p-3">
                            <p className="text-xs font-medium text-green-900 mb-1">Delivery Zone</p>
                            <p className="text-sm text-green-700">{group.zones.delivery.name}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Delivery Address */}
                    {group.address && (
                      <div className="bg-gray-50 rounded-md p-4 mb-6">
                        <p className="text-sm font-medium text-gray-900 mb-2">Delivery Address</p>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p className="font-medium">{group.address.full_name}</p>
                          <p>{group.address.address_street}</p>
                          <p>{group.address.address_postcode} {group.address.address_city}</p>
                          <p>{group.address.country_code}</p>
                          <div className="flex space-x-6 mt-2">
                            <span>📞 {group.address.phone}</span>
                            <span>✉️ {group.address.email}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Order Journey Progress */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Order Journey</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Step 1: Order Placed */}
                        <div className="flex flex-col items-center text-center">
                          <div className="flex-shrink-0 mb-3">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                              <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Order Placed</p>
                            <p className="text-xs text-gray-500 mt-1">Confirmed</p>
                            <p className="text-xs text-green-600 font-medium mt-1">✓ Complete</p>
                          </div>
                        </div>

                        {/* Step 2: Pallet Filling */}
                        <div className="flex flex-col items-center text-center">
                          <div className="flex-shrink-0 mb-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              group.pallet.currentBottles > 0 
                                ? 'bg-blue-100' 
                                : 'bg-gray-100'
                            }`}>
                              <svg className={`w-6 h-6 ${
                                group.pallet.currentBottles > 0 
                                  ? 'text-blue-600' 
                                  : 'text-gray-400'
                              }`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Pallet Filling</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {group.pallet.currentBottles > 0 ? 'In Progress' : 'Waiting'}
                            </p>
                            <p className={`text-xs font-medium mt-1 ${
                              group.pallet.currentBottles > 0 ? 'text-blue-600' : 'text-gray-400'
                            }`}>
                              {group.pallet.currentBottles > 0 ? '🔄 Active' : '⏳ Pending'}
                            </p>
                          </div>
                        </div>

                        {/* Step 3: Pallet Complete */}
                        <div className="flex flex-col items-center text-center">
                          <div className="flex-shrink-0 mb-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? 'bg-green-100' 
                                : 'bg-gray-100'
                            }`}>
                              <svg className={`w-6 h-6 ${
                                group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                  ? 'text-green-600' 
                                  : 'text-gray-400'
                              }`} fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Pallet Complete</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? 'Ready for delivery' 
                                : `${group.pallet.remainingBottles} bottles to go`
                              }
                            </p>
                            <p className={`text-xs font-medium mt-1 ${
                              group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? 'text-green-600' 
                                : 'text-gray-400'
                            }`}>
                              {group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? '✓ Ready' 
                                : '⏳ Waiting'
                              }
                            </p>
                          </div>
                        </div>

                        {/* Step 4: Delivery */}
                        <div className="flex flex-col items-center text-center">
                          <div className="flex-shrink-0 mb-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                              group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? 'bg-yellow-100' 
                                : 'bg-gray-100'
                            }`}>
                              <svg className={`w-6 h-6 ${
                                group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                  ? 'text-yellow-600' 
                                  : 'text-gray-400'
                              }`} fill="currentColor" viewBox="0 0 20 20">
                                <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                                <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1V8a1 1 0 00-1-1h-3z" />
                              </svg>
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Delivery</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? 'Scheduled soon' 
                                : 'Waiting for pallet'
                              }
                            </p>
                            <p className={`text-xs font-medium mt-1 ${
                              group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? 'text-yellow-600' 
                                : 'text-gray-400'
                            }`}>
                              {group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? '🚚 Next' 
                                : '⏳ Pending'
                              }
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Connection Lines */}
                      <div className="hidden md:block mt-6">
                        <div className="flex items-center justify-between px-6 -mt-12">
                          <div className={`w-full h-1 rounded-full ${
                            group.pallet.currentBottles > 0 ? 'bg-blue-200' : 'bg-gray-200'
                          }`}></div>
                          <div className={`w-full h-1 rounded-full ${
                            group.pallet.currentBottles >= group.pallet.bottle_capacity ? 'bg-green-200' : 'bg-gray-200'
                          }`}></div>
                          <div className={`w-full h-1 rounded-full ${
                            group.pallet.currentBottles >= group.pallet.bottle_capacity ? 'bg-yellow-200' : 'bg-gray-200'
                          }`}></div>
                        </div>
                      </div>

                      {/* Progress Summary */}
                      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">Current Status</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {group.pallet.currentBottles >= group.pallet.bottle_capacity 
                                ? 'Pallet is complete! Delivery will be scheduled soon.'
                                : `${group.pallet.remainingBottles} bottles remaining to complete pallet`
                              }
                            </p>
                            {group.pallet.estimatedDaysRemaining && group.pallet.currentBottles < group.pallet.bottle_capacity && (
                              <p className="text-xs text-blue-600 mt-1 font-medium">
                                📅 Estimated completion: ~{group.pallet.estimatedDaysRemaining} days
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {Math.round((group.pallet.currentBottles / group.pallet.bottle_capacity) * 100)}%
                            </p>
                            <p className="text-xs text-gray-500">Complete</p>
                            {group.pallet.estimatedDaysRemaining && group.pallet.currentBottles < group.pallet.bottle_capacity && (
                              <p className="text-xs text-blue-500 mt-1">
                                {group.pallet.estimatedDaysRemaining}d left
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Individual Reservations</h3>
                    <p className="text-sm text-gray-500 mt-1">Reservations not assigned to a pallet</p>
                  </div>
                )}

                {/* All Wines in this Pallet */}
                <div className="p-6">
                  <h4 className="text-lg font-medium text-gray-900 mb-4">Wines in this Pallet</h4>
                  <div className="space-y-4">
                    {Array.from(group.wines.values()).map((wineGroup, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h5 className="text-sm font-medium text-gray-900">
                              {wineGroup.wine.wine_name} {wineGroup.wine.vintage}
                            </h5>
                            <p className="text-xs text-gray-500">
                              {wineGroup.wine.grape_varieties} • {wineGroup.wine.color}
                            </p>
                            <p className="text-xs text-gray-400">
                              {wineGroup.wine.producers.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {wineGroup.totalQuantity} bottles total
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatPrice(wineGroup.wine.base_price_cents)} per bottle
                            </p>
                          </div>
                        </div>

                        {/* Order IDs */}
                        <div className="bg-gray-50 rounded-md p-3 mb-3">
                          <p className="text-xs font-medium text-gray-900 mb-2">Order References</p>
                          <div className="flex flex-wrap gap-2">
                            {wineGroup.orderIds.map((orderId) => (
                              <span 
                                key={orderId}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                              >
                                #{orderId.slice(0, 8)}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Total Price */}
                        <div className="border-t border-gray-200 pt-3">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-900">Total for this wine</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPrice(wineGroup.totalPrice)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        {reservations.length > 0 && (
          <div className="mt-12 text-center">
            <Link
              href="/shop"
              className="inline-flex items-center px-6 py-3 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-800 transition-colors"
            >
              Browse More Wines
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
