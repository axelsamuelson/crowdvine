import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Offentliga paths (UI oförändrad, bara backend-gate)
  const PUBLIC = [
    "/log-in", "/signup", "/invite-signup", "/code-signup",
    "/access-request", "/i", "/c",
  ];
  const isPublic = PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  // Skip statik / webhooks / API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
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
    // Först kontrollera om användaren är inloggad
    if (!user) {
      const ask = new URL("/access-request", req.url);
      ask.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(ask);
    }

    // Sedan kontrollera om användaren har access
    const { data: profile } = await supabase
      .from("profiles")
      .select("access_granted_at, role")
      .eq("id", user.id)
      .maybeSingle();

    console.log("🔍 MIDDLEWARE: User profile check:", {
      userId: user.id,
      userEmail: user.email,
      pathname,
      hasProfile: !!profile,
      accessGrantedAt: profile?.access_granted_at,
      role: profile?.role
    });

    if (!profile?.access_granted_at) {
      console.log("🚫 MIDDLEWARE: Access denied, redirecting to access-request");
      const ask = new URL("/access-request", req.url);
      ask.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(ask);
    }

    // Slutligen kontrollera admin-behörighet
    if (pathname.startsWith("/admin") && profile.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|images|public).*)"],
};
