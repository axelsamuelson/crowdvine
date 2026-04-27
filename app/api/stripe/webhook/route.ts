import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
async function handlePaymentIntentSucceededWebhook(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const reservationIdRaw = paymentIntent.metadata?.reservation_id;
  if (!reservationIdRaw || typeof reservationIdRaw !== "string") {
    console.log(
      `[Stripe Webhook] payment_intent.succeeded pi=${paymentIntent.id} missing reservation_id in metadata; not a reservation charge`,
    );
    return;
  }
  const reservationId = reservationIdRaw.trim();
  console.log(
    `[Stripe Webhook] payment_intent.succeeded reservation_id=${reservationId} pi=${paymentIntent.id}`,
  );

  const supabase = getSupabaseAdmin();

  const { error: updateError } = await supabase
    .from("order_reservations")
    .update({
      payment_status: "paid",
      payment_intent_id: paymentIntent.id,
      status: "confirmed",
    })
    .eq("id", reservationId);

  if (updateError) {
    console.error(
      `[Stripe Webhook] reservation_id=${reservationId} failed to mark paid:`,
      updateError,
    );
    return;
  }

  const { confirmPendingRedemption } = await import(
    "@/lib/membership/pact-points-engine"
  );
  const confirmResult = await confirmPendingRedemption(reservationId);
  if (!confirmResult.success) {
    console.error(
      `[Stripe Webhook] reservation_id=${reservationId} confirmPendingRedemption:`,
      confirmResult.error,
    );
  }

  const { data: resRow } = await supabase
    .from("order_reservations")
    .select("user_id, pallet_id")
    .eq("id", reservationId)
    .maybeSingle();

  const userId =
    resRow && typeof resRow.user_id === "string" ? resRow.user_id : null;
  const palletId =
    resRow && typeof resRow.pallet_id === "string" ? resRow.pallet_id : null;

  let palletName = "Your pallet";
  if (palletId) {
    const { data: pal } = await supabase
      .from("pallets")
      .select("name")
      .eq("id", palletId)
      .maybeSingle();
    if (pal?.name && typeof pal.name === "string" && pal.name.trim() !== "") {
      palletName = pal.name.trim();
    }
  }

  let toEmail: string | null = null;
  if (userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const em = prof?.email;
    if (typeof em === "string" && em.includes("@")) {
      toEmail = em.trim();
    }
  }

  if (toEmail) {
    const { sendPaymentConfirmedEmail } = await import("@/lib/sendgrid-service");
    const amountSek = Math.round((paymentIntent.amount ?? 0) / 100);
    const sent = await sendPaymentConfirmedEmail({
      to: toEmail,
      reservationId,
      amountSek,
      palletName,
    });
    if (!sent) {
      console.warn(
        `[Stripe Webhook] reservation_id=${reservationId} payment confirmed email not sent`,
      );
    }
  } else {
    console.warn(
      `[Stripe Webhook] reservation_id=${reservationId} no profile email for payment confirmation`,
    );
  }

  console.log(
    `[Stripe Webhook] payment_intent.succeeded done reservation_id=${reservationId}`,
  );
}

async function handlePaymentIntentPaymentFailedWebhook(
  paymentIntent: Stripe.PaymentIntent,
): Promise<void> {
  const reservationIdRaw = paymentIntent.metadata?.reservation_id;
  if (!reservationIdRaw || typeof reservationIdRaw !== "string") {
    console.log(
      `[Stripe Webhook] payment_intent.payment_failed pi=${paymentIntent.id} missing reservation_id in metadata; skipping`,
    );
    return;
  }
  const reservationId = reservationIdRaw.trim();
  const reason =
    paymentIntent.last_payment_error?.message ?? "Payment failed";

  console.log(
    `[Stripe Webhook] payment_intent.payment_failed reservation_id=${reservationId} pi=${paymentIntent.id} reason=${reason}`,
  );

  const supabase = getSupabaseAdmin();

  const { data: prior, error: priorErr } = await supabase
    .from("order_reservations")
    .select("payment_attempts, user_id")
    .eq("id", reservationId)
    .maybeSingle();

  if (priorErr) {
    console.error(
      `[Stripe Webhook] reservation_id=${reservationId} read attempts failed:`,
      priorErr,
    );
  }

  const nextAttempts = (prior?.payment_attempts ?? 0) + 1;

  const { error: updateError } = await supabase
    .from("order_reservations")
    .update({
      payment_status: "failed",
      payment_failed_reason: reason.slice(0, 2000),
      payment_attempts: nextAttempts,
      payment_last_attempt_at: new Date().toISOString(),
    })
    .eq("id", reservationId);

  if (updateError) {
    console.error(
      `[Stripe Webhook] reservation_id=${reservationId} failed to persist payment_failed:`,
      updateError,
    );
    return;
  }

  const { schedulePaymentRetry } = await import("@/lib/payment-retry");
  try {
    await schedulePaymentRetry(reservationId, nextAttempts);
  } catch (e) {
    console.error(
      `[Stripe Webhook] reservation_id=${reservationId} schedulePaymentRetry:`,
      e,
    );
  }

  const userId =
    prior && typeof prior.user_id === "string" ? prior.user_id : null;
  let toEmail: string | null = null;
  if (userId) {
    const { data: prof } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    const em = prof?.email;
    if (typeof em === "string" && em.includes("@")) {
      toEmail = em.trim();
    }
  }

  if (toEmail && nextAttempts < 3) {
    const { sendPaymentFailedEmail } = await import("@/lib/sendgrid-service");
    const profileUrl =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "https://pact.wine";
    const retryHours: 24 | 72 = nextAttempts === 1 ? 24 : 72;
    const sent = await sendPaymentFailedEmail({
      to: toEmail,
      reservationId,
      reason,
      retryHours,
      profileUrl,
    });
    if (!sent) {
      console.warn(
        `[Stripe Webhook] reservation_id=${reservationId} payment failed email not sent`,
      );
    }
  } else if (!toEmail) {
    console.warn(
      `[Stripe Webhook] reservation_id=${reservationId} no profile email for payment failure`,
    );
  }
}

export async function POST(request: NextRequest) {
  if (!stripe) {
    console.error("❌ [Stripe Webhook] Stripe is not configured");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ [Stripe Webhook] Missing stripe-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error(
      "❌ [Stripe Webhook] Missing STRIPE_WEBHOOK_SECRET environment variable",
    );
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 },
    );
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    console.log(`✅ [Stripe Webhook] Event received: ${event.type}`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown signature verification error";
    console.error(
      `❌ [Stripe Webhook] Webhook signature verification failed:`,
      message,
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        console.log(
          `💰 [Stripe Webhook] Checkout session completed: ${session.id}`,
        );

        // Check if this is a pallet payment (has reservation_id in metadata)
        if (session.metadata?.reservation_id) {
          const supabase = getSupabaseAdmin();

          // Mark reservation as paid
          const { error: updateError } = await supabase
            .from("order_reservations")
            .update({
              status: "confirmed",
              payment_status: "paid",
              payment_intent_id: session.payment_intent as string,
            })
            .eq("id", session.metadata.reservation_id);

          if (updateError) {
            console.error(
              `❌ [Stripe Webhook] Error updating reservation ${session.metadata.reservation_id}:`,
              updateError,
            );
          }

          console.log(
            `✅ [Stripe Webhook] Reservation ${session.metadata.reservation_id} marked as paid`,
          );

          // Auto pallet status: if all reservations in this pallet are paid, move pallet to awaiting_pickup (auto mode only)
          try {
            const { data: resRow } = await supabase
              .from("order_reservations")
              .select("id, pallet_id")
              .eq("id", session.metadata.reservation_id)
              .maybeSingle();

            const palletId = (resRow as any)?.pallet_id as string | null;
            if (palletId) {
              const { data: palletRow } = await supabase
                .from("pallets")
                .select("id, status, status_mode")
                .eq("id", palletId)
                .maybeSingle();

              const mode = (palletRow as any)?.status_mode || "auto";
              const currentStatus = String((palletRow as any)?.status || "open").toLowerCase();

              if (mode === "auto" && currentStatus !== "delivered" && currentStatus !== "cancelled") {
                const { data: allRes } = await supabase
                  .from("order_reservations")
                  .select("id, payment_status, status")
                  .eq("pallet_id", palletId)
                  .in("status", ["placed", "approved", "partly_approved", "pending_payment", "confirmed"]);

                const allPaid =
                  (allRes || []).length > 0 &&
                  (allRes || []).every(
                    (r: any) => String(r.payment_status || "") === "paid" || String(r.status || "") === "confirmed",
                  );

                if (allPaid) {
                  await supabase
                    .from("pallets")
                    .update({ status: "awaiting_pickup" })
                    .eq("id", palletId);
                }
              }
            }
          } catch (e) {
            console.warn("[Stripe Webhook] Failed to auto-update pallet status");
          }

          // TODO: Send confirmation email to customer
          // TODO: Update pallet status if all reservations are paid
        }
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        try {
          await handlePaymentIntentSucceededWebhook(paymentIntent);
        } catch (e) {
          console.error(
            `[Stripe Webhook] payment_intent.succeeded handler error pi=${paymentIntent.id}:`,
            e,
          );
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        try {
          await handlePaymentIntentPaymentFailedWebhook(paymentIntent);
        } catch (e) {
          console.error(
            `[Stripe Webhook] payment_intent.payment_failed handler error pi=${paymentIntent.id}:`,
            e,
          );
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object;
        console.log(
          `⏰ [Stripe Webhook] Checkout session expired: ${session.id}`,
        );

        // Mark reservation as expired if it has reservation_id
        if (session.metadata?.reservation_id) {
          const supabase = getSupabaseAdmin();

          const { error: updateError } = await supabase
            .from("order_reservations")
            .update({
              payment_status: "expired",
            })
            .eq("id", session.metadata.reservation_id);

          if (updateError) {
            console.error(
              `❌ [Stripe Webhook] Error marking reservation as expired:`,
              updateError,
            );
          } else {
            console.log(
              `✅ [Stripe Webhook] Reservation ${session.metadata.reservation_id} marked as expired`,
            );
          }
        }
        break;
      }

      case "setup_intent.succeeded": {
        const setupIntent = event.data.object;
        console.log(
          `💳 [Stripe Webhook] setup_intent.succeeded: ${setupIntent.id}`,
        );
        break;
      }

      case "setup_intent.setup_failed": {
        const setupIntent = event.data.object;
        console.log(
          `❌ [Stripe Webhook] setup_intent.setup_failed: ${setupIntent.id}`,
        );
        break;
      }

      case "payment_method.attached": {
        const pm = event.data.object;
        const pmId =
          pm && typeof pm === "object" && "id" in pm
            ? String((pm as { id: unknown }).id)
            : "unknown";
        console.log(`💳 [Stripe Webhook] payment_method.attached: ${pmId}`);
        break;
      }

      case "payment_method.detached": {
        const pm = event.data.object;
        const pmId =
          pm && typeof pm === "object" && "id" in pm
            ? String((pm as { id: unknown }).id)
            : "unknown";
        console.log(`🗑️ [Stripe Webhook] payment_method.detached: ${pmId}`);
        break;
      }

      case "customer.deleted": {
        const customer = event.data.object;
        const customerId =
          customer && typeof customer === "object" && "id" in customer
            ? String((customer as { id: unknown }).id)
            : null;
        console.log(
          `🧹 [Stripe Webhook] customer.deleted: ${customerId ?? "unknown"}`,
        );
        if (customerId) {
          const supabase = getSupabaseAdmin();
          const { error: updateError } = await supabase
            .from("user_memberships")
            .update({ stripe_customer_id: null })
            .eq("stripe_customer_id", customerId);
          if (updateError) {
            console.error(
              `❌ [Stripe Webhook] Failed to null out stripe_customer_id for ${customerId}:`,
              updateError,
            );
          }
        }
        break;
      }

      default:
        console.log(`ℹ️ [Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`❌ [Stripe Webhook] Error processing webhook:`, error);
    return NextResponse.json({ received: true });
  }
}
