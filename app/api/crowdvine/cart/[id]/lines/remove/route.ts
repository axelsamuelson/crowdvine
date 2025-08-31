import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request, { params }: { params: { id: string }}) {
  const { lineIds } = await req.json(); // [bookingId1, bookingId2, ...]
  const sb = await supabaseServer();

  for (const lineId of lineIds ?? []) {
    const { error } = await sb.from('bookings')
      .update({ status: 'canceled' })
      .eq('id', lineId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Returnera en ShopifyCart-form så UI:t fortsätter fungera
  return NextResponse.json({ id: params.id, lines: [], checkoutUrl: '/checkout' });
}
