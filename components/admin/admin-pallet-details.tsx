"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Package, 
  MapPin, 
  Users, 
  Wine, 
  TrendingUp,
  Edit,
  Calendar,
  DollarSign,
  Box
} from "lucide-react";
import { getPercentFilled, shouldShowPercent } from "@/lib/utils/pallet-progress";

// Format currency in SEK
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('sv-SE', {
    style: 'currency',
    currency: 'SEK',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

interface PalletZone {
  id: string;
  name: string;
  zone_type: string;
}

interface Pallet {
  id: string;
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  current_bottles?: number;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
}

interface Reservation {
  id: string;
  order_id: string;
  status: string;
  created_at: string;
  user_email: string;
  user_name: string;
  total_bottles: number;
  total_cost_cents: number;
  items: Array<{
    wine_name: string;
    producer_name: string;
    quantity: number;
    price_cents: number;
  }>;
}

interface PalletStats {
  total_reservations: number;
  total_bottles: number;
  total_revenue_cents: number;
  unique_users: number;
  unique_wines: number;
  percentage_filled: number;
}

interface AdminPalletDetailsProps {
  pallet: Pallet;
  palletId: string;
}

export default function AdminPalletDetails({ pallet, palletId }: AdminPalletDetailsProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [stats, setStats] = useState<PalletStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchPalletData();
  }, [palletId]);

  const fetchPalletData = async () => {
    try {
      setLoading(true);
      
      // Fetch reservations for this pallet (admin endpoint)
      const resResponse = await fetch(`/api/admin/pallets/${palletId}/reservations`);
      if (!resResponse.ok) {
        const errorData = await resResponse.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || "Failed to fetch reservations");
      }
      
      const resData = await resResponse.json();
      const reservationsList = Array.isArray(resData) ? resData : [];
      setReservations(reservationsList);

      // Calculate stats
      const uniqueUsers = new Set(reservationsList.map((r: Reservation) => r.user_email)).size;
      const uniqueWines = new Set(
        reservationsList.flatMap((r: Reservation) => 
          r.items.map(item => `${item.producer_name}-${item.wine_name}`)
        )
      ).size;

      const totalBottles = reservationsList.reduce(
        (sum: number, r: Reservation) => sum + r.total_bottles, 
        0
      );
      
      const totalRevenue = reservationsList.reduce(
        (sum: number, r: Reservation) => sum + r.total_cost_cents, 
        0
      );

      const percentageFilled = pallet.bottle_capacity > 0 
        ? Math.min(Math.round((totalBottles / pallet.bottle_capacity) * 100), 100)
        : 0;

      setStats({
        total_reservations: reservationsList.length,
        total_bottles: totalBottles,
        total_revenue_cents: totalRevenue,
        unique_users: uniqueUsers,
        unique_wines: uniqueWines,
        percentage_filled: percentageFilled,
      });

    } catch (err) {
      console.error("Failed to fetch pallet data:", err);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusUpper = status.toUpperCase();
    const colorMap: { [key: string]: string } = {
      'PLACED': 'bg-blue-100 text-blue-700',
      'PENDING': 'bg-yellow-100 text-yellow-700',
      'CONFIRMED': 'bg-green-100 text-green-700',
      'OPEN': 'bg-blue-100 text-blue-700',
      'CONSOLIDATING': 'bg-orange-100 text-orange-700',
      'SHIPPED': 'bg-purple-100 text-purple-700',
      'DELIVERED': 'bg-green-100 text-green-700',
      'CANCELLED': 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={`${colorMap[statusUpper] || 'bg-gray-100 text-gray-700'} border-0`}>
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{pallet.name}</h1>
          {pallet.description && (
            <p className="text-muted-foreground mt-2">{pallet.description}</p>
          )}
        </div>
        <Button onClick={() => router.push(`/admin/pallets/${palletId}/edit`)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Pallet
        </Button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Fill Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <TrendingUp className="w-8 h-8 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.percentage_filled}%</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total_bottles} / {pallet.bottle_capacity} bottles
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.total_revenue_cents / 100)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {stats.total_reservations} reservations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.unique_users}</div>
                  <p className="text-xs text-muted-foreground">unique customers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Wine Varieties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Wine className="w-8 h-8 text-red-600" />
                <div>
                  <div className="text-2xl font-bold">{stats.unique_wines}</div>
                  <p className="text-xs text-muted-foreground">different wines</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pallet Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Zones
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Pickup Zone</div>
              <div className="text-base">
                {pallet.pickup_zone?.name || 'Not set'}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Delivery Zone</div>
              <div className="text-base">
                {pallet.delivery_zone?.name || 'Not set'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Box className="w-5 h-5" />
              Pallet Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Transport Cost</div>
              <div className="text-base font-semibold">
                {formatCurrency(pallet.cost_cents / 100)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Capacity</div>
              <div className="text-base">
                {pallet.bottle_capacity} bottles
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-muted-foreground mb-1">Created</div>
              <div className="text-base">
                {new Date(pallet.created_at).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reservations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Reservations ({reservations.length})</CardTitle>
          <CardDescription>
            All customer reservations for this pallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No reservations yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-sm">Order ID</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Customer</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Bottles</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((reservation) => (
                    <tr key={reservation.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm font-mono">
                        {reservation.order_id.slice(0, 8)}...
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <div>
                          <div className="font-medium">{reservation.user_name || 'Unknown'}</div>
                          <div className="text-xs text-muted-foreground">{reservation.user_email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {getStatusBadge(reservation.status)}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {reservation.total_bottles}
                      </td>
                      <td className="py-3 px-4 text-sm font-medium">
                        {formatCurrency(reservation.total_cost_cents / 100)}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(reservation.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        <Link href={`/admin/reservations/${reservation.id}`}>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wines Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Wines on Pallet</CardTitle>
          <CardDescription>
            Breakdown of all wines reserved for this pallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {reservations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No wines yet
            </div>
          ) : (
            <div className="space-y-3">
              {Array.from(
                reservations.flatMap(r => r.items).reduce((acc, item) => {
                  const key = `${item.producer_name}-${item.wine_name}`;
                  if (!acc.has(key)) {
                    acc.set(key, {
                      producer: item.producer_name,
                      wine: item.wine_name,
                      quantity: 0,
                      price: item.price_cents,
                    });
                  }
                  const existing = acc.get(key)!;
                  existing.quantity += item.quantity;
                  return acc;
                }, new Map()).values()
              )
              .sort((a, b) => b.quantity - a.quantity)
              .map((wine, idx) => (
                <div key={idx} className="flex items-center justify-between py-3 px-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <Wine className="w-5 h-5 text-red-600" />
                    <div>
                      <div className="font-medium">{wine.wine}</div>
                      <div className="text-sm text-muted-foreground">{wine.producer}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{wine.quantity} bottles</div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(wine.price / 100)} each
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

