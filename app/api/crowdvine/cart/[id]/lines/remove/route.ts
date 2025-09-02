import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }>}) {
  const { lineIds } = await req.json(); // [lineId1, lineId2, ...]
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

  // Remove items
  const { error: deleteError } = await sb
    .from('cart_items')
    .delete()
    .eq('cart_id', cartId)
    .in('id', lineIds);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Update cart timestamp
  await sb
    .from('carts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', cartId);

  return NextResponse.json({ 
    id: cartId, 
    lines: [], 
    checkoutUrl: '/checkout' 
  });
}
