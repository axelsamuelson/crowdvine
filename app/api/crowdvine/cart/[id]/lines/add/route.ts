import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const { lines } = await req.json(); // [{ merchandiseId: productId, quantity, band? }]
  const sb = supabaseServer();

  for (const l of lines ?? []) {
    const { error } = await sb.from('bookings').insert({
      item_id: l.merchandiseId, quantity: l.quantity ?? 1, band: l.band ?? 'market'
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Returnera en ShopifyCart-form så UI:t fortsätter fungera
  return NextResponse.json({ id: params.id, lines: lines ?? [], checkoutUrl: '/checkout' });
}
