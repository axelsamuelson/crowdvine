'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreateWineData, Wine, createWine, updateWine } from '@/lib/actions/wines';
import { Campaign } from '@/lib/actions/campaigns';

interface WineFormProps {
  wine?: Wine;
  campaigns: Campaign[];
}

export default function WineForm({ wine, campaigns }: WineFormProps) {
  const [formData, setFormData] = useState<CreateWineData>({
    handle: wine?.handle || '',
    wine_name: wine?.wine_name || '',
    vintage: wine?.vintage || '',
    grape_varieties: wine?.grape_varieties || '',
    color: wine?.color || 'red',
    label_image_path: wine?.label_image_path || '',
    base_price_cents: wine?.base_price_cents || 0,
    campaign_id: wine?.campaign_id || '',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (wine) {
        await updateWine(wine.id, formData);
      } else {
        await createWine(formData);
      }
      router.push('/admin/wines');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CreateWineData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{wine ? 'Edit Wine' : 'Add Wine'}</CardTitle>
        <CardDescription>
          {wine ? 'Update wine information' : 'Create a new wine product'}
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
              <Label htmlFor="wine_name">Wine Name *</Label>
              <Input
                id="wine_name"
                value={formData.wine_name}
                onChange={(e) => handleChange('wine_name', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vintage">Vintage *</Label>
              <Input
                id="vintage"
                value={formData.vintage}
                onChange={(e) => handleChange('vintage', e.target.value)}
                placeholder="2020"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="handle">Handle *</Label>
              <Input
                id="handle"
                value={formData.handle}
                onChange={(e) => handleChange('handle', e.target.value)}
                placeholder="wine-name-vintage"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color *</Label>
              <Select
                value={formData.color}
                onValueChange={(value) => handleChange('color', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="red">Red</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="rose">Rosé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grape_varieties">Grape Varieties</Label>
            <Input
              id="grape_varieties"
              value={formData.grape_varieties}
              onChange={(e) => handleChange('grape_varieties', e.target.value)}
              placeholder="Syrah, Grenache, Mourvèdre"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign_id">Campaign *</Label>
              <Select
                value={formData.campaign_id}
                onValueChange={(value) => handleChange('campaign_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a campaign" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.title} ({campaign.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="base_price_cents">Base Price (SEK) *</Label>
              <Input
                id="base_price_cents"
                type="number"
                step="0.01"
                value={(formData.base_price_cents / 100).toFixed(2)}
                onChange={(e) => handleChange('base_price_cents', Math.round(parseFloat(e.target.value) * 100) || 0)}
                placeholder="148.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="label_image_path">Label Image URL</Label>
            <Input
              id="label_image_path"
              type="url"
              value={formData.label_image_path}
              onChange={(e) => handleChange('label_image_path', e.target.value)}
              placeholder="https://example.com/wine-label.jpg"
            />
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
              {loading ? 'Saving...' : (wine ? 'Update Wine' : 'Create Wine')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
