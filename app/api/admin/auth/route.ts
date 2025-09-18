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
    // Accept both axelrib@hotmail.com and ave.samuelson@gmail.com as admin
    const adminEmails = ['axelrib@hotmail.com', 'ave.samuelson@gmail.com'];
    const normalizedEmail = email.toLowerCase().trim();
    
    if (!adminEmails.includes(normalizedEmail)) {
      console.error('Email not in admin list:', normalizedEmail);
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Check if user exists in profiles table with admin role
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', normalizedEmail)
      .eq('role', 'admin')
      .single();

    if (error || !profile) {
      console.error('Admin profile not found:', error);
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
