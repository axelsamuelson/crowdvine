import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPlatformAdminProfile } from "@/lib/auth/platform-admin-profile";

function createAuthCookieClient(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (name: string, value: string, options: any) => {
          cookieStore.set(name, value, options);
        },
        remove: (name: string, options: any) => {
          cookieStore.set(name, "", { ...options, maxAge: 0 });
        },
      },
    },
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    const supabase = createAuthCookieClient(cookieStore);

    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password: password,
      });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const adminSb = getSupabaseAdmin();
    const { data: profile, error: profileError } = await adminSb
      .from("profiles")
      .select("id, email, role, roles")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profileError || !profile || !isPlatformAdminProfile(profile)) {
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error(
          "Admin auth signOut after non-admin login failed:",
          signOutError,
        );
      }
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, user: profile });
  } catch (error) {
    console.error("Admin auth error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    const supabase = createAuthCookieClient(cookieStore);
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Admin auth DELETE signOut failed:", error);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete("admin-auth");
  response.cookies.delete("admin-email");
  return response;
}
