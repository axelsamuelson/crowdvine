import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/auth/accept-session?code=xxx&next=/profile&search=
 * Called on the TARGET domain. Exchanges one-time code for refresh_token from DB,
 * calls refreshSession to set session cookies for THIS domain, then redirects to next + search.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const nextPath = searchParams.get("next") ?? "/";
    const search = searchParams.get("search") ?? "";

    const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
    const redirectTo = `${path}${search}`;

    if (!code) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    const admin = getSupabaseAdmin();
    const { data: row, error: selectError } = await admin
      .from("cross_domain_codes")
      .select("refresh_token, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (selectError || !row) {
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    const expiresAt = new Date(row.expires_at);
    if (expiresAt.getTime() < Date.now()) {
      await admin.from("cross_domain_codes").delete().eq("code", code);
      return NextResponse.redirect(new URL(redirectTo, request.url));
    }

    const refreshToken = row.refresh_token as string;

    await admin.from("cross_domain_codes").delete().eq("code", code);

    const cookieStore = await cookies();
    const supabase = createServerClient(
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

    const { error: refreshError } = await supabase.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (refreshError) {
      console.error("Accept-session refresh error:", refreshError);
    }

    return NextResponse.redirect(new URL(redirectTo, request.url));
  } catch (error) {
    console.error("Accept-session error:", error);
    const url = new URL(request.url);
    return NextResponse.redirect(new URL("/", url.origin));
  }
}
