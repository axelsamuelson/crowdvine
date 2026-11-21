import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import {
  createEphemeralAuthClient,
  getSupabaseAdmin,
} from "@/lib/supabase-admin";
import { isPlatformOpen } from "@/lib/platform-open";
import {
  finalizeSignupAfterAuth,
  signupCookiesFromRequest,
} from "@/lib/auth/finalize-signup";
import { signupLimiter, getClientIdentifier } from "@/lib/rate-limiter";
import { existingCheckoutEmailTaken } from "@/lib/checkout/ensure-session-existing-user";

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requiresLoginResponse() {
  // 409 is an intentional signal for the checkout client to show OTP login.
  // Generic body — avoid leaking whether the address is registered beyond the status.
  return NextResponse.json(
    {
      requiresLogin: true,
      error: "Logga in för att fortsätta till kassan.",
    },
    { status: 409 },
  );
}

/**
 * POST /api/checkout/ensure-session
 *
 * Open-platform guest checkout: establish a browser session from the delivery
 * email without a login wall — only for brand-new emails. Existing accounts
 * (any role) must use OTP login; we never mint tokens or rewrite profiles for them.
 */
export async function POST(request: NextRequest) {
  if (!isPlatformOpen()) {
    return NextResponse.json(
      {
        error:
          "Gästkassa är bara tillgänglig när plattformen är öppen.",
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
        error: "För många försök. Försök igen senare.",
        retryAfter,
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  const existing = await getCurrentUser();
  if (existing?.id) {
    return NextResponse.json({
      ok: true,
      alreadyAuthenticated: true,
      userId: existing.id,
    });
  }

  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
  } | null;
  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const email = normalizeEmail(emailRaw);

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "En giltig e-postadress krävs." },
      { status: 400 },
    );
  }

  // Privileged DB + admin.generateLink only. Never call verifyOtp on this client:
  // verifyOtp replaces Authorization with the user JWT and subsequent profiles
  // writes run as authenticated (prod: 42501 permission denied for table profiles).
  const sb = getSupabaseAdmin();

  try {
    // CRITICAL: never generateLink / verifyOtp for an existing account.
    if (await existingCheckoutEmailTaken(sb, email)) {
      return requiresLoginResponse();
    }

    const { data: linkData, error: linkError } =
      await sb.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkError || !linkData?.user?.id) {
      console.error("[checkout/ensure-session] generateLink:", linkError);
      return NextResponse.json(
        { error: "Kunde inte förbereda kassakontot. Försök igen." },
        { status: 500 },
      );
    }

    const userId = linkData.user.id;
    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[checkout/ensure-session] generateLink missing hashed_token");
      return NextResponse.json(
        { error: "Kunde inte förbereda kassasessionen. Försök igen." },
        { status: 500 },
      );
    }

    const wasSignup =
      linkData.properties?.verification_type === "signup" ||
      String(linkData.properties?.verification_type ?? "").includes("signup");

    // Defense in depth: if GoTrue treated this as an existing-user magiclink,
    // discard the token and require OTP — never verifyOtp / return session.
    if (!wasSignup) {
      console.warn(
        "[checkout/ensure-session] generateLink was not signup; refusing session",
      );
      return requiresLoginResponse();
    }

    // Create the profile with the still-privileged admin client BEFORE verifyOtp.
    const now = new Date().toISOString();
    const { data: existingProfile, error: existingProfileError } = await sb
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (existingProfileError) {
      console.error(
        "[checkout/ensure-session] profile exists check:",
        existingProfileError,
      );
      return NextResponse.json(
        { error: "Kunde inte förbereda profilen. Försök igen." },
        { status: 500 },
      );
    }

    if (!existingProfile) {
      const { error: profileError } = await sb.from("profiles").insert({
        id: userId,
        email,
        role: "user",
        access_granted_at: now,
        updated_at: now,
      });
      if (profileError) {
        console.error("[checkout/ensure-session] profile insert:", profileError);
        return NextResponse.json(
          { error: "Kunde inte förbereda profilen. Försök igen." },
          { status: 500 },
        );
      }
    }

    // Exchange token on a separate ephemeral client so the admin instance
    // never holds a user session.
    const authClient = createEphemeralAuthClient();
    const { data: verified, error: verifyError } = await authClient.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (verifyError || !verified.session) {
      console.error("[checkout/ensure-session] verifyOtp:", verifyError);
      return NextResponse.json(
        { error: "Kunde inte starta kassasessionen. Försök igen." },
        { status: 500 },
      );
    }

    const cookies = signupCookiesFromRequest(request);
    await finalizeSignupAfterAuth({
      userId,
      email,
      visitorId: cookies.visitorId,
      firstTouchCookie: cookies.firstTouchCookie,
      countryCode: cookies.countryCode,
      cartSessionId: cookies.cartSessionId,
      source: "checkout_guest",
      emitSignupCompleted: wasSignup,
    });

    return NextResponse.json({
      ok: true,
      autoSignedIn: true,
      userId,
      session: {
        access_token: verified.session.access_token,
        refresh_token: verified.session.refresh_token,
      },
    });
  } catch (err) {
    console.error("[checkout/ensure-session] unexpected:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Ett internt fel uppstod. Försök igen.",
      },
      { status: 500 },
    );
  }
}
