"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/layout/page-layout";
import { PalletProgress } from "@/components/ui/progress-components";
import { getPercentFilled, formatPercent, shouldShowPercent } from "@/lib/utils/pallet-progress";
import {
  Package,
  Wine,
  ArrowLeft,
  Calendar,
  MapPin,
  Truck,
  Users,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface PalletData {
  id: string;
  name: string;
  status: 'OPEN' | 'CONSOLIDATING' | 'SHIPPED' | 'DELIVERED';
  percent_filled?: number;
  capacity_bottles?: number;
  reserved_bottles: number;
  delivered_bottles: number;
  pickup_zone: string;
  delivery_zone: string;
  eta?: string;
  created_at: string;
  reservations: Array<{
    id: string;
    user_name: string;
    user_email: string;
    bottles_reserved: number;
    bottles_delivered: number;
    created_at: string;
  }>;
  wines: Array<{
    wine_name: string;
    vintage: string;
    color: string;
    grape_varieties?: string;
    total_reserved: number;
    total_delivered: number;
    image_path?: string;
  }>;
}

export default function PalletPage() {
  const params = useParams();
  const [pallet, setPallet] = useState<PalletData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (params.id) {
      fetchPallet(params.id as string);
    }
  }, [params.id]);

  const fetchPallet = async (palletId: string) => {
    try {
      setLoading(true);
      
      // First, fetch real pallet data from backend for accurate info
      let realPalletData: any = null;
      try {
        console.log(`🔄 Fetching real pallet data for ID: ${palletId}`);
        const palletResponse = await fetch('/api/pallet-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ palletIds: [palletId] })
        });
        
        if (palletResponse.ok) {
          const palletDataResponse = await palletResponse.json();
          console.log(`📊 Fetched pallet data:`, palletDataResponse);
          realPalletData = palletDataResponse.pallets?.[0];
          
          if (!realPalletData) {
            throw new Error("Pallet not found in database");
          }
        } else {
          console.error(`❌ Pallet API error:`, await palletResponse.text());
          throw new Error("Failed to fetch pallet data");
        }
      } catch (error) {
        console.error('❌ Error fetching pallet data:', error);
        throw error;
      }
      
      // Then fetch all reservations for this pallet (including other users)
      let palletReservations: any[] = [];
      try {
        const response = await fetch(`/api/pallet/${palletId}/reservations`);
        if (response.ok) {
          const data = await response.json();
          // Make sure it's an array
          if (Array.isArray(data)) {
            palletReservations = data;
          } else if (data && !data.error) {
            console.warn("Unexpected reservations response format:", data);
          }
        } else {
          console.log("No reservations API response:", response.status);
        }
      } catch (error) {
        console.error("Error fetching reservations:", error);
        // Continue with empty reservations array
      }

      console.log(`📋 Found ${palletReservations.length} reservations for pallet`);

      // Aggregate data from reservations if any exist
      let totalDeliveredBottles = 0;
      const allItems: any[] = [];
      
      if (palletReservations.length > 0) {
        palletReservations.forEach((res: any) => {
          // totalDeliveredBottles += res.delivered_bottles || 0; // TODO: Get from backend
          if (res.items && Array.isArray(res.items)) {
            allItems.push(...res.items);
          }
        });
      }

      // Get unique wines (aggregate by wine name + vintage)
      const uniqueWines = allItems.reduce((acc: any, item: any) => {
        const key = `${item.wine_name}_${item.vintage}`;
        if (!acc[key]) {
          acc[key] = {
            wine_name: item.wine_name,
            vintage: item.vintage,
            color: item.color || 'Unknown',
            grape_varieties: item.grape_varieties || 'Unknown',
            total_reserved: 0,
            total_delivered: 0,
            image_path: item.image_path,
          };
        }
        acc[key].total_reserved += item.quantity;
        return acc;
      }, {});

      // Use real pallet data from backend
      const totalReservedBottles = realPalletData.current_bottles;
      const capacityBottles = realPalletData.bottle_capacity;
      const palletName = realPalletData.name;
      
      console.log(`✅ Pallet Page - ${palletName}: ${totalReservedBottles}/${capacityBottles} bottles`);

      // Aggregate participants (unique users with total bottles)
      const participantsMap = new Map<string, any>();
      
      if (palletReservations.length > 0) {
        palletReservations.forEach((res: any) => {
          const userId = res.user_id;
          
          if (participantsMap.has(userId)) {
            // Add to existing participant's bottle count
            const existing = participantsMap.get(userId);
            existing.bottles_reserved += res.bottles_reserved || 0;
            existing.bottles_delivered += res.bottles_delivered || 0;
          } else {
            // Add new participant
            participantsMap.set(userId, {
              id: userId,
              user_name: res.user_name,
              user_email: res.user_email,
              bottles_reserved: res.bottles_reserved || 0,
              bottles_delivered: res.bottles_delivered || 0,
              created_at: res.created_at,
            });
          }
        });
      }

      const uniqueParticipants = Array.from(participantsMap.values());
      console.log(`👥 Unique participants: ${uniqueParticipants.length}`);

      // Create pallet data structure
      const palletData: PalletData = {
        id: palletId,
        name: palletName,
        status: 'OPEN', // Default status, can be updated from backend if available
        capacity_bottles: capacityBottles,
        reserved_bottles: totalReservedBottles,
        delivered_bottles: totalDeliveredBottles,
        pickup_zone: 'TBD', // TODO: Get from backend
        delivery_zone: 'TBD', // TODO: Get from backend
        eta: 'TBD', // TODO: Get from backend
        created_at: new Date().toISOString(),
        reservations: uniqueParticipants,
        wines: Object.values(uniqueWines),
      };
      
      setPallet(palletData);
    } catch (error) {
      console.error('Error fetching pallet:', error);
      setPallet(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout className="px-sides">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/profile">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
            <div className="h-6 md:h-8 bg-gray-200 rounded w-32 md:w-48 animate-pulse" />
          </div>
          <div className="h-48 md:h-64 bg-gray-200 rounded-xl md:rounded-2xl animate-pulse" />
        </div>
      </PageLayout>
    );
  }

  if (!pallet) {
    return (
      <PageLayout className="px-sides">
        <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
          <div className="flex items-center gap-3 md:gap-4">
            <Link href="/profile">
              <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-6 md:p-8 text-center">
              <Package className="w-12 h-12 md:w-16 md:h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-lg md:text-xl font-light text-gray-900 mb-2">Pallet not found</h2>
              <p className="text-sm md:text-base text-gray-500 mb-6">The pallet you're looking for doesn't exist or you don't have access to it.</p>
              <Link href="/profile">
                <Button className="rounded-full px-6 bg-gray-900 hover:bg-gray-800 text-white text-sm md:text-base">
                  Back to Profile
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageLayout>
    );
  }

  // Calculate progress data
  const percentFilled = getPercentFilled({
    reserved_bottles: pallet.reserved_bottles,
    capacity_bottles: pallet.capacity_bottles,
    percent_filled: pallet.percent_filled,
    status: pallet.status,
  });

  const showPercent = shouldShowPercent(pallet.status);
  const displayPercent = showPercent ? formatPercent(percentFilled) : '—%';

  return (
    <PageLayout className="px-sides">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-8">
        {/* Header with back button */}
        <div className="flex items-center gap-3 md:gap-4">
          <Link href="/profile">
            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-light text-gray-900">{pallet.name}</h1>
            <p className="text-sm md:text-base text-gray-500">Pallet Details</p>
          </div>
        </div>

        {/* Pallet Header Card */}
        <Card className="border border-gray-200/50">
          <CardHeader className="p-4 md:pb-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-16 md:h-16 bg-gray-100 rounded-xl md:rounded-2xl flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 md:w-8 md:h-8 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <CardTitle className="text-lg md:text-xl lg:text-2xl font-light text-gray-900 mb-1 md:mb-2 truncate">
                    {pallet.name}
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs md:text-sm text-gray-500">
                    <span>Status: <span className="font-medium">{pallet.status}</span></span>
                    <span className="hidden sm:inline">•</span>
                    <span>ETA: <span className="font-medium">{pallet.eta || 'TBD'}</span></span>
                  </div>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-3 md:gap-6 flex-wrap">
                <PalletProgress 
                  valuePercent={showPercent ? percentFilled : null}
                  variant="bar"
                  size="md"
                />
                <Badge 
                  className={`text-xs md:text-sm px-3 md:px-4 py-1 md:py-2 ${
                    pallet.status === 'CONSOLIDATING' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                    pallet.status === 'OPEN' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                    pallet.status === 'SHIPPED' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                    pallet.status === 'DELIVERED' ? 'bg-gray-100 text-gray-600 border-gray-200' :
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}
                >
                  {pallet.status}
                </Badge>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
          <Card className="border border-gray-200/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Wine className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Reserved Bottles</p>
                  <p className="text-xl md:text-2xl font-light text-gray-900">{pallet.reserved_bottles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Truck className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Delivered Bottles</p>
                  <p className="text-xl md:text-2xl font-light text-gray-900">{pallet.delivered_bottles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-xs md:text-sm text-gray-500">Participants</p>
                  <p className="text-xl md:text-2xl font-light text-gray-900">{pallet.reservations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wines in Pallet */}
        <Card className="border border-gray-200/50">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg lg:text-xl font-light text-gray-900">Wines in Pallet</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-3 md:space-y-4">
              {pallet.wines.map((wine, index) => (
                <div key={index} className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-gray-50/50 rounded-lg md:rounded-xl">
                  {wine.image_path ? (
                    <Image
                      src={wine.image_path}
                      alt={wine.wine_name}
                      width={48}
                      height={48}
                      className="w-12 h-12 md:w-15 md:h-15 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 md:w-15 md:h-15 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Wine className="w-5 h-5 md:w-6 md:h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm md:text-base font-light text-gray-900 truncate">{wine.wine_name}</h3>
                    <p className="text-xs md:text-sm text-gray-500">{wine.vintage} • {wine.color}</p>
                    {wine.grape_varieties && (
                      <p className="text-xs text-gray-400 truncate">{wine.grape_varieties}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs md:text-sm font-medium text-gray-900">{wine.total_reserved} bottles</p>
                    <p className="text-xs text-gray-500">Reserved</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="border border-gray-200/50">
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-base md:text-lg lg:text-xl font-light text-gray-900">Participants</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="space-y-2 md:space-y-3">
              {pallet.reservations.map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-3 md:p-4 bg-gray-50/50 rounded-lg md:rounded-xl">
                  <div className="min-w-0 flex-1 mr-3">
                    <p className="text-sm md:text-base font-light text-gray-900 truncate">{reservation.user_name}</p>
                    <p className="text-xs md:text-sm text-gray-500 truncate">{reservation.user_email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs md:text-sm font-medium text-gray-900">{reservation.bottles_reserved} bottles</p>
                    <p className="text-xs text-gray-500">
                      {new Date(reservation.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
