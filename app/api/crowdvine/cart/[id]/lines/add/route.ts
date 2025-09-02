import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }>}) {
  const { lines } = await req.json(); // [{ merchandiseId: wineId, quantity }]
  const sb = await supabaseServer();
  const { id: cartId } = await params;
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('cartId')?.value;

  console.log('Cart add debug:', { cartId, sessionId, lines });

  if (!sessionId) {
    console.log('No session found in cookies');
    return NextResponse.json({ error: 'No session found' }, { status: 400 });
  }

  // Verify cart belongs to session
  const { data: cart, error: cartError } = await sb
    .from('carts')
    .select('id, session_id')
    .eq('id', cartId)
    .single();

  console.log('Cart lookup result:', { cart, cartError });

  if (cartError || !cart) {
    console.log('Cart not found');
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
  }

  if (cart.session_id !== sessionId) {
    console.log('Session mismatch:', { cartSessionId: cart.session_id, cookieSessionId: sessionId });
    return NextResponse.json({ error: 'Cart does not belong to session' }, { status: 403 });
  }

  const addedItems = [];

  for (const line of lines ?? []) {
    const { merchandiseId: wineId, quantity = 1 } = line;

    // Check if item already exists in cart
    const { data: existingItem } = await sb
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('wine_id', wineId)
      .single();

    if (existingItem) {
      // Update quantity
      const { data: updatedItem, error: updateError } = await sb
        .from('cart_items')
        .update({ 
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
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

      addedItems.push(updatedItem);
    } else {
      // Add new item
      const { data: newItem, error: insertError } = await sb
        .from('cart_items')
        .insert({
          cart_id: cartId,
          wine_id: wineId,
          quantity: quantity
        })
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

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      addedItems.push(newItem);
    }
  }

  // Update cart timestamp
  await sb
    .from('carts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', cartId);

  // Transform to Shopify-like format
  const transformedLines = addedItems.map(item => ({
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

  console.log('Successfully added items:', transformedLines.length);

  return NextResponse.json({ 
    id: cartId, 
    lines: transformedLines, 
    checkoutUrl: '/checkout' 
  });
}
