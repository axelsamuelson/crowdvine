'use client';

import { useState, useEffect } from 'react';
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
import { PricingCalculator } from '@/components/admin/pricing-calculator';
import GrapeVarietiesSelector from '@/components/admin/grape-varieties-selector';
import { getGrapeVarieties, createGrapeVariety } from '@/lib/actions/grape-varieties';

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
    producer_id: wine?.producer_id || '',
    // New pricing fields
    cost_currency: wine?.cost_currency || 'EUR',
    cost_amount: wine?.cost_amount || 0,
    exchange_rate_source: wine?.exchange_rate_source || 'current',
    exchange_rate_date: wine?.exchange_rate_date || undefined,
    exchange_rate_period_start: wine?.exchange_rate_period_start || undefined,
    exchange_rate_period_end: wine?.exchange_rate_period_end || undefined,
    exchange_rate: wine?.exchange_rate || undefined,
    alcohol_tax_cents: wine?.alcohol_tax_cents || 0,
    price_includes_vat: wine?.price_includes_vat ?? true,
    margin_percentage: wine?.margin_percentage || 30.00,
    // Keep base_price_cents for backward compatibility
    base_price_cents: wine?.base_price_cents || 0,
    // Remove label_image_path as it's handled by ImageUpload
    label_image_path: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableGrapeVarieties, setAvailableGrapeVarieties] = useState<any[]>([]);
  const [selectedGrapeVarietyIds, setSelectedGrapeVarietyIds] = useState<string[]>([]);
  const router = useRouter();

  // Load grape varieties on component mount
  useEffect(() => {
    const loadGrapeVarieties = async () => {
      try {
        const varieties = await getGrapeVarieties();
        setAvailableGrapeVarieties(varieties);
      } catch (error) {
        console.error('Failed to load grape varieties:', error);
      }
    };
    loadGrapeVarieties();
  }, []);

  // Load existing grape varieties for editing
  useEffect(() => {
    const loadExistingGrapeVarieties = async () => {
      if (wine && wine.id) {
        try {
          const { getWineGrapeVarieties } = await import('@/lib/actions/grape-varieties');
          const existingVarietyIds = await getWineGrapeVarieties(wine.id);
          setSelectedGrapeVarietyIds(existingVarietyIds);
        } catch (error) {
          console.error('Failed to load existing grape varieties:', error);
        }
      }
    };
    
    if (wine && availableGrapeVarieties.length > 0) {
      loadExistingGrapeVarieties();
    }
  }, [wine, availableGrapeVarieties]);

  const handleGrapeVarietiesChange = (varietyIds: string[]) => {
    setSelectedGrapeVarietyIds(varietyIds);
    // Update the formData grape_varieties field with comma-separated names
    const varietyNames = availableGrapeVarieties
      .filter(v => varietyIds.includes(v.id))
      .map(v => v.name)
      .join(', ');
    setFormData(prev => ({ ...prev, grape_varieties: varietyNames }));
  };

  const handleAddNewGrapeVariety = async (name: string) => {
    try {
      const newVariety = await createGrapeVariety({ name, description: '' });
      setAvailableGrapeVarieties(prev => [...prev, newVariety]);
      // Automatically select the newly created variety
      handleGrapeVarietiesChange([...selectedGrapeVarietyIds, newVariety.id]);
    } catch (error) {
      console.error('Failed to create grape variety:', error);
      throw error;
    }
  };

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

      let savedWine;
      if (wine) {
        savedWine = await updateWine(wine.id, wineData);
      } else {
        savedWine = await createWine(wineData);
      }

      // Update wine-grape varieties relationships
      if (savedWine && selectedGrapeVarietyIds.length > 0) {
        const { updateWineGrapeVarieties } = await import('@/lib/actions/grape-varieties');
        await updateWineGrapeVarieties(savedWine.id, selectedGrapeVarietyIds);
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

          {/* New Grape Varieties Selector */}
          <GrapeVarietiesSelector
            selectedVarieties={selectedGrapeVarietyIds}
            onVarietiesChange={handleGrapeVarietiesChange}
            availableVarieties={availableGrapeVarieties}
            onAddNewVariety={handleAddNewGrapeVariety}
            disabled={loading}
          />

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
          </div>

          {/* Pricing Calculator */}
          <PricingCalculator
            pricingData={{
              cost_currency: formData.cost_currency,
              cost_amount: formData.cost_amount,
              exchange_rate_source: formData.exchange_rate_source,
              exchange_rate_date: formData.exchange_rate_date,
              exchange_rate_period_start: formData.exchange_rate_period_start,
              exchange_rate_period_end: formData.exchange_rate_period_end,
              exchange_rate: formData.exchange_rate,
              alcohol_tax_cents: formData.alcohol_tax_cents,
              price_includes_vat: formData.price_includes_vat,
              margin_percentage: formData.margin_percentage,
              calculated_price_cents: 0
            }}
            onPricingChange={(pricingData) => {
              setFormData(prev => ({
                ...prev,
                cost_currency: pricingData.cost_currency,
                cost_amount: pricingData.cost_amount,
                exchange_rate_source: pricingData.exchange_rate_source,
                exchange_rate_date: pricingData.exchange_rate_date,
                exchange_rate_period_start: pricingData.exchange_rate_period_start,
                exchange_rate_period_end: pricingData.exchange_rate_period_end,
                exchange_rate: pricingData.exchange_rate,
                alcohol_tax_cents: pricingData.alcohol_tax_cents,
                price_includes_vat: pricingData.price_includes_vat,
                margin_percentage: pricingData.margin_percentage,
                base_price_cents: pricingData.finalPriceCents
              }));
            }}
          />

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
