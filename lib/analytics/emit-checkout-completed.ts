import { logUserEventServer } from "@/lib/analytics/log-user-event-server";
import type { FirstTouch } from "@/lib/analytics/visitor-identity";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export type CheckoutCompletedSource =
  | "checkout_confirm"
  | "stripe_webhook";

/**
 * Emit checkout_completed once per reservation when money is captured.
 * Idempotent: skips if an event for this reservation_id already exists.
 */
export async function emitCheckoutCompletedOnce(opts: {
  reservationId: string;
  bottleCount?: number | null;
  amountSek?: number | null;
  paymentIntentId?: string | null;
  chargeId?: string | null;
  source: CheckoutCompletedSource;
  userId?: string | null;
  visitorId?: string | null;
  countryCode?: string | null;
  firstTouch?: FirstTouch | null;
  internal?: boolean;
  isB2b?: boolean;
}): Promise<boolean> {
  const reservationId = opts.reservationId.trim();
  if (!reservationId) return false;

  try {
    const sb = getSupabaseAdmin();
    const { data: existing } = await sb
      .from("user_events")
      .select("id")
      .eq("event_type", "checkout_completed")
      .contains("event_metadata", { reservation_id: reservationId })
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      return false;
    }

    await logUserEventServer({
      userId: opts.userId ?? null,
      visitorId: opts.visitorId ?? null,
      countryCode: opts.countryCode ?? null,
      eventType: "checkout_completed",
      eventCategory: "checkout",
      firstTouch: opts.firstTouch ?? null,
      internal: opts.internal,
      metadata: {
        reservation_id: reservationId,
        payment_mode: "payment_intent",
        payment_status: "paid",
        source: opts.source,
        ...(opts.bottleCount != null
          ? { bottle_count: opts.bottleCount }
          : {}),
        ...(opts.amountSek != null ? { amount_sek: opts.amountSek } : {}),
        ...(opts.paymentIntentId
          ? { payment_intent_id: opts.paymentIntentId }
          : {}),
        ...(opts.chargeId ? { charge_id: opts.chargeId } : {}),
        ...(opts.isB2b != null ? { is_b2b: opts.isB2b } : {}),
      },
    });
    return true;
  } catch (error) {
    console.error(
      "[analytics] emitCheckoutCompletedOnce failed:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}
