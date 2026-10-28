import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendGridService } from "@/lib/sendgrid-service";
import { sendTransactionalEmailOnce } from "@/lib/email/claim-email-send";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/supabase-server";

const orderConfirmationSchema = z
  .object({
    customerEmail: z.string().min(1),
    customerName: z.string().min(1),
    orderId: z.string().min(1),
    orderDate: z.string().min(1),
    items: z
      .array(
        z
          .object({
            name: z.string(),
            quantity: z.number(),
            price: z.number(),
            image: z.string().optional(),
          })
          .strict(),
      )
      .min(1),
    subtotal: z.number(),
    tax: z.number(),
    shipping: z.number(),
    total: z.number(),
    shippingAddress: z
      .object({
        name: z.string(),
        street: z.string(),
        city: z.string(),
        postalCode: z.string(),
        country: z.string(),
      })
      .strict(),
    reservationId: z.string().min(1).optional(),
    discount: z.number().optional(),
  })
  .strict();

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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = orderConfirmationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid order confirmation request" },
        { status: 400 },
      );
    }
    const data = parsed.data;

    const reservationId = (data.reservationId ?? data.orderId).trim();
    if (!reservationId) {
      return NextResponse.json(
        { error: "reservationId (or orderId) is required for idempotent send" },
        { status: 400 },
      );
    }

    const sb = getSupabaseAdmin();
    const { data: byId } = await sb
      .from("order_reservations")
      .select("id, user_id")
      .eq("id", reservationId)
      .maybeSingle();
    const owned =
      byId ??
      (
        await sb
          .from("order_reservations")
          .select("id, user_id")
          .eq("order_id", reservationId)
          .eq("user_id", user.id)
          .maybeSingle()
      ).data;
    if (!owned || owned.user_id !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
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
