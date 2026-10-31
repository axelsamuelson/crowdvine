import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  b2bInquiryLimiter,
  getClientIdentifier,
} from "@/lib/rate-limiter";
import { isDirtywineInquiryMode } from "@/lib/b2b/flags";
import { validateB2bInquiryForm } from "@/lib/b2b/inquiry-validation";
import { assertInquiryLinesInB2bStock } from "@/lib/b2b/inquiry-stock";
import {
  sendB2bInquiryCustomerEmail,
  sendB2bInquiryInternalNotify,
} from "@/lib/b2b/inquiry-emails";
import { logUserEventServer } from "@/lib/analytics/log-user-event-server";

function validationStatus(
  error: string,
): { status: number; code: string } {
  switch (error) {
    case "honeypot":
      return { status: 200, code: "ok" }; // silent success for bots
    case "required":
    case "email":
    case "postal_code":
    case "phone":
    case "org_number":
    case "delivery_date":
    case "lines":
      return { status: 400, code: error };
    default:
      return { status: 400, code: "invalid" };
  }
}

export async function POST(req: Request) {
  try {
    if (!isDirtywineInquiryMode()) {
      return NextResponse.json(
        { error: "inquiry_mode_disabled", code: "inquiry_mode_disabled" },
        { status: 403 },
      );
    }

    const clientId = getClientIdentifier(req);
    if (!b2bInquiryLimiter.isAllowed(clientId)) {
      const resetTime = b2bInquiryLimiter.getResetTime(clientId);
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
      return NextResponse.json(
        {
          error: "rate_limited",
          code: "rate_limited",
          retryAfter,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "invalid_body", code: "invalid" },
        { status: 400 },
      );
    }

    const parsed = validateB2bInquiryForm({
      companyName: body.companyName,
      organizationNumber: body.organizationNumber,
      contactName: body.contactName,
      email: body.email,
      phone: body.phone,
      deliveryAddress: body.deliveryAddress,
      postalCode: body.postalCode,
      desiredDeliveryDate: body.desiredDeliveryDate,
      message: body.message,
      website: body.website,
      lines: Array.isArray(body.lines) ? body.lines : [],
    });

    if (!parsed.ok) {
      const { status, code } = validationStatus(parsed.error);
      if (parsed.error === "honeypot") {
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: code, code }, { status });
    }

    const value = parsed.value;
    const sb = getSupabaseAdmin();

    const stockCheck = await assertInquiryLinesInB2bStock(sb, value.lines);
    if (!stockCheck.ok) {
      return NextResponse.json(
        {
          error: "stock_unavailable",
          code: "stock_unavailable",
          shortfalls: stockCheck.shortfalls,
        },
        { status: 409 },
      );
    }

    const { data: inquiry, error: insertError } = await sb
      .from("b2b_inquiries")
      .insert({
        status: "new",
        company_name: value.companyName,
        organization_number: value.organizationNumber,
        contact_name: value.contactName,
        email: value.email,
        phone: value.phone,
        delivery_address: value.deliveryAddress,
        postal_code: value.postalCode,
        desired_delivery_date: value.desiredDeliveryDate,
        message: value.message,
      })
      .select("id")
      .single();

    if (insertError || !inquiry?.id) {
      console.error("[b2b/inquiry] insert failed:", insertError?.message);
      return NextResponse.json(
        { error: "persist_failed", code: "persist_failed" },
        { status: 500 },
      );
    }

    const { error: linesError } = await sb.from("b2b_inquiry_lines").insert(
      value.lines.map((line) => ({
        inquiry_id: inquiry.id,
        wine_id: line.wineId,
        wine_title: line.wineTitle,
        quantity: line.quantity,
        unit_price_cents: line.unitPriceCents,
      })),
    );

    if (linesError) {
      console.error("[b2b/inquiry] lines insert failed:", linesError.message);
      await sb.from("b2b_inquiries").delete().eq("id", inquiry.id);
      return NextResponse.json(
        { error: "persist_failed", code: "persist_failed" },
        { status: 500 },
      );
    }

    const locale = body.locale === "en" ? "en" : "sv";
    const notifyOverride =
      typeof body.notifyEmailOverride === "string" &&
      process.env.VERCEL_ENV !== "production"
        ? body.notifyEmailOverride.trim()
        : undefined;

    try {
      await sendB2bInquiryCustomerEmail({ to: value.email, locale });
    } catch (e) {
      console.error("[b2b/inquiry] customer email failed:", e);
    }

    try {
      await sendB2bInquiryInternalNotify({
        inquiryId: inquiry.id,
        value,
        to: notifyOverride,
      });
    } catch (e) {
      console.error("[b2b/inquiry] notify email failed:", e);
    }

    void logUserEventServer({
      eventType: "b2b_inquiry_submitted",
      eventCategory: "b2b",
      metadata: {
        inquiry_id: inquiry.id,
        line_count: value.lines.length,
        total_bottles: value.lines.reduce((s, l) => s + l.quantity, 0),
        has_message: Boolean(value.message),
        postal_prefix: value.postalCode.slice(0, 3),
      },
      pageUrl: "/b2b/inquiry",
      sessionId:
        typeof body.sessionId === "string" ? body.sessionId : undefined,
      visitorId:
        typeof body.visitorId === "string" ? body.visitorId : undefined,
      userAgent: req.headers.get("user-agent"),
    });

    return NextResponse.json({ success: true, id: inquiry.id });
  } catch (e) {
    console.error("[b2b/inquiry]", e);
    return NextResponse.json(
      { error: "server_error", code: "server_error" },
      { status: 500 },
    );
  }
}
