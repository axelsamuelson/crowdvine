import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { stripe } from "@/lib/stripe";

const RECOVERABLE_PI_STATUSES = new Set([
  "requires_action",
  "requires_confirmation",
  "requires_payment_method",
]);

/**
 * GET /api/reservations/[id]/payment-recovery
 * Returns Stripe PaymentIntent client_secret for on-session SCA recovery
 * (e.g. after authentication_required on an off-session charge).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe not configured" },
        { status: 503 },
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: reservationId } = await params;
    if (!reservationId?.trim()) {
      return NextResponse.json({ error: "Missing reservation id" }, { status: 400 });
    }

    const sb = getSupabaseAdmin();
    const { data: row, error } = await sb
      .from("order_reservations")
      .select(
        "id, user_id, payment_intent_id, payment_status, stripe_decline_code, status, cancelled_at",
      )
      .eq("id", reservationId.trim())
      .maybeSingle();

    if (error || !row) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    if (row.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (row.cancelled_at != null || String(row.status) === "cancelled") {
      return NextResponse.json(
        { error: "Reservation is cancelled" },
        { status: 410 },
      );
    }

    const piId =
      typeof row.payment_intent_id === "string" && row.payment_intent_id.trim()
        ? row.payment_intent_id.trim()
        : null;
    if (!piId) {
      return NextResponse.json(
        { error: "No payment intent on this reservation" },
        { status: 404 },
      );
    }

    const pi = await stripe.paymentIntents.retrieve(piId);
    const metaRid =
      typeof pi.metadata?.reservation_id === "string"
        ? pi.metadata.reservation_id.trim()
        : "";
    if (metaRid && metaRid !== row.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (pi.status === "succeeded" || row.payment_status === "paid") {
      return NextResponse.json({ alreadyPaid: true });
    }

    if (pi.status === "canceled") {
      return NextResponse.json(
        { error: "Payment session has expired. Contact support if you still owe a payment." },
        { status: 410 },
      );
    }

    const decline =
      typeof row.stripe_decline_code === "string"
        ? row.stripe_decline_code.trim()
        : "";
    const recoverableByStatus = RECOVERABLE_PI_STATUSES.has(pi.status);
    const recoverableByDecline = decline === "authentication_required";
    if (!recoverableByStatus && !recoverableByDecline) {
      return NextResponse.json(
        {
          error:
            "This payment cannot be completed from this page. Open your profile or contact support.",
          intentStatus: pi.status,
        },
        { status: 409 },
      );
    }

    const clientSecret =
      typeof pi.client_secret === "string" && pi.client_secret.trim()
        ? pi.client_secret.trim()
        : null;
    if (!clientSecret) {
      return NextResponse.json(
        { error: "Stripe did not return a client secret for this payment" },
        { status: 503 },
      );
    }

    const amountOre = Number(pi.amount) || 0;
    const amountSek = Math.round(amountOre / 100);

    return NextResponse.json({
      clientSecret,
      intentStatus: pi.status,
      amountSek,
      currency: typeof pi.currency === "string" ? pi.currency : "sek",
    });
  } catch (e) {
    console.error("[payment-recovery] GET error:", e);
    const msg = e instanceof Error ? e.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
