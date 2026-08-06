import { NextRequest, NextResponse } from "next/server";
import { sendGridService } from "@/lib/sendgrid-service";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";

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

/**
 * Manual / admin / legacy entry for order confirmation.
 * Prefer sending from /api/checkout/confirm (idempotent).
 * This route still claims via email_sends so a double-call cannot resend.
 */
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

    const reservationId =
      (typeof data.reservationId === "string" && data.reservationId.trim()) ||
      (typeof data.orderId === "string" && data.orderId.trim()) ||
      "";
    if (!reservationId) {
      return NextResponse.json(
        { error: "reservationId (or orderId) is required for idempotent send" },
        { status: 400 },
      );
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

    const sendResult = await sendTransactionalEmailOnce({
      emailType: "order_confirmation",
      recipient: String(data.customerEmail),
      reservationId,
      send: async () => {
        const result = await sendGridService.sendOrderConfirmationDetailed({
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          orderId: data.orderId,
          orderDate: data.orderDate,
          items: data.items,
          subtotal: data.subtotal,
          tax: data.tax,
          shipping: data.shipping,
          discount:
            typeof data.discount === "number" && Number.isFinite(data.discount)
              ? Math.max(0, data.discount)
              : undefined,
          total: data.total,
          shippingAddress: data.shippingAddress,
        });
        if (result.ok) return true;
        if (
          result.code === "send_failed" &&
          typeof result.message === "string" &&
          isEmailQuotaExceededMessage(result.message)
        ) {
          // Surface as skip-like failure so caller can treat reservation as valid
          throw Object.assign(new Error(result.message), {
            code: "email_quota_exceeded",
          });
        }
        throw new Error(result.message || result.code || "send failed");
      },
    });

    if (sendResult === "skipped") {
      return NextResponse.json({
        skipped: true,
        reason: "already_sent",
        message: "Order confirmation already sent for this reservation.",
      });
    }

    if (sendResult === "sent") {
      return NextResponse.json({
        success: true,
        message: "Order confirmation email sent successfully",
      });
    }

    return NextResponse.json(
      {
        success: false,
        code: "send_failed",
        message: "Order confirmation email failed after claim",
      },
      { status: 502 },
    );
  } catch (error) {
    const err = error as { code?: string; message?: string };
    if (err?.code === "email_quota_exceeded") {
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
    console.error("Order confirmation email API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
