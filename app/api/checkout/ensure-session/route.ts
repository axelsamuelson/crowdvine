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
import {
  CHECKOUT_GUEST_PROOF_COOKIE,
  guestProofCookieOptions,
  mintGuestSessionProofToken,
  readGuestSessionProofFromRequest,
} from "@/lib/checkout/guest-session-proof";

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

function withGuestProofCookie(
  response: NextResponse,
  email: string,
  userId: string,
): NextResponse {
  try {
    const token = mintGuestSessionProofToken(email, userId);
    response.cookies.set(
      CHECKOUT_GUEST_PROOF_COOKIE,
      token,
      guestProofCookieOptions(),
    );
  } catch (err) {
    console.error("[checkout/ensure-session] mint guest proof:", err);
  }
  return response;
}

type SessionBody = {
  ok: true;
  autoSignedIn: true;
  userId: string;
  reminted?: boolean;
  session: { access_token: string; refresh_token: string };
};

function sessionSuccessResponse(
  body: SessionBody,
  email: string,
  userId: string,
): NextResponse {
  return withGuestProofCookie(NextResponse.json(body), email, userId);
}

/**
 * POST /api/checkout/ensure-session
 *
 * Open-platform guest checkout: establish a browser session from the delivery
 * email without a login wall — only for brand-new emails. Existing accounts
 * (any role) must use OTP login; we never mint tokens or rewrite profiles for them.
 *
 * Exception (Camille 22/11): if this browser already completed ensure-session
 * for the same email (httpOnly HMAC proof cookie), remint the session after
 * reload without OTP — without opening email-only takeover (#246).
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
    const emailTaken = await existingCheckoutEmailTaken(sb, email);
    const guestProof = emailTaken
      ? readGuestSessionProofFromRequest(request, email)
      : null;

    // Existing email without same-browser proof → OTP wall (#246).
    if (emailTaken && !guestProof) {
      return requiresLoginResponse();
    }

    // Remint path: email exists but this browser holds a valid guest proof
    // from a prior ensure-session in this checkout window.
    if (emailTaken && guestProof) {
      const { data: profile, error: profileErr } = await sb
        .from("profiles")
        .select("id, role")
        .eq("id", guestProof.userId)
        .maybeSingle();
      if (profileErr) {
        console.error(
          "[checkout/ensure-session] remint profile check:",
          profileErr,
        );
        return requiresLoginResponse();
      }
      // Never remint elevated roles even if proof somehow matched.
      if (!profile?.id || String(profile.role ?? "") !== "user") {
        return requiresLoginResponse();
      }

      const { data: linkData, error: linkError } =
        await sb.auth.admin.generateLink({
          type: "magiclink",
          email,
        });
      if (linkError || !linkData?.user?.id) {
        console.error("[checkout/ensure-session] remint generateLink:", linkError);
        return NextResponse.json(
          { error: "Kunde inte återställa kassasessionen. Försök igen." },
          { status: 500 },
        );
      }
      if (linkData.user.id !== guestProof.userId) {
        console.warn(
          "[checkout/ensure-session] remint userId mismatch; refusing",
        );
        return requiresLoginResponse();
      }
      const tokenHash = linkData.properties?.hashed_token;
      if (!tokenHash) {
        return NextResponse.json(
          { error: "Kunde inte återställa kassasessionen. Försök igen." },
          { status: 500 },
        );
      }

      const authClient = createEphemeralAuthClient();
      const { data: verified, error: verifyError } =
        await authClient.auth.verifyOtp({
          token_hash: tokenHash,
          type: "email",
        });
      if (verifyError || !verified.session) {
        console.error("[checkout/ensure-session] remint verifyOtp:", verifyError);
        return NextResponse.json(
          { error: "Kunde inte återställa kassasessionen. Försök igen." },
          { status: 500 },
        );
      }

      return sessionSuccessResponse(
        {
          ok: true,
          autoSignedIn: true,
          reminted: true,
          userId: guestProof.userId,
          session: {
            access_token: verified.session.access_token,
            refresh_token: verified.session.refresh_token,
          },
        },
        email,
        guestProof.userId,
      );
    }

    // Brand-new email path (unchanged #246 signup rules).
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

    return sessionSuccessResponse(
      {
        ok: true,
        autoSignedIn: true,
        userId,
        session: {
          access_token: verified.session.access_token,
          refresh_token: verified.session.refresh_token,
        },
      },
      email,
      userId,
    );
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
