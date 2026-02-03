import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { randomUUID } from "crypto";

const ALLOWED_TARGETS = ["https://pactwines.com", "https://dirtywine.se"] as const;
const CODE_TTL_SECONDS = 60;

/**
 * GET /api/auth/cross-domain?path=/profile&search=&target=dirtywine.se
 * Called on the SOURCE domain (where the user is logged in). Creates a one-time code,
 * stores refresh_token in DB, redirects browser to TARGET domain's accept-session with the code.
 * User lands on target domain and accept-session exchanges code for session (cookies set for target).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get("path") ?? "/";
    const search = searchParams.get("search") ?? "";
    const target = searchParams.get("target");

    if (!target || !ALLOWED_TARGETS.includes(target as (typeof ALLOWED_TARGETS)[number])) {
      return NextResponse.json({ error: "Invalid target" }, { status: 400 });
    }

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

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.refresh_token) {
      const dest = `${target}${path.startsWith("/") ? path : `/${path}`}${search}`;
      return NextResponse.redirect(dest);
    }

    const code = randomUUID();
    const expiresAt = new Date(Date.now() + CODE_TTL_SECONDS * 1000).toISOString();

    const admin = getSupabaseAdmin();
    await admin.from("cross_domain_codes").delete().lt("expires_at", new Date().toISOString());
    const { error: insertError } = await admin.from("cross_domain_codes").insert({
      code,
      refresh_token: session.refresh_token,
      expires_at: expiresAt,
    });

    if (insertError) {
      console.error("Cross-domain code insert error:", insertError);
      const dest = `${target}${path.startsWith("/") ? path : `/${path}`}${search}`;
      return NextResponse.redirect(dest);
    }

    const acceptUrl = new URL("/api/auth/accept-session", target);
    acceptUrl.searchParams.set("code", code);
    acceptUrl.searchParams.set("next", path.startsWith("/") ? path : `/${path}`);
    if (search) acceptUrl.searchParams.set("search", search);

    return NextResponse.redirect(acceptUrl.toString());
  } catch (error) {
    console.error("Cross-domain auth error:", error);
    return NextResponse.redirect("https://pactwines.com/");
  }
}
