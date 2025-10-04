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
      // TODO: Replace with actual API call
      // const response = await fetch(`/api/pallets/${palletId}`);
      // const data = await response.json();
      
      // Mock data for demonstration
      const mockPallet: PalletData = {
        id: palletId,
        name: `Pallet ${palletId}`,
        status: 'CONSOLIDATING',
        percent_filled: 64,
        capacity_bottles: 100,
        reserved_bottles: 64,
        delivered_bottles: 0,
        pickup_zone: 'Stockholm Central',
        delivery_zone: 'Stockholm North',
        eta: 'Oct 12–19',
        created_at: '2024-01-15T10:00:00Z',
        reservations: [
          {
            id: '1',
            user_name: 'Anna Andersson',
            user_email: 'anna@example.com',
            bottles_reserved: 12,
            bottles_delivered: 0,
            created_at: '2024-01-15T10:00:00Z',
          },
          {
            id: '2',
            user_name: 'Erik Eriksson',
            user_email: 'erik@example.com',
            bottles_reserved: 8,
            bottles_delivered: 0,
            created_at: '2024-01-16T14:30:00Z',
          },
        ],
        wines: [
          {
            wine_name: 'Château Margaux 2019',
            vintage: '2019',
            color: 'Red',
            grape_varieties: 'Cabernet Sauvignon, Merlot',
            total_reserved: 15,
            total_delivered: 0,
            image_path: '/images/wines/chateau-margaux-2019.jpg',
          },
          {
            wine_name: 'Dom Pérignon 2015',
            vintage: '2015',
            color: 'White',
            grape_varieties: 'Chardonnay, Pinot Noir',
            total_reserved: 5,
            total_delivered: 0,
            image_path: '/images/wines/dom-perignon-2015.jpg',
          },
        ],
      };
      
      setPallet(mockPallet);
    } catch (error) {
      console.error('Error fetching pallet:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <PageLayout className="pt-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
          </div>
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        </div>
      </PageLayout>
    );
  }

  if (!pallet) {
    return (
      <PageLayout className="pt-12">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center gap-4">
            <Link href="/profile">
              <Button variant="ghost" size="sm" className="p-2">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-light text-gray-900 mb-2">Pallet not found</h2>
              <p className="text-gray-500 mb-6">The pallet you're looking for doesn't exist or you don't have access to it.</p>
              <Link href="/profile">
                <Button className="rounded-full px-6 bg-gray-900 hover:bg-gray-800 text-white">
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
    reserved_bottles: pallet.reservedBottles,
    capacity_bottles: pallet.capacity,
    percent_filled: pallet.percent_filled,
    status: pallet.status,
  });

  const showPercent = shouldShowPercent(pallet.status);
  const displayPercent = showPercent ? formatPercent(percentFilled) : '—%';

  return (
    <PageLayout className="pt-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header with back button */}
        <div className="flex items-center gap-4">
          <Link href="/profile">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-light text-gray-900">{pallet.name}</h1>
            <p className="text-gray-500">Pallet Details</p>
          </div>
        </div>

        {/* Pallet Header Card */}
        <Card className="border border-gray-200/50">
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-light text-gray-900 mb-2">
                    {pallet.name}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Status: <span className="font-medium">{pallet.status}</span></span>
                    <span>•</span>
                    <span>ETA: <span className="font-medium">{pallet.eta || 'TBD'}</span></span>
                  </div>
                </div>
              </div>
              
              {/* Progress Indicator */}
              <div className="flex items-center gap-6">
                <PalletProgress 
                  valuePercent={showPercent ? percentFilled : null}
                  variant="bar"
                  size="lg"
                />
                <Badge 
                  className={`text-sm px-4 py-2 ${
                    pallet.status === 'CONSOLIDATING' ? 'bg-green-100 text-green-700 border-green-200' :
                    pallet.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                    pallet.status === 'SHIPPED' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                    pallet.status === 'DELIVERED' ? 'bg-gray-100 text-gray-700 border-gray-200' :
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Wine className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Reserved Bottles</p>
                  <p className="text-2xl font-light text-gray-900">{pallet.reserved_bottles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Truck className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Delivered Bottles</p>
                  <p className="text-2xl font-light text-gray-900">{pallet.delivered_bottles}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200/50">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Participants</p>
                  <p className="text-2xl font-light text-gray-900">{pallet.reservations.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wines in Pallet */}
        <Card className="border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-xl font-light text-gray-900">Wines in Pallet</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pallet.wines.map((wine, index) => (
                <div key={index} className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-xl">
                  {wine.image_path ? (
                    <Image
                      src={wine.image_path}
                      alt={wine.wine_name}
                      width={60}
                      height={60}
                      className="rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-15 h-15 bg-gray-200 rounded-lg flex items-center justify-center">
                      <Wine className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-light text-gray-900">{wine.wine_name}</h3>
                    <p className="text-sm text-gray-500">{wine.vintage} • {wine.color}</p>
                    {wine.grape_varieties && (
                      <p className="text-xs text-gray-400">{wine.grape_varieties}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{wine.total_reserved} bottles</p>
                    <p className="text-xs text-gray-500">Reserved</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="border border-gray-200/50">
          <CardHeader>
            <CardTitle className="text-xl font-light text-gray-900">Participants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pallet.reservations.map((reservation) => (
                <div key={reservation.id} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl">
                  <div>
                    <p className="font-light text-gray-900">{reservation.user_name}</p>
                    <p className="text-sm text-gray-500">{reservation.user_email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{reservation.bottles_reserved} bottles</p>
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
