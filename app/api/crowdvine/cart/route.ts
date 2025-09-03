import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getOrSetCartId } from '@/lib/cookies';

export async function POST(req: Request) {
  const cartId = await getOrSetCartId();
  const sb = await supabaseServer();
  
  console.log('Creating/retrieving cart with ID:', cartId);

  // Check if cart already exists
  const { data: existingCart, error: checkError } = await sb
    .from('carts')
    .select('id')
    .eq('id', cartId)
    .single();

  if (existingCart) {
    console.log('Cart already exists:', existingCart.id);
    return NextResponse.json({ id: cartId, checkoutUrl: '/checkout' });
  }

  // Create new cart
  const { data: cart, error } = await sb
    .from('carts')
    .insert({ id: cartId })
    .select()
    .single();

  if (error) {
    console.log('Cart creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('Cart created successfully:', cart);

  return NextResponse.json({ id: cartId, checkoutUrl: '/checkout' });
}

export async function GET(req: NextRequest) {
  const cartId = await getOrSetCartId();
  const sb = await supabaseServer();

  console.log('Getting cart with ID:', cartId);

  // Get cart with items
  const { data: cart, error: cartError } = await sb
    .from('carts')
    .select(`
      id,
      cart_lines (
        id,
        quantity,
        item_id,
        band,
        wines (
          id,
          wine_name,
          vintage,
          label_image_path,
          base_price_cents
        )
      )
    `)
    .eq('id', cartId)
    .single();

  if (cartError || !cart) {
    console.log('Cart not found, returning empty cart');
    // Return empty cart instead of 404 so server action can create new one
    return NextResponse.json({ 
      id: cartId, 
      lines: [], 
      totalQuantity: 0 
    });
  }

  // Transform to Shopify-like format
  const lines = (cart.cart_lines || []).map(item => {
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

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  return NextResponse.json({ 
    id: cart.id, 
    lines, 
    totalQuantity 
  });
}
