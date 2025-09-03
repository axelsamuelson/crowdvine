import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const sb = await supabaseServer();
  
  // Always create a new session ID
  const sessionId = crypto.randomUUID();
  
  console.log('Creating new cart with session ID:', sessionId);

  // Create new cart
  const { data: cart, error } = await sb
    .from('carts')
    .insert({ session_id: sessionId })
    .select()
    .single();

  if (error) {
    console.log('Cart creation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('Cart created successfully:', cart);

  // Set session cookie
  const response = NextResponse.json(cart);
  response.cookies.set('cartId', sessionId, { 
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  console.log('Cookie set:', sessionId);

  return response;
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('cartId')?.value;

  if (!sessionId) {
    return NextResponse.json({ error: 'No session found' }, { status: 404 });
  }

  // Get cart with items
  const { data: cart, error: cartError } = await sb
    .from('carts')
    .select(`
      id,
      session_id,
      cart_items (
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
      )
    `)
    .eq('session_id', sessionId)
    .single();

  if (cartError || !cart) {
    return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
  }

  // Transform to Shopify-like format
  const lines = (cart.cart_items || []).map(item => {
    const wine = item.wines as any; // Type assertion to avoid TypeScript issues
    return {
      id: item.id,
      quantity: item.quantity,
      merchandise: {
        id: item.wine_id,
        title: `${wine?.wine_name || 'Unknown Wine'} ${wine?.vintage || ''}`,
        selectedOptions: [],
        product: {
          id: item.wine_id,
          title: `${wine?.wine_name || 'Unknown Wine'} ${wine?.vintage || ''}`,
          handle: item.wine_id,
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
    session_id: cart.session_id,
    lines, 
    totalQuantity 
  });
}
