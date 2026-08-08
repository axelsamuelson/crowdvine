import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import {
  clearAuthNextCookie,
  finalizeSignupAfterAuth,
  signupCookiesFromRequest,
} from "@/lib/auth/finalize-signup";

function safeNextPath(raw: string | null | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/checkout";
}

/**
 * Magic-link / OTP callback.
 *
 * IMPORTANT — shared single-use OTP token:
 * The magic link and the 6-digit email code are the SAME Supabase token.
 * Following the link verifies/consumes it server-side at Supabase, then
 * redirects here with ?code= (PKCE). After that, the 6-digit code from that
 * email is invalid. Do not treat link + code as two independent factors.
 *
 * PKCE `?code=` MUST be exchanged in the browser (/auth/pkce): the
 * code-verifier cookie is set via document.cookie and is often invisible to
 * this Route Handler. Attempting exchangeCodeForSession here first can fail
 * and, depending on Auth behavior, leave the user with a burned token and no
 * working OTP fallback.
 *
 * `?token_hash=&type=` (explicit OTP template links) can be verified here.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const typeParam = searchParams.get("type");
  const next = safeNextPath(
    searchParams.get("next") ?? request.cookies.get("cv_auth_next")?.value,
  );

  const errorUrl = new URL("/auth/auth-code-error", origin);
  errorUrl.searchParams.set("next", next);
  const emailHint = request.cookies.get("cv_auth_email")?.value;
  if (emailHint) {
    errorUrl.searchParams.set("email", emailHint);
  }

  if (!code && !(tokenHash && typeParam)) {
    return NextResponse.redirect(errorUrl);
  }

  // PKCE authorization code → browser exchange only (see file header).
  if (code) {
    const pkce = new URL("/auth/pkce", origin);
    pkce.searchParams.set("code", code);
    pkce.searchParams.set("next", next);
    return NextResponse.redirect(pkce);
  }

  let response = NextResponse.redirect(new URL(next, origin));
  clearAuthNextCookie(response);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const { error: exchangeError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash!,
    type: typeParam as EmailOtpType,
  });

  if (exchangeError) {
    console.error("[auth/callback] verifyOtp failed:", exchangeError.message);
    return NextResponse.redirect(errorUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    const cookies = signupCookiesFromRequest(request);
    await finalizeSignupAfterAuth({
      userId: user.id,
      email: user.email ?? null,
      visitorId: cookies.visitorId,
      firstTouchCookie: cookies.firstTouchCookie,
      countryCode: cookies.countryCode,
      cartSessionId: cookies.cartSessionId,
      source: next.startsWith("/checkout")
        ? "checkout_magic_link"
        : "magic_link",
      emitSignupCompleted: true,
    });
  }

  return response;
}
