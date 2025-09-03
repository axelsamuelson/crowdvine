import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getOrSetCartId } from '@/lib/cookies';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }>}) {
  const { lines } = await req.json(); // [{ merchandiseId: wineId, quantity }]
  const sb = await supabaseServer();
  const { id: cartId } = await params;
  const cookieCartId = await getOrSetCartId();
  
  console.log('Adding lines to cart:', { cartId, cookieCartId, lines });

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
    console.log('Cart not found, creating new cart');
    const { data: newCart, error: createError } = await sb
      .from('carts')
      .insert({ id: cartId })
      .select()
      .single();
    
    if (createError) {
      console.log('Cart creation error:', createError);
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
  }

  const addedItems = [];

  for (const line of lines ?? []) {
    const { merchandiseId: wineId, quantity = 1 } = line;

    // Extract actual wine ID from variant ID (remove -default suffix)
    const actualWineId = wineId.replace('-default', '');

    // Check if item already exists in cart
    const { data: existingItem } = await sb
      .from('cart_lines')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('item_id', actualWineId)
      .single();

    if (existingItem) {
      // Update quantity
      const { data: updatedItem, error: updateError } = await sb
        .from('cart_lines')
        .update({ 
          quantity: existingItem.quantity + quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingItem.id)
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

      addedItems.push(updatedItem);
    } else {
      // Add new item
      const { data: newItem, error: insertError } = await sb
        .from('cart_lines')
        .insert({
          cart_id: cartId,
          item_id: actualWineId,
          quantity: quantity
        })
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
  const transformedLines = addedItems.map(item => {
    const wine = item.wines as any; // Type assertion to avoid TypeScript issues
    return {
      id: item.id,
      quantity: item.quantity,
      merchandise: {
        id: item.item_id,
        title: `${wine?.wine_name || 'Unknown Wine'} ${wine?.vintage || ''}`,
        selectedOptions: [],
        product: {
          id: item.item_id,
          title: `${wine?.wine_name || 'Unknown Wine'} ${wine?.vintage || ''}`,
          handle: item.item_id,
          featuredImage: { 
            url: wine?.label_image_path || '', 
            altText: wine?.wine_name || 'Wine',
            width: 600,
            height: 600
          },
          priceRange: {
            minVariantPrice: { 
              amount: ((wine?.base_price_cents || 0) / 100).toString(), 
              currencyCode: 'SEK' 
            },
            maxVariantPrice: { 
              amount: ((wine?.base_price_cents || 0) / 100).toString(), 
              currencyCode: 'SEK' 
            }
          }
        }
      },
      cost: {
        totalAmount: {
          amount: (((wine?.base_price_cents || 0) * item.quantity) / 100).toString(),
          currencyCode: 'SEK'
        }
      }
    };
  });

  console.log('Successfully added items:', transformedLines.length);

  return NextResponse.json({ 
    id: cartId, 
    lines: transformedLines, 
    checkoutUrl: '/checkout' 
  });
}
