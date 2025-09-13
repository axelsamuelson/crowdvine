"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { 
  Package, 
  MapPin, 
  Calendar, 
  Wine,
  Truck,
  CheckCircle,
  Clock,
  ArrowLeft,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface Reservation {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  pallet_id?: string;
  pallet_name?: string;
  pickup_zone?: string;
  delivery_zone?: string;
  delivery_address?: string;
  items: Array<{
    wine_name: string;
    quantity: number;
    vintage: string;
  }>;
}

interface PalletGroup {
  palletId: string;
  palletName: string;
  reservations: Reservation[];
  totalBottles: number;
  uniqueWines: Array<{
    wine_name: string;
    vintage: string;
    totalQuantity: number;
  }>;
  latestStatus: string;
  earliestDate: string;
  latestDate: string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [palletGroups, setPalletGroups] = useState<PalletGroup[]>([]);
  const [expandedPallets, setExpandedPallets] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/user/reservations');
      if (!response.ok) {
        if (response.status === 500) {
          console.log('Server error, assuming no reservations');
          setReservations([]);
          setPalletGroups([]);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch reservations');
      }
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setReservations(data);
        const groups = groupReservationsByPallet(data);
        setPalletGroups(groups);
      } else {
        console.log('Received error object, treating as no reservations:', data);
        setReservations([]);
        setPalletGroups([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
      setPalletGroups([]);
      setLoading(false);
    }
  };

  const groupReservationsByPallet = (reservations: Reservation[]): PalletGroup[] => {
    const groups: Record<string, PalletGroup> = {};

    reservations.forEach(reservation => {
      const palletKey = reservation.pallet_id || 'no-pallet';
      
      if (!groups[palletKey]) {
        groups[palletKey] = {
          palletId: palletKey,
          palletName: reservation.pallet_name || 'Unassigned Pallet',
          reservations: [],
          totalBottles: 0,
          uniqueWines: [],
          latestStatus: reservation.status,
          earliestDate: reservation.created_at,
          latestDate: reservation.created_at
        };
      }

      groups[palletKey].reservations.push(reservation);
      groups[palletKey].totalBottles += reservation.items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Update dates
      if (new Date(reservation.created_at) < new Date(groups[palletKey].earliestDate)) {
        groups[palletKey].earliestDate = reservation.created_at;
      }
      if (new Date(reservation.created_at) > new Date(groups[palletKey].latestDate)) {
        groups[palletKey].latestDate = reservation.created_at;
      }

      // Update status to most advanced
      const statusOrder = ['placed', 'confirmed', 'shipped', 'delivered'];
      const currentStatusIndex = statusOrder.indexOf(groups[palletKey].latestStatus.toLowerCase());
      const newStatusIndex = statusOrder.indexOf(reservation.status.toLowerCase());
      if (newStatusIndex > currentStatusIndex) {
        groups[palletKey].latestStatus = reservation.status;
      }

      // Aggregate unique wines
      reservation.items.forEach(item => {
        const existingWine = groups[palletKey].uniqueWines.find(
          wine => wine.wine_name === item.wine_name && wine.vintage === item.vintage
        );
        if (existingWine) {
          existingWine.totalQuantity += item.quantity;
        } else {
          groups[palletKey].uniqueWines.push({
            wine_name: item.wine_name,
            vintage: item.vintage,
            totalQuantity: item.quantity
          });
        }
      });
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime()
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'placed':
        return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50"><Clock className="w-3 h-3 mr-1" />Placed</Badge>;
      case 'confirmed':
        return <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50"><CheckCircle className="w-3 h-3 mr-1" />Confirmed</Badge>;
      case 'shipped':
        return <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50"><Truck className="w-3 h-3 mr-1" />Shipped</Badge>;
      case 'delivered':
        return <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50"><CheckCircle className="w-3 h-3 mr-1" />Delivered</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const togglePalletExpansion = (palletId: string) => {
    const newExpanded = new Set(expandedPallets);
    if (newExpanded.has(palletId)) {
      newExpanded.delete(palletId);
    } else {
      newExpanded.add(palletId);
    }
    setExpandedPallets(newExpanded);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <PageLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            <p className="mt-4 text-gray-600">Loading reservations...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Wine Reservations</h1>
            <p className="text-gray-600 mt-2">Track your wine orders organized by pallet</p>
          </div>
        </div>

        {palletGroups.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <Wine className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reservations yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You haven't made any wine reservations yet. Start exploring our collection and make your first reservation!
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/shop">
                  <Button size="lg" className="px-8">
                    Browse Wines
                  </Button>
                </Link>
                <Link href="/">
                  <Button variant="outline" size="lg" className="px-8">
                    Go Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {palletGroups.map((palletGroup) => {
              const isExpanded = expandedPallets.has(palletGroup.palletId);
              
              return (
                <Card key={palletGroup.palletId} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <Package className="w-6 h-6 text-gray-700" />
                        </div>
                        <div>
                          <CardTitle className="text-xl font-bold text-gray-900">
                            {palletGroup.palletName}
                          </CardTitle>
                          <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm text-gray-600">
                              {palletGroup.totalBottles} bottles
                            </span>
                            <span className="text-sm text-gray-600">
                              {palletGroup.uniqueWines.length} wine{palletGroup.uniqueWines.length !== 1 ? 's' : ''}
                            </span>
                            <span className="text-sm text-gray-600">
                              {palletGroup.reservations.length} order{palletGroup.reservations.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {getStatusBadge(palletGroup.latestStatus)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePalletExpansion(palletGroup.palletId)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="p-6">
                    {/* Wine Summary */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Wine className="w-5 h-5" />
                        Your Wine Selection
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {palletGroup.uniqueWines.map((wine, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <p className="font-medium text-gray-900">{wine.wine_name}</p>
                              <p className="text-sm text-gray-600">{wine.vintage}</p>
                            </div>
                            <Badge variant="secondary" className="bg-white">
                              {wine.totalQuantity} bottle{wine.totalQuantity !== 1 ? 's' : ''}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Delivery Information */}
                    {palletGroup.reservations[0]?.delivery_zone && (
                      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start gap-3">
                          <MapPin className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div>
                            <h4 className="font-medium text-blue-900">Delivery Zone</h4>
                            <p className="text-blue-700">{palletGroup.reservations[0].delivery_zone}</p>
                            {palletGroup.reservations[0].delivery_address && (
                              <p className="text-sm text-blue-600 mt-1">
                                {palletGroup.reservations[0].delivery_address}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Timeline */}
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        Timeline
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>First order: {formatDate(palletGroup.earliestDate)}</span>
                        <span>•</span>
                        <span>Latest order: {formatDate(palletGroup.latestDate)}</span>
                      </div>
                    </div>

                    {/* Expandable Order Details */}
                    {isExpanded && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Details</h3>
                        <div className="space-y-4">
                          {palletGroup.reservations.map((reservation) => (
                            <div key={reservation.id} className="p-4 border rounded-lg bg-gray-50">
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    Order #{reservation.order_id.slice(-8)}
                                  </h4>
                                  <p className="text-sm text-gray-600">
                                    {formatDate(reservation.created_at)}
                                  </p>
                                </div>
                                {getStatusBadge(reservation.status)}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Items in this order:</h5>
                                  <div className="space-y-1">
                                    {reservation.items.map((item, index) => (
                                      <div key={index} className="flex justify-between text-sm">
                                        <span className="text-gray-900">
                                          {item.wine_name} {item.vintage}
                                        </span>
                                        <span className="text-gray-600">
                                          {item.quantity} bottle{item.quantity !== 1 ? 's' : ''}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                
                                <div>
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">Delivery:</h5>
                                  <div className="text-sm text-gray-600">
                                    {reservation.delivery_zone || 'Zone not assigned'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
