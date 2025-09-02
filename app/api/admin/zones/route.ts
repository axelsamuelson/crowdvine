import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');

  const sb = await supabaseServer();
  
  let query = sb.from('pallet_zones').select('*');
  
  if (type === 'delivery') {
    query = query.eq('zone_type', 'delivery');
  } else if (type === 'pickup') {
    query = query.eq('zone_type', 'pickup');
  }
  
  const { data, error } = await query.order('name');
  
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data || []);
}
