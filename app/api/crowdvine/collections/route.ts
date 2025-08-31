import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const sb = supabaseServer();
  const { data, error } = await sb.from('campaigns').select('id, title, status').eq('status','live');
  if (error) return NextResponse.json([], { status: 200 });
  const cols = (data ?? []).map(c => ({ id: c.id, handle: c.id, title: c.title, path: `/shop?collection=${c.id}` }));
  return NextResponse.json(cols);
}
