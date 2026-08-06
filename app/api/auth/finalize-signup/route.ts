import { NextRequest, NextResponse } from "next/server";
import {
  finalizeSignupAfterAuth,
  signupCookiesFromRequest,
  type FinalizeSignupSource,
} from "@/lib/auth/finalize-signup";
import { getCurrentUser } from "@/lib/supabase-server";

/**
 * POST /api/auth/finalize-signup
 * Called from client OTP / PKCE recovery after session is established in the browser.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    source?: unknown;
    emit_signup_completed?: unknown;
  } | null;

  const sourceRaw = typeof body?.source === "string" ? body.source : "checkout_otp";
  const allowed: FinalizeSignupSource[] = [
    "checkout_magic_link",
    "magic_link",
    "checkout_otp",
    "checkout",
  ];
  const source = (allowed.includes(sourceRaw as FinalizeSignupSource)
    ? sourceRaw
    : "checkout_otp") as FinalizeSignupSource;

  const cookies = signupCookiesFromRequest(request);
  const result = await finalizeSignupAfterAuth({
    userId: user.id,
    email: user.email ?? null,
    visitorId: cookies.visitorId,
    firstTouchCookie: cookies.firstTouchCookie,
    cartSessionId: cookies.cartSessionId,
    source,
    emitSignupCompleted: body?.emit_signup_completed !== false,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Mid-checkout: reconcile session cart (attach user_id, merge prior owned carts).
  try {
    await fetch(new URL("/api/cart/merge", request.url), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: request.headers.get("cookie") ?? "",
      },
      body: JSON.stringify({ strategy: "auto" }),
    });
  } catch (e) {
    console.warn("[finalize-signup] cart merge:", e);
  }

  return NextResponse.json({ ok: true });
}
