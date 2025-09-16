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

    // Check if user has access and set cookie if they do
    const sb = await supabaseServer();
    const { data: prof } = await sb
      .from("profiles")
      .select("access_granted_at")
      .eq("id", authData.user.id)
      .single();

    if (prof?.access_granted_at) {
      await setAccessCookieAction();
    }

    return NextResponse.json({
      message: "Login successful",
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: authData.user.user_metadata?.full_name,
      },
      hasAccess: !!prof?.access_granted_at,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
