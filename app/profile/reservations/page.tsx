"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageLayout } from "@/components/layout/page-layout";
import { 
  Package, 
  Wine,
  ArrowLeft,
  Calendar,
  MapPin
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

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
    image_path?: string;
    grape_varieties?: string;
    color?: string;
  }>;
}

interface PalletData {
  palletId: string;
  palletName: string;
  wines: Array<{
    wine_name: string;
    vintage: string;
    totalQuantity: number;
    image_path?: string;
    grape_varieties?: string;
    color?: string;
  }>;
  totalBottles: number;
  deliveryZone?: string;
  deliveryAddress?: string;
  orderCount: number;
  latestOrderDate: string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [palletData, setPalletData] = useState<PalletData[]>([]);

  useEffect(() => {
    fetchReservations();
  }, []);

  const fetchReservations = async () => {
    try {
      const response = await fetch('/api/user/reservations');
      if (!response.ok) {
        if (response.status === 500) {
          setReservations([]);
          setPalletData([]);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch reservations');
      }
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setReservations(data);
        const pallets = processPalletData(data);
        setPalletData(pallets);
      } else {
        setReservations([]);
        setPalletData([]);
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
      setPalletData([]);
      setLoading(false);
    }
  };

  const processPalletData = (reservations: Reservation[]): PalletData[] => {
    const palletMap = new Map<string, PalletData>();

    reservations.forEach(reservation => {
      const palletKey = reservation.pallet_id || 'unassigned';
      
      if (!palletMap.has(palletKey)) {
        palletMap.set(palletKey, {
          palletId: palletKey,
          palletName: reservation.pallet_name || 'Unassigned Pallet',
          wines: [],
          totalBottles: 0,
          deliveryZone: reservation.delivery_zone,
          deliveryAddress: reservation.delivery_address,
          orderCount: 0,
          latestOrderDate: reservation.created_at
        });
      }

      const pallet = palletMap.get(palletKey)!;
      pallet.orderCount++;
      pallet.totalBottles += reservation.items.reduce((sum, item) => sum + item.quantity, 0);
      
      // Update latest order date
      if (new Date(reservation.created_at) > new Date(pallet.latestOrderDate)) {
        pallet.latestOrderDate = reservation.created_at;
      }

      // Add wines
      reservation.items.forEach(item => {
        const existingWine = pallet.wines.find(
          wine => wine.wine_name === item.wine_name && wine.vintage === item.vintage
        );
        
        if (existingWine) {
          existingWine.totalQuantity += item.quantity;
        } else {
          pallet.wines.push({
            wine_name: item.wine_name,
            vintage: item.vintage,
            totalQuantity: item.quantity,
            image_path: item.image_path,
            grape_varieties: item.grape_varieties,
            color: item.color
          });
        }
      });
    });

    return Array.from(palletMap.values()).sort((a, b) => 
      new Date(b.latestOrderDate).getTime() - new Date(a.latestOrderDate).getTime()
    );
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
      <div className="space-y-8 p-sides">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Profile
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Reservations</h1>
            <p className="text-gray-600 mt-2">Your wine reservations organized by pallet</p>
          </div>
        </div>

        {palletData.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <Wine className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No reservations yet</h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                You haven't made any wine reservations yet. Start exploring our collection!
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
            {palletData.map((pallet) => (
              <Card key={pallet.palletId} className="overflow-hidden">
                <CardHeader className="bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <Package className="w-6 h-6 text-gray-700" />
                      </div>
                      <div>
                        <CardTitle className="text-xl font-bold text-gray-900">
                          {pallet.palletName}
                        </CardTitle>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                          <span>{pallet.totalBottles} bottles</span>
                          <span>•</span>
                          <span>{pallet.wines.length} wine{pallet.wines.length !== 1 ? 's' : ''}</span>
                          <span>•</span>
                          <span>{pallet.orderCount} order{pallet.orderCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Latest: {formatDate(pallet.latestOrderDate)}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Wines Section */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                      <Wine className="w-5 h-5" />
                      Reserved Wines
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {pallet.wines.map((wine, index) => (
                        <div key={index} className="p-4 border rounded-lg bg-gray-50">
                          <div className="flex items-center gap-3">
                            {wine.image_path && (
                              <div className="w-16 h-16 relative flex-shrink-0">
                                <Image
                                  src={wine.image_path}
                                  alt={wine.wine_name}
                                  fill
                                  className="object-cover rounded-lg"
                                  sizes="64px"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 truncate">{wine.wine_name}</h4>
                              <p className="text-sm text-gray-600">{wine.vintage}</p>
                              {wine.grape_varieties && (
                                <p className="text-xs text-gray-500 truncate">{wine.grape_varieties}</p>
                              )}
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-xs">
                                  {wine.color}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {wine.totalQuantity} bottle{wine.totalQuantity !== 1 ? 's' : ''}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator className="my-6" />

                  {/* Delivery Information */}
                  {pallet.deliveryZone && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-gray-900">Delivery Zone</h4>
                        <p className="text-gray-600">{pallet.deliveryZone}</p>
                        {pallet.deliveryAddress && (
                          <p className="text-sm text-gray-500 mt-1">{pallet.deliveryAddress}</p>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
