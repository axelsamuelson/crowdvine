import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }>}) {
  const { lines } = await req.json(); // [{ id: bookingId, quantity }]
  const sb = await supabaseServer();
  const { id } = await params;

  for (const l of lines ?? []) {
    const { error } = await sb.from('bookings')
      .update({ quantity: l.quantity })
      .eq('id', l.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Returnera en ShopifyCart-form så UI:t fortsätter fungera
  return NextResponse.json({ id, lines: lines ?? [], checkoutUrl: '/checkout' });
}
