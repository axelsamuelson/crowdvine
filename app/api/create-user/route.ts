import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, userId } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Create user directly via admin API (bypasses email verification)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true // Skip email verification
    });

    if (authError) {
      console.error('Error creating user:', authError);
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }

    // Create profile for the user
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        role: 'user',
        access_granted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
    }

    // User and profile created successfully
    const response = NextResponse.json({ 
      success: true, 
      message: "User and profile created successfully",
      user: {
        id: authData.user.id,
        email: authData.user.email
      }
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
    console.error('Create user API error:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
