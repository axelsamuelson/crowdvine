import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import { isDirtywineOpenSignupRequest } from "@/lib/b2b/open-signup";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import {
  finalizeSignupAfterAuth,
  signupCookiesFromRequest,
} from "@/lib/auth/finalize-signup";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * POST /api/auth/b2b-open-signup
 *
 * Dirtywine.se-only: create a business-portal account with no invite code
 * and no approval step. Session is returned for immediate use.
 * pactwines.com invite/membership signup is unchanged.
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
    } | null;

    const emailRaw = typeof body?.email === "string" ? body.email : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const fullNameRaw =
      typeof body?.full_name === "string"
        ? body.full_name
        : typeof body?.fullName === "string"
          ? body.fullName
          : "";

    const email = normalizeEmail(emailRaw);
    const full_name =
      fullNameRaw.trim() ||
      (email.includes("@")
        ? email.split("@")[0]!.replace(/[._+]/g, " ").trim()
        : "") ||
      "Kund";

    if (!isValidEmail(email) || !password || password.length < 6) {
      return NextResponse.json(
        {
          error: "invalid_input",
          message: "A valid email and password (min 6 characters) are required.",
        },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();

    const { data: createUserData, error: createUserError } =
      await sb.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name,
          signup_source: "dirtywine_open",
        },
      });

    if (createUserError) {
      if (
        createUserError.message?.toLowerCase().includes("already") ||
        createUserError.code === "23505"
      ) {
        return NextResponse.json(
          {
            error: "email_exists",
            message:
              "An account with this email already exists. Please sign in instead.",
          },
          { status: 400 },
        );
      }
      console.error("[b2b-open-signup] createUser:", createUserError);
      return NextResponse.json(
        {
          error: "create_failed",
          message: "Failed to create account",
          details: createUserError.message,
        },
        { status: 500 },
      );
    }

    const userId = createUserData.user?.id;
    if (!userId) {
      return NextResponse.json(
        { error: "create_failed", message: "No user returned" },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();
    const { error: profileError } = await sb.from("profiles").upsert(
      {
        id: userId,
        email,
        full_name,
        role: "user",
        roles: ["user"],
        portal_access: ["business"],
        access_granted_at: now,
        updated_at: now,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      console.error("[b2b-open-signup] profile upsert:", profileError);
      return NextResponse.json(
        {
          error: "profile_failed",
          message: "Failed to create profile",
          details: profileError.message,
        },
        { status: 500 },
      );
    }

    // Do not clear the cart — Dirty Wine users often return to /b2b/inquiry
    // with cart lines still present for the inquiry form.

    const cookies = signupCookiesFromRequest(request);
    await finalizeSignupAfterAuth({
      userId,
      email,
      visitorId: cookies.visitorId,
      firstTouchCookie: cookies.firstTouchCookie,
      countryCode: cookies.countryCode,
      cartSessionId: cookies.cartSessionId,
      source: "magic_link",
      emitSignupCompleted: true,
    });

    void logUserEventServer({
      userId,
      eventType: "auth_email_step_completed",
      eventCategory: "auth",
      metadata: {
        user_id: userId,
        source: "dirtywine_open_signup",
      },
    });

    const { data: signInData, error: signInError } =
      await sb.auth.signInWithPassword({ email, password });

    if (signInError || !signInData.session) {
      console.error("[b2b-open-signup] auto sign-in:", signInError);
      return NextResponse.json({
        ok: true,
        success: true,
        autoSignedIn: false,
        message: "Account created successfully. Please sign in.",
        user: { id: userId, email },
      });
    }

    return NextResponse.json({
      ok: true,
      success: true,
      autoSignedIn: true,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
      user: { id: userId, email },
    });
  } catch (err) {
    console.error("[b2b-open-signup] unexpected:", err);
    return NextResponse.json(
      {
        error: "internal_error",
        message:
          err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
