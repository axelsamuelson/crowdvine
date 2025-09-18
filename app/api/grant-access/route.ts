import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Find user by email
    const { data: authUser, error: userError } = await supabase.auth.admin.getUserByEmail(email);
    
    if (userError || !authUser.user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Grant access by updating profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        email: email.toLowerCase().trim(),
        access_granted_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error granting access:', profileError);
      return NextResponse.json({ error: "Failed to grant access" }, { status: 500 });
    }

    // Access granted successfully
    const response = NextResponse.json({ 
      success: true, 
      message: "Access granted successfully" 
    });

    // Set access cookie so user can access the app
    response.cookies.set('cv-access', '1', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365 // 1 year
    });

    return response;

  } catch (error) {
    console.error('Grant access API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}