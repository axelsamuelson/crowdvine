import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const sb = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Get wines with their producers
    const { data: wines, error: winesError } = await sb
      .from('wines')
      .select('*')
      .limit(5);

    return NextResponse.json({
      wines: { data: wines, error: winesError }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch wines' }, { status: 500 });
  }
}
