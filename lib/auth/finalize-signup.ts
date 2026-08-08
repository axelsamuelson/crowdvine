import { NextRequest, NextResponse } from "next/server";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import {
  FIRST_TOUCH_KEY,
  GEO_COUNTRY_COOKIE,
  VISITOR_ID_KEY,
  parseFirstTouchPayload,
} from "@/lib/analytics/visitor-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { reconcileSessionCartForUser } from "@/lib/cart/reconcile-on-auth";

export type FinalizeSignupSource =
  | "checkout_magic_link"
  | "magic_link"
  | "checkout_otp"
  | "checkout";

/**
 * Shared post-auth steps for magic-link callback and mid-checkout OTP.
 * Idempotent enough to call from both paths (profile upsert; cart reconcile).
 */
export async function finalizeSignupAfterAuth(opts: {
  userId: string;
  email?: string | null;
  /** Raw cookie header value or decoded visitor id */
  visitorId?: string | null;
  firstTouchCookie?: string | null;
  countryCode?: string | null;
  cartSessionId?: string | null;
  source: FinalizeSignupSource;
  /** When false, skip analytics (caller emits client-side). Default true. */
  emitSignupCompleted?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const sbAdmin = getSupabaseAdmin();
    await sbAdmin.from("profiles").upsert(
      {
        id: opts.userId,
        email: opts.email?.trim() ? opts.email.trim() : null,
      },
      { onConflict: "id" },
    );

    const cartSessionId = opts.cartSessionId?.trim() || null;
    if (cartSessionId) {
      try {
        await reconcileSessionCartForUser({
          userId: opts.userId,
          sessionId: cartSessionId,
        });
      } catch (cartErr) {
        console.warn(
          "[finalize-signup] cart reconcile:",
          cartErr instanceof Error ? cartErr.message : cartErr,
        );
      }
    }

    if (opts.emitSignupCompleted !== false) {
      const visitorId =
        typeof opts.visitorId === "string" && opts.visitorId.trim()
          ? (() => {
              try {
                return decodeURIComponent(opts.visitorId.trim());
              } catch {
                return opts.visitorId.trim();
              }
            })()
          : null;
      const firstTouch = parseFirstTouchPayload(opts.firstTouchCookie ?? null);
      void logUserEventServer({
        userId: opts.userId,
        visitorId,
        countryCode: opts.countryCode ?? null,
        firstTouch,
        eventType: "signup_completed",
        eventCategory: "auth",
        metadata: {
          user_id: opts.userId,
          source: opts.source,
          ...(visitorId ? { visitor_id: visitorId } : {}),
        },
      });
    }

    return { ok: true };
  } catch (e) {
    console.error("[finalize-signup]", e);
    return {
      ok: false,
      error: e instanceof Error ? e.message : "finalize failed",
    };
  }
}

/** Read visitor / cart cookies from a Next request. */
export function signupCookiesFromRequest(request: NextRequest): {
  visitorId: string | null;
  firstTouchCookie: string | null;
  countryCode: string | null;
  cartSessionId: string | null;
} {
  const visitorIdRaw = request.cookies.get(VISITOR_ID_KEY)?.value ?? null;
  const countryRaw = request.cookies.get(GEO_COUNTRY_COOKIE)?.value ?? null;
  const countryCode =
    countryRaw &&
    /^[A-Z]{2}$/i.test(countryRaw.trim()) &&
    countryRaw.trim().toUpperCase() !== "XX"
      ? countryRaw.trim().toUpperCase()
      : null;
  return {
    visitorId: visitorIdRaw,
    firstTouchCookie: request.cookies.get(FIRST_TOUCH_KEY)?.value ?? null,
    countryCode,
    cartSessionId: request.cookies.get("cv_cart_id")?.value ?? null,
  };
}

export function clearAuthNextCookie(response: NextResponse): void {
  response.cookies.set("cv_auth_next", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  response.cookies.set("cv_auth_email", "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}
