import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPlatformAdminProfile } from "@/lib/auth/platform-admin-profile";
import { isStaleRefreshTokenError } from "@/lib/auth/session-errors";
import {
  isOpenPlatformBrowseOrCheckoutPath,
  isPublicAppPath,
} from "@/lib/auth/public-paths";
import { isPlatformOpen } from "@/lib/platform-open";
import { isDirtywineHost } from "@/lib/b2b-site";
import { createClient as createSupabaseMiddlewareClient } from "@/utils/supabase/middleware";
import {
  WINE_CATEGORY_EN_ALIASES,
  WINE_CATEGORY_SV_ALIASES,
  getCategoryUrlForGrape,
} from "@/lib/wine-categories";
import { LOCALE_COOKIE, parseLocaleCookie } from "@/lib/i18n/locale";
import {
  redirectLegacyProducerProfilePath,
  redirectLocalePathMismatch,
} from "@/lib/i18n/locale-path-redirect";
import { localeFromShopPath } from "@/lib/i18n/shop-path-locale";
import { GEO_COUNTRY_COOKIE } from "@/lib/analytics/visitor-identity";

const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** ISO 3166-1 alpha-2 from Vercel; XX = unknown. Session cookie only — no IP. */
function applyGeoCountryCookie(req: NextRequest, res: NextResponse): void {
  const raw = req.headers.get("x-vercel-ip-country");
  if (!raw) return;
  const code = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(code) || code === "XX") return;
  const current = req.cookies.get(GEO_COUNTRY_COOKIE)?.value?.toUpperCase();
  if (current === code) return;
  res.cookies.set(GEO_COUNTRY_COOKIE, code, {
    path: "/",
    sameSite: "lax",
    // Session-scoped (no maxAge) — cleared when the browser session ends.
  });
}

function withGeoCountryCookie(
  req: NextRequest,
  res: NextResponse,
): NextResponse {
  applyGeoCountryCookie(req, res);
  return res;
}

export async function middleware(req: NextRequest) {
  try {
    return await runMiddleware(req);
  } catch (error) {
    console.error("🔴 MIDDLEWARE: Unhandled error:", error);
    return nextWithPathname(req);
  }
}

function nextWithPathname(req: NextRequest): NextResponse {
  const legacyProducerRedirect = redirectLegacyProducerProfilePath(req);
  if (legacyProducerRedirect) return legacyProducerRedirect;

  const localeRedirect = redirectLocalePathMismatch(req);
  if (localeRedirect) return localeRedirect;

  const pathname = req.nextUrl.pathname;
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  requestHeaders.set("x-search", req.nextUrl.search);

  const pathLocale = localeFromShopPath(pathname);
  if (pathLocale) {
    requestHeaders.set("x-pact-locale", pathLocale);
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  if (pathLocale) {
    const currentLocale = parseLocaleCookie(req.cookies.get(LOCALE_COOKIE)?.value);
    if (currentLocale !== pathLocale) {
      res.cookies.set(LOCALE_COOKIE, pathLocale, {
        path: "/",
        maxAge: LOCALE_COOKIE_MAX_AGE,
        sameSite: "lax",
      });
    }
  }

  return withGeoCountryCookie(req, res);
}

async function runMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Supabase auth sometimes lands on Site URL (/) when Redirect URL allow-list
  // rejects emailRedirectTo. Forward PKCE `code` or OTP `token_hash` to callback.
  if (pathname === "/") {
    const authCode = req.nextUrl.searchParams.get("code");
    const tokenHash = req.nextUrl.searchParams.get("token_hash");
    const otpType = req.nextUrl.searchParams.get("type");
    const isUuidCode =
      !!authCode &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        authCode,
      );
    const isOtpHash = !!tokenHash && !!otpType;

    if (isUuidCode || isOtpHash) {
      const u = req.nextUrl.clone();
      u.pathname = "/auth/callback";
      const nextFromQuery = req.nextUrl.searchParams.get("next");
      const nextFromCookie = req.cookies.get("cv_auth_next")?.value;
      if (!u.searchParams.get("next")) {
        const next =
          (nextFromQuery && nextFromQuery.startsWith("/")
            ? nextFromQuery
            : null) ||
          (nextFromCookie && nextFromCookie.startsWith("/")
            ? nextFromCookie
            : null) ||
          "/checkout";
        u.searchParams.set("next", next);
      }
      return NextResponse.redirect(u);
    }
  }

  const host = req.headers.get("host");
  const onDirtywineSite = isDirtywineHost(host, req.nextUrl.searchParams);

  if (onDirtywineSite) {
    if (pathname === "/robots.txt") {
      const u = req.nextUrl.clone();
      u.pathname = "/robots-b2b";
      return NextResponse.rewrite(u);
    }
    if (pathname === "/sitemap.xml") {
      const u = req.nextUrl.clone();
      u.pathname = "/sitemap-b2b";
      return NextResponse.rewrite(u);
    }
  }

  // pactwines.com: sitemap och robots ska alltid vara tillgängliga för crawlers utan auth
  if (pathname === "/sitemap.xml" || pathname === "/robots.txt") {
    return nextWithPathname(req);
  }

  if (pathname === "/wine-search" || pathname.startsWith("/wine-search/")) {
    const u = req.nextUrl.clone();
    u.pathname = "/admin/wine-search";
    return NextResponse.redirect(u);
  }

  const wineAliasRedirect = redirectWineCategoryAlias(req, pathname);
  if (wineAliasRedirect) return wineAliasRedirect;

  // /shop → /vin redirects (301 permanent)
  if (pathname === "/shop") {
    const u = req.nextUrl.clone();
    u.pathname = "/vin";
    return NextResponse.redirect(u, 301);
  }

  if (pathname.startsWith("/shop/")) {
    const u = req.nextUrl.clone();
    u.pathname = pathname.replace("/shop/", "/vin/");
    return NextResponse.redirect(u, 301);
  }

  const legacyGrapeRedirect = redirectLegacyShopGrapeFilter(req, pathname);
  if (legacyGrapeRedirect) return legacyGrapeRedirect;

  const badSearchRedirect = redirectInvalidShopSearchQuery(req, pathname);
  if (badSearchRedirect) return badSearchRedirect;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn("⚠️ MIDDLEWARE: Missing Supabase env vars, skipping auth");
    return nextWithPathname(req);
  }

  const platformOpen = isPlatformOpen();
  const isPublic = isPublicAppPath(pathname, { platformOpen });

  // OAuth discovery (RFC 8414, RFC 9728) and MCP API — bypass Supabase session / membership gate.
  // /.well-known/* includes oauth-authorization-server and oauth-protected-resource/...
  // /api/* includes /api/mcp and /api/mcp/messages.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/icon" ||
    pathname.startsWith("/icon?") ||
    pathname === "/apple-icon" ||
    pathname.startsWith("/apple-icon?") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  )
    return nextWithPathname(req);

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
      try {
        await supabase.auth.signOut();
      } catch {
        /* cookies cleared via signOut cookie handlers when possible */
      }
      return withGeoCountryCookie(req, res);
    }
    console.warn("MIDDLEWARE: auth.getUser failed:", userError.message);
  } else {
    user = userData.user;
  }

  // Public routes: allow through (after optional stale-session cleanup above).
  if (isPublic) {
    return withGeoCountryCookie(req, res);
  }

  const adminAuthCookie = req.cookies.get("admin-auth")?.value;
    const adminEmailCookie = req.cookies.get("admin-email")?.value?.trim();
    const isAdminPath = pathname.startsWith("/admin");

    // dirtywine.se / localhost ?b2b=1: no login required – allow access without auth
    if (onDirtywineSite && !isAdminPath) {
      console.log("✅ MIDDLEWARE: Dirty Wine site – allowing without login:", pathname);
      return withGeoCountryCookie(req, res);
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
        return withGeoCountryCookie(req, res);
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
            return withGeoCountryCookie(req, res);
          }
        } catch (e) {
          console.error("MIDDLEWARE: /admin cookie verify failed:", e);
        }
      }
      console.log("🚫 MIDDLEWARE: /admin — no valid platform admin session");
      return NextResponse.redirect(new URL("/admin-auth/login", req.url));
    }

    // pactwines.com / localhost (default): require login
    // PLATFORM_OPEN: browse + checkout already treated as public above; other
    // gated paths still require auth. Unauthenticated users never reach here
    // for /checkout when PLATFORM_OPEN (isPublic includes it).
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
      platformOpen,
    });

    // PLATFORM_OPEN: skip membership-level gate for browse and checkout paths
    const skipMembershipGate =
      platformOpen && isOpenPlatformBrowseOrCheckoutPath(pathname);

    // Redirect requesters to access-pending page (unless they're already there)
    // Producers/admins should not be blocked by membership gating.
    if (
      !skipMembershipGate &&
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
    if (
      !skipMembershipGate &&
      !membership &&
      profile?.role !== "producer" &&
      !isPlatformAdmin
    ) {
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

  return withGeoCountryCookie(req, res);
}

/** Legacy ?fgrape= query on main shop → grape PLP (301). */
function redirectLegacyShopGrapeFilter(
  req: NextRequest,
  pathname: string,
): NextResponse | null {
  if (pathname !== "/vin" && pathname !== "/wine") return null;

  const fgrape = req.nextUrl.searchParams.get("fgrape");
  if (!fgrape?.trim()) return null;

  const locale = pathname === "/vin" ? "sv" : "en";
  const u = req.nextUrl.clone();
  u.pathname = getCategoryUrlForGrape(fgrape.trim(), locale);
  u.search = "";
  return NextResponse.redirect(u, 301);
}

/** Google sometimes crawls the literal SearchAction placeholder as a URL. */
function redirectInvalidShopSearchQuery(
  req: NextRequest,
  pathname: string,
): NextResponse | null {
  if (pathname !== "/vin" && pathname !== "/wine") return null;

  const q = req.nextUrl.searchParams.get("q");
  if (!q?.includes("{search_term_string}")) return null;

  const u = req.nextUrl.clone();
  u.search = "";
  return NextResponse.redirect(u, 301);
}

function redirectWineCategoryAlias(
  req: NextRequest,
  pathname: string,
): NextResponse | null {
  if (pathname.startsWith("/wine/")) {
    const slug = pathname.slice("/wine/".length).split("/")[0] ?? "";
    const target = WINE_CATEGORY_EN_ALIASES[slug];
    if (target) {
      const u = req.nextUrl.clone();
      u.pathname = `/wine/${target}`;
      return NextResponse.redirect(u, 308);
    }
  }

  if (pathname.startsWith("/vin/")) {
    const slug = pathname.slice("/vin/".length).split("/")[0] ?? "";
    const target = WINE_CATEGORY_SV_ALIASES[slug];
    if (target) {
      const u = req.nextUrl.clone();
      u.pathname = `/vin/${target}`;
      return NextResponse.redirect(u, 308);
    }
  }

  return null;
}

export const config = {
  matcher: [
    "/((?!api/stripe/webhook|_next/static|_next/image|favicon.ico|images|public).*)",
  ],
};
