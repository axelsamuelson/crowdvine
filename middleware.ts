import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPlatformAdminProfile } from "@/lib/auth/platform-admin-profile";

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
    "/p",
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

  // OAuth discovery (RFC 8414, RFC 9728) and MCP API — bypass Supabase session / membership gate.
  // /.well-known/* includes oauth-authorization-server and oauth-protected-resource/...
  // /api/* includes /api/mcp and /api/mcp/messages.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/.well-known/") ||
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

  const host = req.nextUrl.hostname.toLowerCase();
  const onB2BProduction = host.includes("dirtywine.se");
  const onLocalhost = host === "localhost" || host === "127.0.0.1";
  const forceB2B = req.nextUrl.searchParams.get("b2b") === "1";
  const isB2BDomain = onB2BProduction || (onLocalhost && forceB2B);

  if (!isPublic) {
    const adminAuthCookie = req.cookies.get("admin-auth")?.value;
    const adminEmailCookie = req.cookies.get("admin-email")?.value?.trim();
    const isAdminPath = pathname.startsWith("/admin");

    // dirtywine.se: no login required – allow access without auth (admin handled below)
    if (onB2BProduction && !isAdminPath) {
      console.log("✅ MIDDLEWARE: dirtywine.se – allowing without login:", pathname);
      return res;
    }

    // /admin: must match profiles (role / roles). Do not trust admin-auth cookies alone — they outlive demotions.
    if (isAdminPath) {
      if (user) {
        const { data: adminProfile } = await supabase
          .from("profiles")
          .select("role, roles")
          .eq("id", user.id)
          .maybeSingle();
        if (!isPlatformAdminProfile(adminProfile)) {
          console.log(
            "🚫 MIDDLEWARE: /admin denied — session user is not platform admin",
          );
          return NextResponse.redirect(new URL("/", req.url));
        }
        return res;
      }
      // Legacy: /api/admin/auth sets cookies only; browser may not have Supabase session yet
      if (adminAuthCookie === "true" && adminEmailCookie) {
        try {
          const sbAdmin = getSupabaseAdmin();
          const { data: p } = await sbAdmin
            .from("profiles")
            .select("role, roles")
            .eq("email", adminEmailCookie)
            .maybeSingle();
          if (isPlatformAdminProfile(p)) {
            return res;
          }
        } catch (e) {
          console.error("MIDDLEWARE: /admin cookie verify failed:", e);
        }
      }
      console.log("🚫 MIDDLEWARE: /admin — no valid platform admin session");
      return NextResponse.redirect(new URL("/admin-auth/login", req.url));
    }

    // pactwines.com (and localhost without ?b2b=1): require login
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
      .select("role, roles, portal_access")
      .eq("id", user.id)
      .maybeSingle();

    const isPlatformAdmin = isPlatformAdminProfile(profile);

    console.log("🔍 MIDDLEWARE: User membership check:", {
      userId: user.id,
      userEmail: user.email,
      pathname,
      membershipLevel: membership?.level,
      profileRole: profile?.role,
    });

    // localhost with ?b2b=1: require business access (dirtywine.se allows all without login)
    if (onLocalhost && forceB2B) {
      const isAdmin = isPlatformAdmin;
      const portalAccess =
        profile?.portal_access && Array.isArray(profile.portal_access)
          ? profile.portal_access
          : ["user"];
      const canAccessB2B = portalAccess.includes("business");
      if (!canAccessB2B && !isAdmin) {
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
      !isPlatformAdmin &&
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
    if (!membership && profile?.role !== "producer" && !isPlatformAdmin) {
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
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|images|public).*)",
  ],
};
