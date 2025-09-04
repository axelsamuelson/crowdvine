import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_: Request, { params }: { params: { handle: string } }) {
  const sb = await supabaseServer();
  
  // First get the wine ID from handle
  const { data: wineIdData, error: wineIdError } = await sb
    .from('wines')
    .select('id')
    .eq('handle', params.handle)
    .single();
    
  if (wineIdError || !wineIdData) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Try the new structured function, fallback to old method
  let data;
  let error;
  
  try {
    const result = await sb.rpc('get_wine_with_details', { wine_id: wineIdData.id });
    data = result.data;
    error = result.error;
  } catch (e) {
    // Fallback to old method if RPC function doesn't exist
    const result = await sb
      .from('wines')
      .select(`
        id,
        wine_name,
        vintage,
        grape_varieties,
        color,
        handle,
        base_price_cents,
        label_image_path,
        producer_id
      `)
      .eq('id', wineIdData.id)
      .single();
    data = result.data;
    error = result.error;
  }
    
  if (error || !data) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const i = Array.isArray(data) ? data[0] : data;

  // Parse grape varieties from string or use array
  const grapeVarieties = Array.isArray(i.grape_varieties) 
    ? i.grape_varieties 
    : (i.grape_varieties ? i.grape_varieties.split(',').map((g: string) => g.trim()) : []);
  
  // Use color_name if available, otherwise use color
  const colorName = i.color_name || i.color;

  const product = {
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: grapeVarieties.join(', ') || '',
    descriptionHtml: '',
    handle: i.handle,
    productType: 'wine',
    categoryId: i.producer_id,
    options: [
      // Add grape varieties as an option
      {
        id: 'grape-varieties',
        name: 'Grape Varieties',
        values: grapeVarieties
      },
      // Add color as an option
      {
        id: 'color',
        name: 'Color',
        values: colorName ? [colorName] : []
      }
    ],
    variants: [{
      id: `${i.id}-default`,
      title: '750 ml',
      availableForSale: true,
      price: { amount: Math.ceil(i.base_price_cents / 100).toString(), currencyCode: 'SEK' },
      selectedOptions: [
        // Add grape varieties to variant
        ...grapeVarieties.map((grape: string) => ({
          name: 'Grape Varieties',
          value: grape
        })),
        // Add color to variant
        ...(colorName ? [{
          name: 'Color',
          value: colorName
        }] : [])
      ],
    }],
    priceRange: {
      minVariantPrice: { amount: Math.ceil(i.base_price_cents / 100).toString(), currencyCode: 'SEK' },
      maxVariantPrice: { amount: Math.ceil(i.base_price_cents / 100).toString(), currencyCode: 'SEK' },
    },
    featuredImage: { 
      id: `${i.id}-img`, 
      url: i.label_image_path, 
      altText: i.wine_name,
      width: 600,
      height: 600
    },
    images: [{ id: `${i.id}-img`, url: i.label_image_path, altText: i.wine_name, width: 600, height: 600 }],
    seo: { title: i.wine_name, description: grapeVarieties.join(', ') || '' },
    tags: [
      // Add grape varieties as tags
      ...grapeVarieties,
      // Add color as tag
      ...(colorName ? [colorName] : [])
    ],
    availableForSale: true,
    currencyCode: 'SEK',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(product);
}
