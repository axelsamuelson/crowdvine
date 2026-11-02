import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import {
  B2B_OPEN_SIGNUP_MIN_PASSWORD,
  B2B_OPEN_SIGNUP_SOURCE,
  isDirtywineOpenSignupRequest,
  sanitizeOpenSignupNext,
} from "@/lib/b2b/open-signup";
import { AUTH_NEXT_COOKIE, AUTH_EMAIL_COOKIE } from "@/lib/auth/auth-flow-cookies";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requestOrigin(request: NextRequest): string {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return new URL(request.url).origin;
}

/** Same success shape whether or not the email is new (no account enumeration). */
function checkEmailResponse(
  email: string,
  nextPath: string,
  userId?: string | null,
) {
  const response = NextResponse.json({
    ok: true,
    success: true,
    needsEmailConfirmation: true,
    ...(userId ? { user: { id: userId, email } } : {}),
  });
  response.cookies.set(AUTH_NEXT_COOKIE, nextPath, {
    path: "/",
    maxAge: 3600,
    sameSite: "lax",
  });
  response.cookies.set(AUTH_EMAIL_COOKIE, email, {
    path: "/",
    maxAge: 3600,
    sameSite: "lax",
  });
  return response;
}

/**
 * POST /api/auth/b2b-open-signup
 *
 * Dirtywine.se-only: start open sign-up with normal Supabase email confirmation
 * (no invite, no approval, email NOT pre-confirmed). Client shows "Kolla din mejl".
 * After the user confirms, /auth/callback returns them to `next` (e.g. /b2b/inquiry).
 * pactwines.com invite/membership signup is unchanged.
 *
 * Never overwrites an existing profile's role / roles / portal_access.
 */
export async function POST(request: NextRequest) {
  try {
    if (!isDirtywineOpenSignupRequest(request)) {
      return NextResponse.json(
        {
          error: "open_signup_not_available",
          message: "Open sign-up is only available on dirtywine.se.",
        },
        { status: 403 },
      );
    }

    const clientId = getClientIdentifier(request);
    if (!signupLimiter.isAllowed(clientId)) {
      const resetTime = signupLimiter.getResetTime(clientId);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "rate_limited",
          message: "Too many signup attempts. Please try again later.",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
          },
        },
      );
    }

    const body = (await request.json().catch(() => null)) as {
      email?: unknown;
      password?: unknown;
      full_name?: unknown;
      fullName?: unknown;
      next?: unknown;
    } | null;

    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const fullNameRaw =
      typeof body?.full_name === "string"
        ? body.full_name
        : typeof body?.fullName === "string"
          ? body.fullName
          : "";
    const nextPath =
      sanitizeOpenSignupNext(
        typeof body?.next === "string" ? body.next : null,
      ) || "/";

    const email = normalizeEmail(emailRaw);
    const full_name =
      fullNameRaw.trim() ||
      (email.includes("@")
        ? email.split("@")[0]!.replace(/[._+]/g, " ").trim()
        : "") ||
      "Kund";

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: "A valid email is required.",
        },
        { status: 400 },
      );
    }

    if (!password || password.length < B2B_OPEN_SIGNUP_MIN_PASSWORD) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: `Password must be at least ${B2B_OPEN_SIGNUP_MIN_PASSWORD} characters.`,
        },
        { status: 400 },
      );
    }

    const origin = requestOrigin(request);
    const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    // Normal Supabase sign-up — email confirmation required (do NOT admin-confirm).
    const supabase = createSupabaseServerClient();
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          full_name,
          signup_source: B2B_OPEN_SIGNUP_SOURCE,
        },
      },
    });

    if (signUpError) {
      // Neutral success — do not reveal whether the email is already registered.
      console.warn("[b2b-open-signup] signUp:", signUpError.message);
      return checkEmailResponse(email, nextPath);
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      // Supabase may return empty user for existing emails depending on config.
      return checkEmailResponse(email, nextPath);
    }

    // Insert profile only when none exists. Never overwrite role/roles/portal_access.
    const now = new Date().toISOString();
    const sbAdmin = getSupabaseAdmin();
    const { data: existingProfile, error: existingError } = await sbAdmin
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingError) {
      console.error("[b2b-open-signup] profile lookup:", existingError);
      // Still return neutral check-email — auth user may exist; no DB details.
      return checkEmailResponse(email, nextPath, userId);
    }

    if (!existingProfile) {
      const { error: insertError } = await sbAdmin.from("profiles").insert({
        id: userId,
        email,
        full_name,
        role: "user",
        roles: ["user"],
        portal_access: ["business"],
        updated_at: now,
      });
      if (insertError) {
        // Race / unique conflict: treat as existing; never return DB text.
        console.error("[b2b-open-signup] profile insert:", insertError);
      }
    }

    return checkEmailResponse(email, nextPath, userId);
  } catch (err) {
    console.error("[b2b-open-signup] unexpected:", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message: "Something went wrong. Please try again.",
      },
      { status: 500 },
    );
  }
}
