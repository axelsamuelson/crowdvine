import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 200;
  
  const sb = await supabaseServer();
  
  // Use the new structured function to get wines with grape varieties and colors
  const { data, error } = await sb
    .rpc('get_all_wines_with_details')
    .limit(limit);
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Forma Product-minimum som UI:et använder
  const products = (data ?? []).map((i: any) => ({
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: '',
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
    seo: { title: i.wine_name, description: '' },
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
  }));

  return NextResponse.json(products);
}
