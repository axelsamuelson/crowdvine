import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { ensureAccessCookie } from '@/lib/access';

export async function GET() {
  try {
    const sb = await supabaseServer();
    const { data: { user } } = await sb.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ access: false });
    }

    const { data: prof } = await sb
      .from('profiles')
      .select('access_granted_at')
      .eq('id', user.id)
      .single();
      
    const has = !!prof?.access_granted_at;
    
    if (has) {
      ensureAccessCookie();
    }
    
    return NextResponse.json({ access: has });
  } catch (error) {
    console.error('Error checking access:', error);
    return NextResponse.json({ access: false });
  }
}
