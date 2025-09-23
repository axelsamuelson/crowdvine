import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Offentliga paths (UI oförändrad, bara backend-gate)
  const PUBLIC = [
    "/", "/log-in", "/signup", "/invite-signup", "/code-signup",
    "/access-request", "/i", "/c",
  ];
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Skip statik / webhooks
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/stripe/webhook") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) => res.cookies.set({ name, value: "", ...options, maxAge: 0 }),
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!isPublic) {
    if (!user) {
      const login = new URL("/log-in", req.url);
      login.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(login);
    }

    // Gate via DB (profiles.access_granted_at), inte via cv-access-cookie
    const { data: profile } = await supabase
      .from("profiles")
      .select("access_granted_at, role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.access_granted_at) {
      const ask = new URL("/access-request", req.url);
      ask.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(ask);
    }

    if (pathname.startsWith("/admin") && profile.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|images|public).*)"],
};
