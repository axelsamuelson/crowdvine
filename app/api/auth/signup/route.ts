import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase-server";

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

    // 2. Optionally create user profile in custom table
    // This would go in a custom users table if we had one
    // const { error: profileError } = await supabase
    //   .from('users')
    //   .insert({
    //     id: authData.user.id,
    //     full_name: fullName,
    //     email: email
    //   });

    return NextResponse.json({
      message: "User registered successfully",
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
