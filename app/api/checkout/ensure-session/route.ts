import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isPlatformOpen } from "@/lib/platform-open";
import { isGuestCheckoutEnabled } from "@/lib/checkout/guest-checkout-flag";
import { isSwedishGuestCheckoutMarket } from "@/lib/checkout/guest-checkout-eligibility";
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
      error: "Sign in required to continue checkout.",
    },
    { status: 409 },
  );
}

/**
 * POST /api/checkout/ensure-session
 *
 * Silent guest checkout session from the delivery email — only for brand-new
 * emails. Available when PLATFORM_OPEN=true, or when GUEST_CHECKOUT_ENABLED=true
 * for Swedish (SE) visitors.
 *
 * Existing accounts (any role) must use OTP login: we never mint tokens or
 * rewrite profiles for them (409 requiresLogin).
 *
 * Creates a real auth.users + profiles row so Stripe customer, SetupIntent,
 * off_session pallet-close charge, emails, and admin views keep working via
 * order_reservations.user_id.
 */
export async function POST(request: NextRequest) {
  const platformOpen = isPlatformOpen();
  const guestCheckoutEnabled = isGuestCheckoutEnabled();

  if (!platformOpen && !guestCheckoutEnabled) {
    return NextResponse.json(
      {
        error:
          "Guest checkout session is only available when the platform is open or guest checkout is enabled.",
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
        error: "Too many attempts. Please try again later.",
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
    fullName?: unknown;
    countryCode?: unknown;
  } | null;
  const emailRaw = typeof body?.email === "string" ? body.email : "";
  const email = normalizeEmail(emailRaw);
  const fullName =
    typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const countryCode =
    typeof body?.countryCode === "string"
      ? body.countryCode.trim().toUpperCase()
      : "";

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "A valid email is required." },
      { status: 400 },
    );
  }

  // Guest-checkout flag alone is SE-only (require explicit SE; empty ≠ SE).
  // PLATFORM_OPEN keeps broader access without a country gate.
  if (
    !platformOpen &&
    guestCheckoutEnabled &&
    !isSwedishGuestCheckoutMarket(countryCode)
  ) {
    return NextResponse.json(
      { error: "Guest checkout is only available for Sweden." },
      { status: 403 },
    );
  }

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
        { error: "Could not prepare checkout account." },
        { status: 500 },
      );
    }

    const userId = linkData.user.id;
    const tokenHash = linkData.properties?.hashed_token;
    if (!tokenHash) {
      console.error("[checkout/ensure-session] generateLink missing hashed_token");
      return NextResponse.json(
        { error: "Could not prepare checkout session." },
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

    const { data: verified, error: verifyError } = await sb.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (verifyError || !verified.session) {
      console.error("[checkout/ensure-session] verifyOtp:", verifyError);
      return NextResponse.json(
        { error: "Could not start checkout session." },
        { status: 500 },
      );
    }

    const now = new Date().toISOString();
    // Insert-only: never upsert role onto an existing profile (admins included).
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
        { error: "Could not prepare profile." },
        { status: 500 },
      );
    }

    if (!existingProfile) {
      // guest_checkout_at only when flag ON — column may not exist until
      // migration 291; PLATFORM_OPEN-only prod must not write it.
      const profileInsert: Record<string, unknown> = {
        id: userId,
        email,
        role: "user",
        access_granted_at: now,
        updated_at: now,
        ...(fullName.length > 1 ? { full_name: fullName } : {}),
      };
      if (guestCheckoutEnabled) {
        profileInsert.guest_checkout_at = now;
      }
      const { error: profileError } = await sb
        .from("profiles")
        .insert(profileInsert);
      if (profileError) {
        console.error("[checkout/ensure-session] profile insert:", profileError);
        return NextResponse.json(
          { error: "Could not prepare profile." },
          { status: 500 },
        );
      }
    }

    const cookies = signupCookiesFromRequest(request);
    await finalizeSignupAfterAuth({
      userId,
      email,
      visitorId: cookies.visitorId,
      firstTouchCookie: cookies.firstTouchCookie,
      countryCode: cookies.countryCode || countryCode || null,
      cartSessionId: cookies.cartSessionId,
      source: "checkout_guest",
      emitSignupCompleted: wasSignup && !guestCheckoutEnabled,
    });

    return NextResponse.json({
      ok: true,
      autoSignedIn: true,
      userId,
      guest: guestCheckoutEnabled,
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
          err instanceof Error ? err.message : "Internal server error",
      },
      { status: 500 },
    );
  }
}
