import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET() {
  const sb = await supabaseServer();
  const { data, error } = await sb.from('campaigns').select('id, title, status').eq('status','live');
  if (error) return NextResponse.json([], { status: 200 });
  const cols = (data ?? []).map((c: any) => ({ 
    id: c.id, 
    handle: c.id, 
    title: c.title, 
    path: `/shop?collection=${c.id}`,
    seo: { title: c.title, description: '' },
    parentCategoryTree: [],
    updatedAt: new Date().toISOString()
  }));
  return NextResponse.json(cols);
}
