import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 200;
  
  const { id } = await params;
  const sb = await supabaseServer();
  const { data, error } = await sb
    .from('wines')
    .select('id, handle, wine_name, vintage, label_image_path, base_price_cents, producer_id')
    .eq('producer_id', id)
    .limit(limit);
  if (error) return NextResponse.json([], { status: 200 });

  const products = (data ?? []).map((i: any) => ({
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: '',
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
    images: [{ id: `${i.id}-img`, url: i.label_image_path, altText: i.wine_name }],
    seo: { title: i.wine_name, description: '' },
    tags: [],
    availableForSale: true,
    currencyCode: 'SEK',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));

  return NextResponse.json(products);
}
