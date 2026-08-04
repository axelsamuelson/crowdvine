import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import {
  FIRST_TOUCH_KEY,
  VISITOR_ID_KEY,
  parseFirstTouchPayload,
} from "@/lib/analytics/visitor-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

function safeNextPath(raw: string | null | undefined): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return "/checkout";
}

/**
 * Magic-link / PKCE callback.
 * Uses @supabase/ssr createServerClient so session cookies are written on the redirect.
 * Handles both `?code=` (PKCE) and `?token_hash=&type=` (OTP template) flows.
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

  if (!code && !(tokenHash && typeParam)) {
    return NextResponse.redirect(errorUrl);
  }

  let response = NextResponse.redirect(new URL(next, origin));
  // Do not clear cv_cart_id — anonymous cart must survive auth.
  response.cookies.set("cv_auth_next", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });

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

  let exchangeError: { message: string } | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    exchangeError = error;
  } else if (tokenHash && typeParam) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeParam as EmailOtpType,
    });
    exchangeError = error;
  }

  if (exchangeError) {
    console.error("[auth/callback] exchange failed:", exchangeError.message);
    return NextResponse.redirect(errorUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) {
    try {
      const sbAdmin = getSupabaseAdmin();
      await sbAdmin.from("profiles").upsert(
        {
          id: user.id,
          email: user.email ?? null,
        },
        { onConflict: "id" },
      );

      // Attach anonymous session cart to the new user (keep cv_cart_id cookie).
      const cartSessionId = request.cookies.get("cv_cart_id")?.value?.trim();
      if (cartSessionId) {
        const { error: cartErr } = await sbAdmin
          .from("carts")
          .update({
            user_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("session_id", cartSessionId)
          .is("user_id", null);
        if (cartErr) {
          console.warn("[auth/callback] cart attach:", cartErr.message);
        }
      }

      const visitorIdRaw = request.cookies.get(VISITOR_ID_KEY)?.value;
      const visitorId =
        typeof visitorIdRaw === "string" && visitorIdRaw.trim()
          ? decodeURIComponent(visitorIdRaw).trim()
          : null;
      const firstTouch = parseFirstTouchPayload(
        request.cookies.get(FIRST_TOUCH_KEY)?.value ?? null,
      );

      void logUserEventServer({
        userId: user.id,
        visitorId,
        firstTouch,
        eventType: "signup_completed",
        eventCategory: "auth",
        metadata: {
          user_id: user.id,
          source: next.startsWith("/checkout")
            ? "checkout_magic_link"
            : "magic_link",
          ...(visitorId ? { visitor_id: visitorId } : {}),
        },
      });
    } catch (e) {
      console.error("[auth/callback] profile / cart / analytics:", e);
    }
  }

  return response;
}
