import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // First, try to sign in to verify credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
      password: password
    });

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Now ensure the user has admin role in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        role: 'admin',
        access_granted_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error updating profile:', profileError);
      return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    }

    // Set admin cookies
    const response = NextResponse.json({ 
      success: true, 
      message: "Admin access granted",
      user: {
        id: authData.user.id,
        email: email,
        role: 'admin'
      }
    });
    
    response.cookies.set('admin-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });
    
    response.cookies.set('admin-email', email, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Fix admin access error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
