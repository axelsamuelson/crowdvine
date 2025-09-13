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
  delivery_address?: string;
  total_cost_cents: number;
  items: Array<{
    wine_name: string;
    quantity: number;
    vintage: string;
    image_path?: string;
    grape_varieties?: string;
    color?: string;
    price_per_bottle_cents: number;
    total_cost_cents: number;
  }>;
}

interface AddressPalletData {
  addressPalletKey: string;
  palletName: string;
  deliveryAddress: string;
  wines: Array<{
    wine_name: string;
    vintage: string;
    totalQuantity: number;
    image_path?: string;
    grape_varieties?: string;
    color?: string;
    price_per_bottle_cents: number;
    total_cost_cents: number;
  }>;
  totalBottles: number;
  totalCostCents: number;
  orderCount: number;
  latestOrderDate: string;
}

export default function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [addressPalletData, setAddressPalletData] = useState<AddressPalletData[]>([]);

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
              const addressPalletGroups = processAddressPalletData(data);
              setAddressPalletData(addressPalletGroups);
            } else {
              setReservations([]);
              setAddressPalletData([]);
            }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching reservations:', error);
      setReservations([]);
      setAddressPalletData([]);
      setLoading(false);
    }
  };

  const processAddressPalletData = (reservations: Reservation[]): AddressPalletData[] => {
    const addressPalletMap = new Map<string, AddressPalletData>();

    reservations.forEach(reservation => {
      // Create unique key combining address and pallet
      const addressPalletKey = `${reservation.delivery_address || 'No Address'}|${reservation.pallet_name || 'Unassigned Pallet'}`;

      if (!addressPalletMap.has(addressPalletKey)) {
        addressPalletMap.set(addressPalletKey, {
          addressPalletKey,
          palletName: reservation.pallet_name || 'Unassigned Pallet',
          deliveryAddress: reservation.delivery_address || 'No delivery address',
          wines: [],
          totalBottles: 0,
          totalCostCents: 0,
          orderCount: 0,
          latestOrderDate: reservation.created_at
        });
      }

      const group = addressPalletMap.get(addressPalletKey)!;
      group.orderCount++;
      group.totalBottles += reservation.items.reduce((sum, item) => sum + item.quantity, 0);
      group.totalCostCents += reservation.total_cost_cents;

      // Update latest order date
      if (new Date(reservation.created_at) > new Date(group.latestOrderDate)) {
        group.latestOrderDate = reservation.created_at;
      }

      // Add wines with cost aggregation
      reservation.items.forEach(item => {
        const existingWine = group.wines.find(
          wine => wine.wine_name === item.wine_name && wine.vintage === item.vintage
        );

        if (existingWine) {
          existingWine.totalQuantity += item.quantity;
          existingWine.total_cost_cents += item.total_cost_cents;
        } else {
          group.wines.push({
            wine_name: item.wine_name,
            vintage: item.vintage,
            totalQuantity: item.quantity,
            image_path: item.image_path,
            grape_varieties: item.grape_varieties,
            color: item.color,
            price_per_bottle_cents: item.price_per_bottle_cents,
            total_cost_cents: item.total_cost_cents
          });
        }
      });
    });

    return Array.from(addressPalletMap.values()).sort((a, b) =>
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

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: "SEK",
    }).format(cents / 100);
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
            <p className="text-gray-600 mt-2">Your wine reservations organized by delivery address and pallet</p>
          </div>
        </div>

               {addressPalletData.length === 0 ? (
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
                   {addressPalletData.map((group) => (
                     <Card key={group.addressPalletKey} className="overflow-hidden">
                       <CardHeader className="bg-gray-50">
                         <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <div className="p-2 bg-white rounded-lg shadow-sm">
                               <Package className="w-6 h-6 text-gray-700" />
                             </div>
                             <div>
                               <CardTitle className="text-xl font-bold text-gray-900">
                                 {group.palletName}
                               </CardTitle>
                               <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                                 <span>{group.totalBottles} bottles</span>
                                 <span>•</span>
                                 <span>{group.wines.length} wine{group.wines.length !== 1 ? 's' : ''}</span>
                                 <span>•</span>
                                 <span>{group.orderCount} order{group.orderCount !== 1 ? 's' : ''}</span>
                                 <span>•</span>
                                 <span className="font-semibold text-green-600">{formatPrice(group.totalCostCents)}</span>
                               </div>
                             </div>
                           </div>

                           <div className="text-right text-sm text-gray-600">
                             <div className="flex items-center gap-1">
                               <Calendar className="w-4 h-4" />
                               Latest: {formatDate(group.latestOrderDate)}
                             </div>
                           </div>
                         </div>
                       </CardHeader>

                       <CardContent className="p-6">
                         {/* Delivery Address */}
                         <div className="mb-6">
                           <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                             <MapPin className="w-5 h-5" />
                             Delivery Address
                           </h3>
                           <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                             <p className="text-gray-800 font-medium">{group.deliveryAddress}</p>
                           </div>
                         </div>

                         {/* Wines Section */}
                         <div className="mb-6">
                           <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                             <Wine className="w-5 h-5" />
                             Reserved Wines
                           </h3>
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                             {group.wines.map((wine, index) => (
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
                                     <div className="mt-2 text-sm">
                                       <p className="text-gray-600">
                                         {formatPrice(wine.price_per_bottle_cents)} per bottle
                                       </p>
                                       <p className="font-semibold text-green-600">
                                         Total: {formatPrice(wine.total_cost_cents)}
                                       </p>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             ))}
                           </div>
                         </div>

                         <Separator className="my-6" />

                         {/* Total Cost Summary */}
                         <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                           <div className="flex items-center gap-2">
                             <Package className="w-5 h-5 text-green-600" />
                             <span className="font-medium text-gray-900">Total Cost for this Address & Pallet:</span>
                           </div>
                           <span className="text-xl font-bold text-green-600">
                             {formatPrice(group.totalCostCents)}
                           </span>
                         </div>
                       </CardContent>
                     </Card>
                   ))}
                 </div>
        )}
      </div>
    </PageLayout>
  );
}
