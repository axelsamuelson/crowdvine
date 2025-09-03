import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getOrSetCartId } from '@/lib/cookies';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }>}) {
  const { lines } = await req.json(); // [{ id: lineId, quantity }]
  const sb = await supabaseServer();
  const { id: cartId } = await params;
  const cookieCartId = await getOrSetCartId();

  console.log('Updating lines in cart:', { cartId, cookieCartId, lines });

  // Verify cart belongs to this session
  if (cartId !== cookieCartId) {
    console.log('Cart ID mismatch:', { cartId, cookieCartId });
    return NextResponse.json({ error: 'Cart ID mismatch' }, { status: 400 });
  }

  // Check if cart exists
  const { data: cart, error: cartError } = await sb
    .from('carts')
    .select('id')
    .eq('id', cartId)
    .single();

  if (cartError || !cart) {
    console.log('Cart not found');
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
  }

  const updatedItems = [];

  for (const line of lines ?? []) {
    const { id: lineId, quantity } = line;

    if (quantity <= 0) {
      // Remove item
      await sb
        .from('cart_lines')
        .delete()
        .eq('id', lineId)
        .eq('cart_id', cartId);
    } else {
      // Update quantity
      const { data: updatedItem, error: updateError } = await sb
        .from('cart_lines')
        .update({ 
          quantity: quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', lineId)
        .eq('cart_id', cartId)
        .select(`
          id,
          quantity,
          item_id,
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
      id: item.item_id,
      title: `${item.wines.wine_name} ${item.wines.vintage}`,
      selectedOptions: [],
      product: {
        id: item.item_id,
        title: `${item.wines.wine_name} ${item.wines.vintage}`,
        handle: item.item_id,
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
