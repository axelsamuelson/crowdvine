import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { ensureAccessCookie } from '@/lib/access';

export async function POST(req: Request) {
  try {
    const { email, password, code } = await req.json();
    
    if (!email || !password || !code) {
      return NextResponse.json({ error: 'Email, password, and code are required' }, { status: 400 });
    }

    const sb = await supabaseServer();

    // 1) Validate invitation code (server-side)
    const { data: valid, error: e1 } = await sb.rpc('validate_invitation_code', { code_input: code });
    if (e1 || !valid) {
      return NextResponse.json({ error: 'invalid_or_expired_code' }, { status: 400 });
    }

    // 2) Sign up user
    const { data: sign, error: e2 } = await sb.auth.signUp({ 
      email, 
      password,
      options: {
        data: {
          full_name: email.split('@')[0] // Use email prefix as default name
        }
      }
    });
    
    if (e2 || !sign?.user) {
      return NextResponse.json({ error: e2?.message ?? 'signup_failed' }, { status: 400 });
    }

    // 3) Grant access in profile
    const { error: e3 } = await sb.from('profiles').upsert({
      id: sign.user.id,
      email: email,
      access_granted_at: new Date().toISOString(),
      invite_code_used: code
    });
    
    if (e3) {
      return NextResponse.json({ error: e3.message }, { status: 400 });
    }

    // 4) Consume the code (atomic)
    const { error: e4 } = await sb.rpc('use_invitation_code', { 
      code_input: code, 
      user_email: email 
    });
    
    if (e4) {
      return NextResponse.json({ error: e4.message }, { status: 400 });
    }

    // 5) UX fast-path - set access cookie
    ensureAccessCookie();

    return NextResponse.json({ 
      ok: true, 
      userId: sign.user.id,
      message: 'Account created and access granted successfully'
    });

  } catch (error) {
    console.error('Redeem invitation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
