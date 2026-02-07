import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  try {
    return await runMiddleware(req);
  } catch (error) {
    console.error("🔴 MIDDLEWARE: Unhandled error:", error);
    return NextResponse.next();
  }
}

async function runMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ MIDDLEWARE: Missing Supabase env vars, skipping auth");
    return NextResponse.next();
  }

  // Offentliga paths (UI oförändrad, bara backend-gate)
  const PUBLIC = [
    "/log-in",
    "/signup",
    "/invite-signup",
    "/code-signup",
    "/access-request",
    "/access-pending",
    "/i",
    "/ib",
    "/b",
    "/c",
    "/profile",
    "/pallet",
    "/reset-password",
    "/auth/callback",
    "/auth/auth-code-error",
    "/forgot-password",
    "/tasting", // Allow tasting pages for guests
  ];
  const isPublic = PUBLIC.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  // Skip statik / webhooks / API routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  )
    return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) =>
          res.cookies.set({ name, value, ...options }),
        remove: (name, options) =>
          res.cookies.set({ name, value: "", ...options, maxAge: 0 }),
      },
    },
  );

  // Log cookie information for debugging
  const cookieNames = Array.from(req.cookies.getAll().map((c) => c.name));
  console.log("🍪 MIDDLEWARE: Cookie info:", {
    hasAuthCookie: !!req.cookies.get("sb-access-token"),
    hasRefreshCookie: !!req.cookies.get("sb-refresh-token"),
    hasAdminAuthCookie: !!req.cookies.get("admin-auth"),
    hasAdminEmailCookie: !!req.cookies.get("admin-email"),
    adminEmailValue: req.cookies.get("admin-email")?.value,
    cookieNames: cookieNames,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("🔍 MIDDLEWARE: Request details:", {
    pathname,
    isPublic,
    hasUser: !!user,
    userEmail: user?.email,
    userAgent: req.headers.get("user-agent")?.substring(0, 50),
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
      console.log(
        "🚫 MIDDLEWARE: No user found, redirecting to access-request",
      );
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
      .select("role, portal_access")
      .eq("id", user.id)
      .maybeSingle();

    console.log("🔍 MIDDLEWARE: User membership check:", {
      userId: user.id,
      userEmail: user.email,
      pathname,
      membershipLevel: membership?.level,
      profileRole: profile?.role,
    });

    // dirtywine.se: redirect users without business access to pactwines.com (admin bypasses)
    const host = req.nextUrl.hostname.toLowerCase();
    const onB2BProduction = host.includes("dirtywine.se");
    const onLocalhost = host === "localhost" || host === "127.0.0.1";
    const forceB2B = req.nextUrl.searchParams.get("b2b") === "1";
    const isB2BDomain = onB2BProduction || (onLocalhost && forceB2B);

    if (isB2BDomain) {
      const isAdmin = profile?.role === "admin";
      const portalAccess =
        profile?.portal_access && Array.isArray(profile.portal_access)
          ? profile.portal_access
          : ["user"];
      const canAccessB2B = portalAccess.includes("business");

      if (!canAccessB2B && !isAdmin) {
        console.log(
          "🚫 MIDDLEWARE: No business access on dirtywine.se, redirecting to access-request",
        );
        if (onB2BProduction) {
          const accessRequest = new URL("/access-request", req.url);
          accessRequest.searchParams.set("reason", "no_b2b");
          accessRequest.searchParams.set("redirectedFrom", pathname);
          return NextResponse.redirect(accessRequest);
        }
        // localhost: remove b2b param to show B2C
        const url = new URL(req.url);
        url.searchParams.delete("b2b");
        return NextResponse.redirect(url);
      }
    }

    // Redirect requesters to access-pending page (unless they're already there)
    // Producers/admins should not be blocked by membership gating.
    if (
      membership?.level === "requester" &&
      profile?.role !== "producer" &&
      profile?.role !== "admin" &&
      !pathname.startsWith("/access-pending")
    ) {
      console.log(
        "🚫 MIDDLEWARE: Requester level, redirecting to access-pending",
      );
      const pending = new URL("/access-pending", req.url);
      return NextResponse.redirect(pending);
    }

    // If no membership exists, redirect to access-request
    // Producers/admins should not be blocked by membership gating.
    if (!membership && profile?.role !== "producer" && profile?.role !== "admin") {
      console.log(
        "🚫 MIDDLEWARE: No membership found, redirecting to access-request",
      );
      const ask = new URL("/access-request", req.url);
      ask.searchParams.set("redirectedFrom", pathname);
      return NextResponse.redirect(ask);
    }

    console.log(
      "✅ MIDDLEWARE: Access granted, allowing request to:",
      pathname,
    );

    // Check admin-only routes
    if (pathname.startsWith("/admin")) {
      if (membership?.level !== "admin" && profile?.role !== "admin") {
        return NextResponse.redirect(new URL("/", req.url));
      }
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|images|public).*)",
  ],
};
