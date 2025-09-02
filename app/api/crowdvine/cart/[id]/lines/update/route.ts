import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }>}) {
  const { lines } = await req.json(); // [{ id: lineId, quantity }]
  const sb = await supabaseServer();
  const { id: cartId } = await params;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('cart_session_id')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'No session found' }, { status: 400 });
  }

  // Verify cart belongs to session
  const { data: cart, error: cartError } = await sb
    .from('carts')
    .select('id')
    .eq('id', cartId)
    .eq('session_id', sessionId)
    .single();

  if (cartError || !cart) {
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
  }

  const updatedItems = [];

  for (const line of lines ?? []) {
    const { id: lineId, quantity } = line;

    if (quantity <= 0) {
      // Remove item
      await sb
        .from('cart_items')
        .delete()
        .eq('id', lineId)
        .eq('cart_id', cartId);
    } else {
      // Update quantity
      const { data: updatedItem, error: updateError } = await sb
        .from('cart_items')
        .update({ 
          quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', lineId)
        .eq('cart_id', cartId)
        .select(`
          id,
          quantity,
          wine_id,
          wines (
            id,
            wine_name,
            vintage,
            label_image_path,
            base_price_cents
          )
        `)
        .single();

      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }

      if (updatedItem) {
        updatedItems.push(updatedItem);
      }
    }
  }

  // Update cart timestamp
  await sb
    .from('carts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', cartId);

  // Transform to Shopify-like format
  const transformedLines = updatedItems.map(item => ({
    id: item.id,
    quantity: item.quantity,
    merchandise: {
      id: item.wine_id,
      title: `${item.wines.wine_name} ${item.wines.vintage}`,
      selectedOptions: [],
      product: {
        id: item.wine_id,
        title: `${item.wines.wine_name} ${item.wines.vintage}`,
        handle: item.wine_id,
        featuredImage: { 
          url: item.wines.label_image_path || '', 
          altText: item.wines.wine_name,
          width: 600,
          height: 600
        },
        priceRange: {
          minVariantPrice: { 
            amount: (item.wines.base_price_cents / 100).toString(), 
            currencyCode: 'SEK' 
          },
          maxVariantPrice: { 
            amount: (item.wines.base_price_cents / 100).toString(), 
            currencyCode: 'SEK' 
          }
        }
      }
    },
    cost: {
      totalAmount: {
        amount: ((item.wines.base_price_cents * item.quantity) / 100).toString(),
        currencyCode: 'SEK'
      }
    }
  }));

  return NextResponse.json({ 
    id: cartId, 
    lines: transformedLines, 
    checkoutUrl: '/checkout' 
  });
}
