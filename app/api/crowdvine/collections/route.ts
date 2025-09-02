import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const sb = await supabaseServer();
  const { data, error } = await sb.from('producers').select('id, name').eq('active', true);
  if (error) return NextResponse.json([], { status: 200 });
  const cols = (data ?? []).map((c: any) => ({ 
    id: c.id, 
    handle: c.id, 
    title: c.name, 
    path: `/shop?collection=${c.id}`,
    seo: { title: c.name, description: '' },
    parentCategoryTree: [],
    updatedAt: new Date().toISOString()
  }));
  return NextResponse.json(cols);
}
