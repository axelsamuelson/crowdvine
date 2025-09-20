import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const { email, password, fullName } = await request.json();

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { error: "Email, password, and full name are required" },
        { status: 400 },
      );
    }

    const supabase = await supabaseServer();
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (authError) {
      console.error("Auth signup error:", authError);
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Failed to create user account" },
        { status: 500 },
      );
    }

    // 2. Create user profile in profiles table (or update if exists)
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authData.user.id,
        email: email.toLowerCase().trim(),
        full_name: fullName,
        role: 'user',
        access_granted_at: null // Reset access until granted by admin
      }, {
        onConflict: 'id',
        ignoreDuplicates: false // Update existing records
      });

    if (profileError) {
      console.error("Profile creation/update error:", profileError);
      // Don't fail signup if profile creation fails, but log it
    }

    // 3. Check if user has a pending access request and delete it
    const { error: deleteRequestError } = await supabaseAdmin
      .from('access_requests')
      .delete()
      .eq('email', email.toLowerCase().trim());

    if (deleteRequestError) {
      console.error("Error deleting access request:", deleteRequestError);
      // Don't fail signup if this fails
    }

    return NextResponse.json({
      message: "User registered successfully. Your account is pending admin approval.",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
