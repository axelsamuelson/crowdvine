import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPlatformAdminProfile } from "@/lib/auth/platform-admin-profile";
import { isStaleRefreshTokenError } from "@/lib/auth/session-errors";
import { isPublicAppPath } from "@/lib/auth/public-paths";
import { isDirtywineHost } from "@/lib/b2b-site";
import { createClient as createSupabaseMiddlewareClient } from "@/utils/supabase/middleware";

export async function middleware(req: NextRequest) {
  try {
    return await runMiddleware(req);
  } catch (error) {
    console.error("🔴 MIDDLEWARE: Unhandled error:", error);
    return nextWithPathname(req);
  }
}

function nextWithPathname(req: NextRequest): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", req.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

async function runMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (pathname === "/wine-search" || pathname.startsWith("/wine-search/")) {
    const u = req.nextUrl.clone();
    u.pathname = "/admin/wine-search";
    return NextResponse.redirect(u);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ MIDDLEWARE: Missing Supabase env vars, skipping auth");
    return nextWithPathname(req);
  }

  const isPublic = isPublicAppPath(pathname);

  // OAuth discovery (RFC 8414, RFC 9728) and MCP API — bypass Supabase session / membership gate.
  // /.well-known/* includes oauth-authorization-server and oauth-protected-resource/...
  // /api/* includes /api/mcp and /api/mcp/messages.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/.well-known/") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  )
    return nextWithPathname(req);

  if (isPublic) {
    return nextWithPathname(req);
  }

  const { supabase, response: res } = createSupabaseMiddlewareClient(
    req,
    pathname,
  );

  let user: Awaited<
    ReturnType<typeof supabase.auth.getUser>
  >["data"]["user"] = null;
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) {
    if (isStaleRefreshTokenError(userError)) {
      await supabase.auth.signOut();
      return res;
    }
    console.warn("MIDDLEWARE: auth.getUser failed:", userError.message);
  } else {
    user = userData.user;
  }

  const host = req.nextUrl.hostname.toLowerCase();
  const onDirtywineSite = isDirtywineHost(host, req.nextUrl.searchParams);

  const adminAuthCookie = req.cookies.get("admin-auth")?.value;
    const adminEmailCookie = req.cookies.get("admin-email")?.value?.trim();
    const isAdminPath = pathname.startsWith("/admin");

    // dirtywine.se / localhost ?b2b=1: no login required – allow access without auth
    if (onDirtywineSite && !isAdminPath) {
      console.log("✅ MIDDLEWARE: Dirty Wine site – allowing without login:", pathname);
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

    // pactwines.com / localhost (default): require login
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

  return res;
}

export const config = {
  matcher: [
    "/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|images|public).*)",
  ],
};
