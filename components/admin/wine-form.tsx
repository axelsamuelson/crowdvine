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
import { Producer } from '@/lib/actions/producers';
import { ImageUpload } from '@/components/admin/image-upload';

interface WineFormProps {
  wine?: Wine;
  producers: Producer[];
}

export default function WineForm({ wine, producers }: WineFormProps) {
  const [formData, setFormData] = useState<CreateWineData>({
    handle: wine?.handle || '',
    wine_name: wine?.wine_name || '',
    vintage: wine?.vintage || '',
    grape_varieties: wine?.grape_varieties || '',
    color: wine?.color || 'red',
    label_image_path: wine?.label_image_path || '',
    base_price_cents: wine?.base_price_cents || 0,
    producer_id: wine?.producer_id || '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate required fields
    const missingFields: string[] = [];
    
    if (!formData.wine_name.trim()) missingFields.push('Wine Name');
    if (!formData.handle.trim()) missingFields.push('Handle');
    if (!formData.vintage.trim()) missingFields.push('Vintage');
    if (!formData.producer_id) missingFields.push('Producer');
    if (formData.base_price_cents <= 0) missingFields.push('Base Price');

    if (missingFields.length > 0) {
      setError(`Please fill in the following required fields: ${missingFields.join(', ')}`);
      setLoading(false);
      return;
    }

    try {
      // Upload images if any
      let imagePaths: string[] = [];
      if (images.length > 0) {
        const formDataUpload = new FormData();
        images.forEach(image => {
          formDataUpload.append('files', image);
        });

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formDataUpload,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload images');
        }

        const uploadResult = await uploadResponse.json();
        imagePaths = uploadResult.files;
      }

      // Use first image as main image if available
      const wineData = {
        ...formData,
        label_image_path: imagePaths.length > 0 ? imagePaths[0] : formData.label_image_path,
      };

      if (wine) {
        await updateWine(wine.id, wineData);
      } else {
        await createWine(wineData);
      }
      router.push('/admin/wines');
    } catch (err) {
      console.error('Wine creation error:', err);
      if (err instanceof Error) {
        setError(`Failed to save wine: ${err.message}`);
      } else {
        setError('An unexpected error occurred while saving the wine');
      }
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
              <Label htmlFor="producer_id">Producer *</Label>
              <Select
                value={formData.producer_id}
                onValueChange={(value) => handleChange('producer_id', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a producer" />
                </SelectTrigger>
                <SelectContent>
                  {producers.map((producer) => (
                    <SelectItem key={producer.id} value={producer.id}>
                      {producer.name} ({producer.region})
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

          <ImageUpload 
            images={images}
            onImagesChange={setImages}
          />

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
