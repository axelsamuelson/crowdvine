import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Offentliga paths (UI oförändrad, bara backend-gate)
  const PUBLIC = [
    "/log-in", "/signup", "/invite-signup", "/code-signup",
    "/access-request", "/i", "/c", "/profile",
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

  // Log cookie information for debugging
  const cookieNames = Array.from(req.cookies.getAll().map(c => c.name));
  console.log("🍪 MIDDLEWARE: Cookie info:", {
    hasAuthCookie: !!req.cookies.get("sb-access-token"),
    hasRefreshCookie: !!req.cookies.get("sb-refresh-token"),
    hasAdminAuthCookie: !!req.cookies.get("admin-auth"),
    hasAdminEmailCookie: !!req.cookies.get("admin-email"),
    adminEmailValue: req.cookies.get("admin-email")?.value,
    cookieNames: cookieNames
  });

  const { data: { user } } = await supabase.auth.getUser();

  console.log("🔍 MIDDLEWARE: Request details:", {
    pathname,
    isPublic,
    hasUser: !!user,
    userEmail: user?.email,
    userAgent: req.headers.get("user-agent")?.substring(0, 50)
  });

  if (!isPublic) {
    // Check for admin authentication first (for admin routes)
    const adminAuthCookie = req.cookies.get("admin-auth")?.value;
    const adminEmailCookie = req.cookies.get("admin-email")?.value;
    const isAdminPath = pathname.startsWith("/admin");
    
    if (isAdminPath && adminAuthCookie === "true" && adminEmailCookie) {
      console.log("✅ MIDDLEWARE: Admin access detected, allowing:", pathname);
      return res;
    }

    // Först kontrollera om användaren är inloggad (normal auth)
    if (!user) {
      console.log("🚫 MIDDLEWARE: No user found, redirecting to access-request");
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
      console.log("🚫 MIDDLEWARE: Profile details:", {
        hasProfile: !!profile,
        accessGrantedAt: profile?.access_granted_at,
        role: profile?.role
      });
      const ask = new URL("/access-request", req.url);
      ask.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(ask);
    }

    console.log("✅ MIDDLEWARE: Access granted, allowing request to:", pathname);

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
