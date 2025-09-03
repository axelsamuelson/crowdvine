import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { getOrSetCartId } from '@/lib/cookies';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }>}) {
  const { lineIds } = await req.json(); // [lineId1, lineId2, ...]
  const sb = await supabaseServer();
  const { id: cartId } = await params;
  const cookieCartId = await getOrSetCartId();

  console.log('Removing lines from cart:', { cartId, cookieCartId, lineIds });

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

  // Remove items
  for (const lineId of lineIds ?? []) {
    const { error: deleteError } = await sb
      .from('cart_lines')
      .delete()
      .eq('id', lineId)
      .eq('cart_id', cartId);
    
    if (deleteError) {
      console.log('Delete error:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  // Update cart timestamp
  await sb
    .from('carts')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', cartId);

  return NextResponse.json({ ok: true, id: cartId });
}
