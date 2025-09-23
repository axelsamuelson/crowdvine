import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { setAccessCookieAction } from "@/lib/access";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();

    // Sign in user with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (authError) {
      console.error("Auth login error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 },
      );
    }

    // Check if user has access and set cookies if they do
    const { getSupabaseAdmin } = await import('@/lib/supabase-admin');
    const sb = getSupabaseAdmin();
    const { data: prof } = await sb
      .from('profiles')
      .select('access_granted_at')
      .eq('id', authData.user.id)
      .single();
      
    const hasAccess = !!prof?.access_granted_at;

    // Create response
    const response = NextResponse.json({
      message: "Login successful",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name,
      },
      hasAccess: hasAccess,
    });

    // Set access cookie if user has access
    if (hasAccess) {
      response.cookies.set('cv-access', '1', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/'
      });
      
      console.log('Set cv-access cookie for user:', authData.user.id);
    } else {
      console.log('User has no access, not setting cv-access cookie:', authData.user.id);
    }

    // Set Supabase auth session cookies
    if (authData.session) {
      response.cookies.set('sb-access-auth-token', authData.session.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: authData.session.expires_in || 60 * 60 * 24 * 7, // 7 days default
        path: '/'
      });
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
