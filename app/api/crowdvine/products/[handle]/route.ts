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

  // Use the new structured function to get wine with details
  const { data, error } = await sb
    .rpc('get_wine_with_details', { wine_id: wineIdData.id });
    
  if (error || !data || data.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const i = data[0];

  const product = {
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: (i.grape_varieties || []).join(', ') || '',
    descriptionHtml: '',
    handle: i.handle,
    productType: 'wine',
    categoryId: i.producer_id,
    options: [
      // Add grape varieties as an option
      {
        id: 'grape-varieties',
        name: 'Grape Varieties',
        values: i.grape_varieties || []
      },
      // Add color as an option
      {
        id: 'color',
        name: 'Color',
        values: i.color_name ? [i.color_name] : []
      }
    ],
    variants: [{
      id: `${i.id}-default`,
      title: '750 ml',
      availableForSale: true,
      price: { amount: Math.ceil(i.base_price_cents / 100).toString(), currencyCode: 'SEK' },
      selectedOptions: [
        // Add grape varieties to variant
        ...(i.grape_varieties || []).map((grape: string) => ({
          name: 'Grape Varieties',
          value: grape
        })),
        // Add color to variant
        ...(i.color_name ? [{
          name: 'Color',
          value: i.color_name
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
    seo: { title: i.wine_name, description: (i.grape_varieties || []).join(', ') || '' },
    tags: [
      // Add grape varieties as tags
      ...(i.grape_varieties || []),
      // Add color as tag
      ...(i.color_name ? [i.color_name] : [])
    ],
    availableForSale: true,
    currencyCode: 'SEK',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(product);
}
