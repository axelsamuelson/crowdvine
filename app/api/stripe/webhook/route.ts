import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
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
  } catch (err: any) {
    console.error(
      `❌ [Stripe Webhook] Webhook signature verification failed:`,
      err.message,
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
            throw updateError;
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
        const paymentIntent = event.data.object;
        console.log(
          `✅ [Stripe Webhook] Payment succeeded: ${paymentIntent.id}`,
        );

        // This is a backup handler in case checkout.session.completed doesn't fire
        if (paymentIntent.metadata?.reservation_id) {
          const supabase = getSupabaseAdmin();

          const { error: updateError } = await supabase
            .from("order_reservations")
            .update({
              status: "confirmed",
              payment_status: "paid",
            })
            .eq("payment_intent_id", paymentIntent.id);

          if (updateError) {
            console.error(
              `❌ [Stripe Webhook] Error updating reservation for payment intent ${paymentIntent.id}:`,
              updateError,
            );
          } else {
            console.log(
              `✅ [Stripe Webhook] Reservation updated for payment intent ${paymentIntent.id}`,
            );
          }
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        console.log(`❌ [Stripe Webhook] Payment failed: ${paymentIntent.id}`);

        // Mark reservation as failed
        if (paymentIntent.metadata?.reservation_id) {
          const supabase = getSupabaseAdmin();

          const { error: updateError } = await supabase
            .from("order_reservations")
            .update({
              payment_status: "failed",
            })
            .eq("payment_intent_id", paymentIntent.id);

          if (updateError) {
            console.error(
              `❌ [Stripe Webhook] Error updating failed payment for reservation:`,
              updateError,
            );
          } else {
            console.log(
              `✅ [Stripe Webhook] Reservation marked as failed for payment intent ${paymentIntent.id}`,
            );
          }
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
          `💳 [Stripe Webhook] Setup intent succeeded: ${setupIntent.id}`,
        );

        // This is for the old payment method saving system
        // We can keep this for backward compatibility but won't use it in the new flow
        console.log(
          `ℹ️ [Stripe Webhook] Setup intent succeeded but not processing (new payment flow doesn't use setup intents)`,
        );
        break;
      }

      case "setup_intent.setup_failed": {
        const setupIntent = event.data.object;
        console.log(
          `❌ [Stripe Webhook] Setup intent failed: ${setupIntent.id}`,
        );

        // Log for debugging but don't process (old system)
        console.log(
          `ℹ️ [Stripe Webhook] Setup intent failed but not processing (new payment flow doesn't use setup intents)`,
        );
        break;
      }

      default:
        console.log(`ℹ️ [Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`❌ [Stripe Webhook] Error processing webhook:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed", details: error.message },
      { status: 500 },
    );
  }
}
