'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Package, MapPin, DollarSign, Wine } from 'lucide-react';
import Link from 'next/link';

interface PalletZone {
  id: string;
  name: string;
  zone_type: 'delivery' | 'pickup';
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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pallets</h1>
        </div>
        <div>Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pallets</h1>
          <Button asChild>
            <Link href="/admin/pallets/new">
              <Plus className="h-4 w-4 mr-2" />
              Add Pallet
            </Link>
          </Button>
        </div>
        <div>Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pallets</h1>
        <Button asChild>
          <Link href="/admin/pallets/new">
            <Plus className="h-4 w-4 mr-2" />
            Add Pallet
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {pallets.map((pallet) => (
          <Card key={pallet.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {pallet.name}
              </CardTitle>
              <CardDescription>
                {pallet.description || 'No description'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Delivery:</span>
                <span>{pallet.delivery_zone?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Pickup:</span>
                <span>{pallet.pickup_zone?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Cost:</span>
                <span>{(pallet.cost_cents / 100).toFixed(2)} SEK</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Wine className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Capacity:</span>
                <span>{pallet.bottle_capacity} bottles</span>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/pallets/${pallet.id}`}>
                    Edit
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pallets.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No pallets found</h3>
            <p className="text-muted-foreground mb-4">
              Get started by creating your first pallet.
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
