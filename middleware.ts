import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Offentliga paths (UI oförändrad, bara backend-gate)
  const PUBLIC = [
    "/log-in", "/signup", "/invite-signup", "/code-signup",
    "/access-request", "/access-pending", "/i", "/c", "/profile", "/pallet",
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

    // Check membership level for access control
    const { data: membership } = await supabase
      .from("user_memberships")
      .select("level")
      .eq("user_id", user.id)
      .maybeSingle();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    console.log("🔍 MIDDLEWARE: User membership check:", {
      userId: user.id,
      userEmail: user.email,
      pathname,
      membershipLevel: membership?.level,
      profileRole: profile?.role
    });

    // Redirect requesters to access-pending page (unless they're already there)
    if (membership?.level === 'requester' && !pathname.startsWith('/access-pending')) {
      console.log("🚫 MIDDLEWARE: Requester level, redirecting to access-pending");
      const pending = new URL("/access-pending", req.url);
      return NextResponse.redirect(pending);
    }

    // If no membership exists, redirect to access-request
    if (!membership) {
      console.log("🚫 MIDDLEWARE: No membership found, redirecting to access-request");
      const ask = new URL("/access-request", req.url);
      ask.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(ask);
    }

    console.log("✅ MIDDLEWARE: Access granted, allowing request to:", pathname);

    // Check admin-only routes
    if (pathname.startsWith("/admin")) {
      if (membership.level !== 'admin' && profile?.role !== 'admin') {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|images|public).*)"],
};
