import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 200;
  
  const sb = await supabaseServer();
  
  try {
    // Get wines for the specific producer/collection
    const { data, error } = await sb
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
      .eq('producer_id', params.id)
      .limit(limit);
      
    if (error) throw error;
    
    // Convert to Shopify-compatible product format
    const products = (data ?? []).map((i: any) => {
      const grapeVarieties = Array.isArray(i.grape_varieties) 
        ? i.grape_varieties 
        : (i.grape_varieties ? i.grape_varieties.split(',').map((g: string) => g.trim()) : []);
      
      const colorName = i.color;

      return {
        id: i.id,
        title: `${i.wine_name} ${i.vintage}`,
        description: '',
        descriptionHtml: '',
        handle: i.handle,
        productType: 'wine',
        categoryId: i.producer_id,
        options: [
          {
            id: 'grape-varieties',
            name: 'Grape Varieties',
            values: grapeVarieties
          },
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
            ...grapeVarieties.map((grape: string) => ({
              name: 'Grape Varieties',
              value: grape
            })),
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
        seo: { title: i.wine_name, description: '' },
        tags: [
          ...grapeVarieties,
          ...(colorName ? [colorName] : [])
        ],
        availableForSale: true,
        currencyCode: 'SEK',
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
    });
    
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching collection products:', error);
    return NextResponse.json({ error: 'Failed to fetch collection products' }, { status: 500 });
  }
}
