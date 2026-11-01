import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import {
  b2bInquiryLimiter,
  getClientIdentifier,
} from "@/lib/rate-limiter";
import { isDirtywineInquiryMode } from "@/lib/b2b/flags";
import { claimB2bInquiryForUser } from "@/lib/b2b/inquiry-claim-tokens";

/**
 * POST /api/b2b/inquiry/claim
 * Link a guest inquiry to the authenticated account via one-time claim token.
 */
export async function POST(req: Request) {
  try {
    if (!isDirtywineInquiryMode()) {
      return NextResponse.json(
        { error: "inquiry_mode_disabled", code: "inquiry_mode_disabled" },
        { status: 403 },
      );
    }

    const user = await getCurrentUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: "unauthorized", code: "unauthorized" },
        { status: 401 },
      );
    }

    const clientId = getClientIdentifier(req);
    if (!b2bInquiryLimiter.isAllowed(`claim:${clientId}`)) {
      const resetTime = b2bInquiryLimiter.getResetTime(`claim:${clientId}`);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        { error: "rate_limited", code: "rate_limited", retryAfter },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        },
      );
    }

    const body = await req.json().catch(() => null);
    const token =
      body && typeof body === "object" && typeof body.token === "string"
        ? body.token
        : "";

    const result = await claimB2bInquiryForUser({
      rawToken: token,
      userId: user.id,
    });

    if (!result.ok) {
      const status =
        result.code === "missing_token" || result.code === "not_found"
          ? 400
          : result.code === "expired" || result.code === "already_claimed"
            ? 409
            : 500;
      return NextResponse.json(
        { error: result.code, code: result.code, message: result.message },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      id: result.inquiryId,
    });
  } catch (e) {
    console.error("[b2b/inquiry/claim]", e);
    return NextResponse.json(
      { error: "server_error", code: "server_error" },
      { status: 500 },
    );
  }
}
