'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreatePalletZoneData, PalletZone } from '@/lib/actions/zones';

interface ZoneFormProps {
  zone?: PalletZone;
  onSubmit: (data: CreatePalletZoneData) => Promise<void>;
}

export default function ZoneForm({ zone, onSubmit }: ZoneFormProps) {
  const [formData, setFormData] = useState<CreatePalletZoneData>({
    name: zone?.name || '',
    radius_km: zone?.radius_km || 500,
    center_lat: zone?.center_lat || 0,
    center_lon: zone?.center_lon || 0,
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await onSubmit(formData);
      router.push('/admin/zones');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreatePalletZoneData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{zone ? 'Edit Zone' : 'Add Zone'}</CardTitle>
        <CardDescription>
          {zone ? 'Update zone configuration' : 'Create a new delivery zone'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Zone Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Béziers 500 km"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="center_lat">Center Latitude *</Label>
              <Input
                id="center_lat"
                type="number"
                step="0.0001"
                value={formData.center_lat}
                onChange={(e) => handleChange('center_lat', parseFloat(e.target.value) || 0)}
                placeholder="43.3444"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="center_lon">Center Longitude *</Label>
              <Input
                id="center_lon"
                type="number"
                step="0.0001"
                value={formData.center_lon}
                onChange={(e) => handleChange('center_lon', parseFloat(e.target.value) || 0)}
                placeholder="3.2169"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="radius_km">Radius (km) *</Label>
              <Input
                id="radius_km"
                type="number"
                step="1"
                value={formData.radius_km}
                onChange={(e) => handleChange('radius_km', parseInt(e.target.value) || 0)}
                placeholder="500"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : (zone ? 'Update Zone' : 'Create Zone')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
