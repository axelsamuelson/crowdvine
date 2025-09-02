'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreateProducerData, Producer, createProducer, updateProducer } from '@/lib/actions/producers';
import { getPickupZones, PalletZone } from '@/lib/actions/zones';

interface ProducerFormProps {
  producer?: Producer;
}

export default function ProducerForm({ producer }: ProducerFormProps) {
  const [formData, setFormData] = useState<CreateProducerData>({
    name: producer?.name || '',
    region: producer?.region || '',
    lat: producer?.lat || 0,
    lon: producer?.lon || 0,
    country_code: producer?.country_code || '',
    address_street: producer?.address_street || '',
    address_city: producer?.address_city || '',
    address_postcode: producer?.address_postcode || '',
    short_description: producer?.short_description || '',
    logo_image_path: producer?.logo_image_path || '',
    pickup_zone_id: producer?.pickup_zone_id || '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pickupZones, setPickupZones] = useState<PalletZone[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadPickupZones = async () => {
      try {
        const zones = await getPickupZones();
        setPickupZones(zones);
      } catch (err) {
        console.error('Failed to load pickup zones:', err);
      }
    };
    loadPickupZones();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (producer) {
        await updateProducer(producer.id, formData);
      } else {
        await createProducer(formData);
      }
      router.push('/admin/producers');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateProducerData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{producer ? 'Edit Producer' : 'Add Producer'}</CardTitle>
        <CardDescription>
          {producer ? 'Update producer information' : 'Create a new wine producer'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="region">Region *</Label>
              <Input
                id="region"
                value={formData.region}
                onChange={(e) => handleChange('region', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lat">Latitude *</Label>
              <Input
                id="lat"
                type="number"
                step="0.0001"
                value={formData.lat}
                onChange={(e) => handleChange('lat', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lon">Longitude *</Label>
              <Input
                id="lon"
                type="number"
                step="0.0001"
                value={formData.lon}
                onChange={(e) => handleChange('lon', parseFloat(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country_code">Country Code *</Label>
              <Input
                id="country_code"
                value={formData.country_code}
                onChange={(e) => handleChange('country_code', e.target.value)}
                placeholder="FR"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_street">Street Address *</Label>
            <Input
              id="address_street"
              value={formData.address_street}
              onChange={(e) => handleChange('address_street', e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="address_city">City *</Label>
              <Input
                id="address_city"
                value={formData.address_city}
                onChange={(e) => handleChange('address_city', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address_postcode">Postal Code *</Label>
              <Input
                id="address_postcode"
                value={formData.address_postcode}
                onChange={(e) => handleChange('address_postcode', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Description</Label>
            <Textarea
              id="short_description"
              value={formData.short_description}
              onChange={(e) => handleChange('short_description', e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo_image_path">Logo Image URL</Label>
            <Input
              id="logo_image_path"
              type="url"
              value={formData.logo_image_path}
              onChange={(e) => handleChange('logo_image_path', e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pickup_zone_id">Pickup Zone</Label>
            <select
              id="pickup_zone_id"
              value={formData.pickup_zone_id || ''}
              onChange={(e) => handleChange('pickup_zone_id', e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-1 text-base transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-[invalid=true]:border-red-500 aria-[invalid=true]:focus-visible:!ring-red-500"
            >
              <option value="">No pickup zone selected</option>
              {pickupZones.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.name}
                </option>
              ))}
            </select>
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
              {loading ? 'Saving...' : (producer ? 'Update Producer' : 'Create Producer')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
