import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    console.log('=== ADMIN AUTH DEBUG START ===');
    
    const { email, password } = await request.json();
    console.log('DEBUG: Received email:', email);
    console.log('DEBUG: Password provided:', password ? 'YES' : 'NO');

    if (!email || !password) {
      console.log('DEBUG: Missing email or password');
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    console.log('DEBUG: Supabase admin client created');

    // Use Supabase Auth to sign in the admin user
    console.log('DEBUG: Attempting Supabase Auth signInWithPassword...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password
    });

    console.log('DEBUG: Auth result - error:', authError);
    console.log('DEBUG: Auth result - user exists:', !!authData?.user);
    console.log('DEBUG: Auth result - user ID:', authData?.user?.id);

    if (authError || !authData.user) {
      console.log('DEBUG: Auth failed - returning Invalid credentials');
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if user has admin role in profiles table
    console.log('DEBUG: Checking profiles table for admin role...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('id', authData.user.id)
      .eq('role', 'admin')
      .single();

    console.log('DEBUG: Profile query result - error:', profileError);
    console.log('DEBUG: Profile query result - profile:', profile);

    if (profileError || !profile) {
      console.log('DEBUG: Profile check failed - returning Admin access required');
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    console.log('DEBUG: Admin access granted successfully');
    
    // Set admin cookie with email for easier retrieval
    const response = NextResponse.json({ success: true, user: profile });
    response.cookies.set('admin-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    // Also set admin email in a separate cookie for easy access
    response.cookies.set('admin-email', profile.email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    console.log('DEBUG: Cookies set successfully');
    console.log('=== ADMIN AUTH DEBUG END ===');
    return response;

  } catch (error) {
    console.error('DEBUG: Unexpected error in admin auth:', error);
    console.error('DEBUG: Error stack:', error.stack);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
