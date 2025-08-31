import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb
    .from('campaign_items')
    .select('id, handle, wine_name, vintage, label_image_path, price_t500_cents, price_t300_cents, price_t100_cents, campaign_id')
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Forma ShopifyProduct-minimum som UI:et använder
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
