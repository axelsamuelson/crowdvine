import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_: Request, { params }: { params: { handle: string } }) {
  const sb = await supabaseServer();
  const { data: i, error } = await sb
    .from('wines')
    .select('id, handle, wine_name, vintage, label_image_path, grape_varieties, color, base_price_cents, producer_id')
    .eq('handle', params.handle)
    .single();
  if (error || !i) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const product = {
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: i.grape_varieties ?? '',
    descriptionHtml: '',
    handle: i.handle,
    productType: 'wine',
    categoryId: i.producer_id,
    options: [],
    variants: [{
      id: `${i.id}-default`,
      title: '750 ml',
      availableForSale: true,
      price: { amount: Math.ceil(i.base_price_cents / 100).toString(), currencyCode: 'SEK' },
      selectedOptions: [],
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
    seo: { title: i.wine_name, description: i.grape_varieties ?? '' },
    tags: [i.color],
    availableForSale: true,
    currencyCode: 'SEK',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(product);
}
