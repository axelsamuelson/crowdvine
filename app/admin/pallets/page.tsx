'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, 
  Package, 
  MapPin, 
  DollarSign, 
  Wine, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface PalletZone {
  id: string;
  name: string;
  zone_type: 'delivery' | 'pickup';
}

interface WineSummary {
  wine_name: string;
  vintage: string;
  grape_varieties: string;
  color: string;
  producer: string;
  total_quantity: number;
  base_price_cents: number;
}

interface Pallet {
  id: string;
  name: string;
  description?: string;
  delivery_zone_id: string;
  pickup_zone_id: string;
  cost_cents: number;
  bottle_capacity: number;
  created_at: string;
  updated_at: string;
  delivery_zone?: PalletZone;
  pickup_zone?: PalletZone;
  total_booked_bottles: number;
  remaining_bottles: number;
  completion_percentage: number;
  wine_summary: WineSummary[];
  is_complete: boolean;
  needs_ordering: boolean;
}

export default function PalletsPage() {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPallets = async () => {
      try {
        const response = await fetch('/api/admin/pallets');
        if (response.ok) {
          const data = await response.json();
          setPallets(data);
        } else {
          setError('Failed to load pallets');
        }
      } catch (err) {
        setError('Failed to load pallets');
      } finally {
        setLoading(false);
      }
    };

    fetchPallets();
  }, []);

  const formatPrice = (priceCents: number) => {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: 'SEK'
    }).format(priceCents / 100);
  };

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusIcon = (pallet: Pallet) => {
    if (pallet.is_complete) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (pallet.completion_percentage >= 75) return <TrendingUp className="h-4 w-4 text-blue-600" />;
    if (pallet.completion_percentage >= 50) return <Clock className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  const getStatusText = (pallet: Pallet) => {
    if (pallet.is_complete) return 'Complete';
    if (pallet.completion_percentage >= 75) return 'Nearly Full';
    if (pallet.completion_percentage >= 50) return 'In Progress';
    return 'Needs Orders';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pallet Management</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pallet Management</h1>
          <Button asChild>
            <Link href="/admin/pallets/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Pallet
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Error Loading Pallets</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Pallet Management</h1>
          <p className="text-muted-foreground mt-1">
            Monitor pallet status, bottle capacity, and wine allocations
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/pallets/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Pallet
          </Link>
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Pallets</p>
                <p className="text-2xl font-bold">{pallets.length}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Complete Pallets</p>
                <p className="text-2xl font-bold text-green-600">
                  {pallets.filter(p => p.is_complete).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bottles</p>
                <p className="text-2xl font-bold">
                  {pallets.reduce((sum, p) => sum + p.total_booked_bottles, 0)}
                </p>
              </div>
              <Wine className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Needs Ordering</p>
                <p className="text-2xl font-bold text-orange-600">
                  {pallets.filter(p => p.needs_ordering).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pallets Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pallets.map((pallet) => (
          <Card key={pallet.id} className="hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{pallet.name}</CardTitle>
                </div>
                {getStatusIcon(pallet)}
              </div>
              <CardDescription className="flex items-center gap-2">
                <Badge variant={pallet.is_complete ? "default" : "secondary"}>
                  {getStatusText(pallet)}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {pallet.completion_percentage.toFixed(1)}% full
                </span>
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Bottle Capacity</span>
                  <span className="font-medium">
                    {pallet.total_booked_bottles} / {pallet.bottle_capacity}
                  </span>
                </div>
                <Progress 
                  value={pallet.completion_percentage} 
                  className="h-2"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{pallet.remaining_bottles} bottles remaining</span>
                  <span>{formatPrice(pallet.cost_cents)}</span>
                </div>
              </div>

              {/* Zones */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Delivery:</span>
                  <Badge variant="outline" className="text-xs">
                    {pallet.delivery_zone?.name}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Pickup:</span>
                  <Badge variant="outline" className="text-xs">
                    {pallet.pickup_zone?.name}
                  </Badge>
                </div>
              </div>

              {/* Wine Summary */}
              {pallet.wine_summary.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Wine className="h-4 w-4 text-purple-600" />
                    Wines ({pallet.wine_summary.length} types)
                  </div>
                  <div className="space-y-1 max-h-20 overflow-y-auto">
                    {pallet.wine_summary.slice(0, 3).map((wine, index) => (
                      <div key={index} className="text-xs bg-muted p-2 rounded">
                        <div className="font-medium">{wine.wine_name} {wine.vintage}</div>
                        <div className="text-muted-foreground">
                          {wine.total_quantity} bottles • {wine.producer}
                        </div>
                      </div>
                    ))}
                    {pallet.wine_summary.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{pallet.wine_summary.length - 3} more wines
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/admin/pallets/${pallet.id}`}>
                    <BarChart3 className="h-4 w-4 mr-1" />
                    Details
                  </Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href={`/admin/pallets/${pallet.id}`}>
                    <Users className="h-4 w-4 mr-1" />
                    Edit
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {pallets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No pallets found</h3>
            <p className="text-muted-foreground mb-4 text-center max-w-md">
              Get started by creating your first pallet to manage wine allocations and track bottle capacity.
            </p>
            <Button asChild>
              <Link href="/admin/pallets/new">
                <Plus className="h-4 w-4 mr-2" />
                Create Pallet
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
