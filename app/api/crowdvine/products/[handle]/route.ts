import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_: Request, { params }: { params: { handle: string } }) {
  const sb = await supabaseServer();
  const { data: i, error } = await sb
    .from('campaign_items')
    .select('id, handle, wine_name, vintage, label_image_path, grape_varieties, color, price_t100_cents, price_t200_cents, price_t300_cents, price_t400_cents, price_t500_cents, price_t600_cents, price_t700_cents, campaign_id')
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
    categoryId: i.campaign_id,
    options: [],
    variants: [{
      id: `${i.id}-default`,
      title: '750 ml',
      availableForSale: true,
      price: { amount: (i.price_t500_cents / 100).toFixed(2), currencyCode: 'SEK' },
      selectedOptions: [],
    }],
    priceRange: {
      minVariantPrice: { amount: (i.price_t700_cents / 100).toFixed(2), currencyCode: 'SEK' },
      maxVariantPrice: { amount: (i.price_t100_cents / 100).toFixed(2), currencyCode: 'SEK' },
    },
    featuredImage: { 
      id: `${i.id}-img`, 
      url: i.label_image_path, 
      altText: i.wine_name,
      width: 600,
      height: 600
    },
    images: [{ id: `${i.id}-img`, url: i.label_image_path, altText: i.wine_name }],
    seo: { title: i.wine_name, description: i.grape_varieties ?? '' },
    tags: [i.color],
    availableForSale: true,
    currencyCode: 'SEK',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  return NextResponse.json(product);
}
