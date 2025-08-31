import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('campaign_items')
    .select('id, handle, wine_name, vintage, label_image_path, price_t500_cents, price_t100_cents, campaign_id')
    .eq('campaign_id', params.id);
  if (error) return NextResponse.json([], { status: 200 });

  const products = (data ?? []).map((i) => ({
    id: i.id,
    title: `${i.wine_name} ${i.vintage}`,
    description: '',
    descriptionHtml: '',
    handle: i.handle,
    productType: 'wine',
    options: [],
    variants: [{
      id: `${i.id}-default`,
      title: '750 ml',
      availableForSale: true,
      price: { amount: (i.price_t500_cents / 100).toFixed(2), currencyCode: 'SEK' },
      selectedOptions: [],
    }],
    priceRange: {
      minVariantPrice: { amount: (i.price_t500_cents / 100).toFixed(2), currencyCode: 'SEK' },
      maxVariantPrice: { amount: (i.price_t100_cents / 100).toFixed(2), currencyCode: 'SEK' },
    },
    images: [{ id: `${i.id}-img`, url: i.label_image_path, altText: i.wine_name }],
    seo: { title: i.wine_name, description: '' },
    tags: [],
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  }));

  return NextResponse.json(products);
}
