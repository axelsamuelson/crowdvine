import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  const sb = await supabaseServer();
  const cookieStore = await cookies();
  
  // Get or create session ID
  let sessionId = cookieStore.get('cartId')?.value;
  
  if (!sessionId) {
    sessionId = crypto.randomUUID();
  }

  // Check if cart already exists for this session
  const { data: existingCart } = await sb
    .from('carts')
    .select('id')
    .eq('session_id', sessionId)
    .single();

  if (existingCart) {
    // Return existing cart
    const response = NextResponse.json(existingCart);
    response.cookies.set('cartId', sessionId, { 
      maxAge: 30 * 24 * 60 * 60,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    return response;
  }

  // Create new cart
  const { data: cart, error } = await sb
    .from('carts')
    .insert({ session_id: sessionId })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Set session cookie
  const response = NextResponse.json(cart);
  response.cookies.set('cartId', sessionId, { 
    maxAge: 30 * 24 * 60 * 60,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });

  return response;
}

export async function GET(req: NextRequest) {
  const sb = await supabaseServer();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get('cartId')?.value;

  if (!sessionId) {
    return NextResponse.json({ id: null, lines: [], totalQuantity: 0 });
  }

  // Get cart with items
  const { data: cart, error: cartError } = await sb
    .from('carts')
    .select(`
      id,
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

  if (cartError) {
    return NextResponse.json({ id: null, lines: [], totalQuantity: 0 });
  }

  if (!cart) {
    return NextResponse.json({ id: null, lines: [], totalQuantity: 0 });
  }

  // Transform to Shopify-like format
  const lines = (cart.cart_items || []).map(item => ({
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

  const totalQuantity = lines.reduce((sum, line) => sum + line.quantity, 0);

  return NextResponse.json({ 
    id: cart.id, 
    lines, 
    totalQuantity 
  });
}
