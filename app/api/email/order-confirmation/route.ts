import { NextRequest, NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";

/** Provider-specific quota / billing exhaustion (SendGrid, Resend, etc.). */
function isEmailQuotaExceededMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("maximum credits exceeded") ||
    m.includes("credit limit exceeded") ||
    m.includes("insufficient credits") ||
    m.includes("monthly email limit") ||
    m.includes("daily limit") ||
    m.includes("rate limit")
  );
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    // NOTE: allow numeric 0 (e.g. tax: 0) by checking undefined/null instead of falsy.
    const requiredFields = [
      "customerEmail",
      "customerName",
      "orderId",
      "orderDate",
      "items",
      "subtotal",
      "tax",
      "shipping",
      "total",
      "shippingAddress",
    ] as const;

    for (const field of requiredFields) {
      const value = data?.[field];
      if (value === undefined || value === null) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 },
        );
      }
    }

    if (!Array.isArray(data.items) || data.items.length === 0) {
      return NextResponse.json({ error: "items is required" }, { status: 400 });
    }

    // Local / misconfigured hosts often omit Resend; treat as intentional skip (not a checkout failure).
    if (!process.env.RESEND_API_KEY?.trim()) {
      return NextResponse.json(
        {
          skipped: true,
          reason: "missing_resend_key",
          message:
            "Resend is not configured (RESEND_API_KEY). No confirmation email was sent.",
        },
        { status: 200 },
      );
    }

    const result = await sendGridService.sendOrderConfirmationDetailed({
      customerEmail: data.customerEmail,
      customerName: data.customerName,
      orderId: data.orderId,
      orderDate: data.orderDate,
      items: data.items,
      subtotal: data.subtotal,
      tax: data.tax,
      shipping: data.shipping,
      total: data.total,
      shippingAddress: data.shippingAddress,
    });

    if (result.ok) {
      return NextResponse.json({
        success: true,
        message: "Order confirmation email sent successfully",
      });
    }

    if (
      result.code === "send_failed" &&
      typeof result.message === "string" &&
      isEmailQuotaExceededMessage(result.message)
    ) {
      return NextResponse.json(
        {
          skipped: true,
          reason: "email_quota_exceeded",
          message:
            "Email provider returned a quota or billing limit error. No confirmation email was sent; the order is still valid.",
        },
        { status: 200 },
      );
    }

    const status =
      result.code === "missing_api_key"
        ? 503
        : result.code === "template_error"
          ? 500
          : 502;

    return NextResponse.json(
      {
        success: false,
        code: result.code,
        message: result.message,
      },
      { status },
    );
  } catch (error) {
    console.error("Order confirmation email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
