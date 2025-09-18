import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if user exists in profiles table with admin role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', email.toLowerCase().trim())
      .eq('role', 'admin')
      .single();

    if (error || !profile) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // For now, we'll use a simple password check
    // In production, you should hash passwords properly
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (password !== adminPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Set admin cookie
    const response = NextResponse.json({ success: true, user: profile });
    response.cookies.set('admin-auth', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete('admin-auth');
  return response;
}
