import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { resolvePaymentMethodDetailsFromId } from "@/lib/stripe/resolve-payment-method-details";
import {
  confirmInstabeePacking,
  createInstabeeOrder,
} from "@/lib/instabee/home-delivery";
import { sendLabelsEmail } from "@/lib/email/instabee-labels";

function paymentIntentLatestChargeId(
  paymentIntent: Stripe.PaymentIntent,
): string | null {
  const lc = paymentIntent.latest_charge;
  if (typeof lc === "string" && lc.length > 0) return lc;
  if (lc && typeof lc === "object" && "id" in lc) {
    const id = (lc as Stripe.Charge).id;
    return typeof id === "string" && id.length > 0 ? id : null;
  }
  return null;
}

/** Present on some issuer errors; not always in TS unions. */
function stripeNetworkAdviceCodeFromPaymentError(
  err: Stripe.PaymentIntent.LastPaymentError | null | undefined,
): string | null {
  if (!err || typeof err !== "object") return null;
  if (
    "network_advice_code" in err &&
    typeof (err as { network_advice_code?: string }).network_advice_code ===
      "string"
  ) {
    const v = (err as { network_advice_code: string }).network_advice_code;
    return v.length > 0 ? v : null;
  }
  return null;
}

function cardBrandLast4FromLastPaymentError(
  err: Stripe.PaymentIntent.LastPaymentError | undefined,
): { last4: string | null; brand: string | null } {
  const pm = err?.payment_method;
  if (!pm || typeof pm === "string") {
    return { last4: null, brand: null };
  }
  const card = pm.card;
  if (!card) return { last4: null, brand: null };
  return {
    last4: typeof card.last4 === "string" ? card.last4 : null,
    brand: typeof card.brand === "string" ? card.brand : null,
  };
}

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
  const chargeId = paymentIntentLatestChargeId(paymentIntent);

  const pmId =
    typeof paymentIntent.payment_method === "string"
      ? paymentIntent.payment_method
      : null;
  const paymentMethodDetails = pmId
    ? await resolvePaymentMethodDetailsFromId(pmId)
    : {
        payment_method_type: null,
        payment_method_brand: null,
        payment_method_last4: null,
      };

  const { error: updateError } = await supabase
    .from("order_reservations")
    .update({
      payment_status: "paid",
      payment_intent_id: paymentIntent.id,
      status: "confirmed",
      ...(chargeId ? { charge_id: chargeId } : {}),
      ...(paymentMethodDetails.payment_method_type
        ? { payment_method_type: paymentMethodDetails.payment_method_type }
        : {}),
      ...(paymentMethodDetails.payment_method_brand
        ? { payment_method_brand: paymentMethodDetails.payment_method_brand }
        : {}),
      ...(paymentMethodDetails.payment_method_last4
        ? { payment_method_last4: paymentMethodDetails.payment_method_last4 }
        : {}),
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

  // Instabee — triggas garanterat efter bekräftad betalning
  if (process.env.INSTABEE_AUTO_CREATE_ORDERS === "true") {
    try {
      const palletIdFromMeta = paymentIntent.metadata?.pallet_id;

      // Hämta adress för denna reservation
      const sbAdmin = getSupabaseAdmin();
      const { data: resData } = await sbAdmin
        .from("order_reservations")
        .select(
          `
          id,
          bottles,
          total_sek,
          producer_id,
          user_addresses!inner (
            full_name,
            email,
            phone,
            address_street,
            address_postcode,
            address_city,
            country_code
          )
        `,
        )
        .eq("id", reservationId)
        .maybeSingle();

      if (resData) {
        const addrRaw = resData.user_addresses;
        const addr = Array.isArray(addrRaw) ? addrRaw[0] : addrRaw;
        if (addr) {
          const bottles = Number(resData.bottles) || 0;
          const orderParams = {
            orderId: String(resData.id),
            recipientName: String(addr.full_name ?? ""),
            recipientEmail: String(addr.email ?? ""),
            recipientPhone: String(addr.phone ?? ""),
            street: String(addr.address_street ?? ""),
            postalCode: String(addr.address_postcode ?? ""),
            city: String(addr.address_city ?? ""),
            countryCode: String(addr.country_code ?? "SE"),
            totalBottles: bottles,
          };

          // Post Purchase
          await createInstabeeOrder(orderParams);

          // Post Packing — generera fraktsedel
          const packing = await confirmInstabeePacking({
            ...orderParams,
            totalWeightGram: bottles * 1500,
          });

          if (packing) {
            // Spara label på reservationen
            await sbAdmin
              .from("order_reservations")
              .update({
                instabee_parcel_id: packing.parcelId,
                instabee_label_url: packing.labelUrl,
                instabee_tracking_url: packing.trackingUrl,
                instabee_label_created_at: new Date().toISOString(),
              })
              .eq("id", resData.id);

            // Skicka label-mail till producent
            if (packing.labelUrl && resData.producer_id) {
              const { data: producerProfile } = await sbAdmin
                .from("profiles")
                .select("email")
                .eq("producer_id", resData.producer_id)
                .eq("role", "producer")
                .maybeSingle();

              const { data: producer } = await sbAdmin
                .from("producers")
                .select("name")
                .eq("id", resData.producer_id)
                .maybeSingle();

              if (producerProfile?.email) {
                await sendLabelsEmail({
                  producerEmail: producerProfile.email,
                  producerName: producer?.name ?? "Producent",
                  palletId: palletIdFromMeta ?? String(resData.id),
                  labels: [
                    {
                      reservationId: String(resData.id),
                      recipientName: String(addr.full_name ?? ""),
                      bottles,
                      labelUrl: packing.labelUrl,
                    },
                  ],
                });
              }
            }
          }
        }
      }
    } catch (instabeeErr) {
      console.error(
        "[Instabee] Webhook handler failed for reservation:",
        reservationId,
        instabeeErr,
      );
      // Logga men kasta inte — betalningen är bekräftad
    }
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
  const err = paymentIntent.last_payment_error;
  const reason = err?.message ?? "Payment failed";
  const chargeId = paymentIntentLatestChargeId(paymentIntent);
  const { last4: pmLast4, brand: pmBrand } =
    cardBrandLast4FromLastPaymentError(err ?? undefined);
  const networkAdvice = stripeNetworkAdviceCodeFromPaymentError(err);

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
  const declineCode =
    typeof err?.decline_code === "string" ? err.decline_code.trim() : "";
  const isAuthenticationRequired =
    declineCode === "authentication_required" ||
    err?.code === "authentication_required";

  const { error: updateError } = await supabase
    .from("order_reservations")
    .update({
      payment_status: "failed",
      payment_failed_reason: reason.slice(0, 2000),
      payment_attempts: nextAttempts,
      payment_last_attempt_at: new Date().toISOString(),
      payment_intent_id: paymentIntent.id,
      ...(chargeId ? { charge_id: chargeId } : {}),
      stripe_decline_code: err?.decline_code ?? null,
      stripe_failure_code: err?.code ?? null,
      stripe_error_type: err?.type ?? null,
      stripe_network_advice_code: networkAdvice,
      payment_method_last4: pmLast4,
      payment_method_brand: pmBrand,
      ...(isAuthenticationRequired ? { retry_scheduled_at: null } : {}),
    })
    .eq("id", reservationId);

  if (updateError) {
    console.error(
      `[Stripe Webhook] reservation_id=${reservationId} failed to persist payment_failed:`,
      updateError,
    );
    return;
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

  if (!isAuthenticationRequired) {
    const { schedulePaymentRetry } = await import("@/lib/payment-retry");
    try {
      await schedulePaymentRetry(reservationId, nextAttempts);
    } catch (e) {
      console.error(
        `[Stripe Webhook] reservation_id=${reservationId} schedulePaymentRetry:`,
        e,
      );
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
  } else {
    const { sendPaymentAuthenticationRequiredEmail } = await import(
      "@/lib/sendgrid-service"
    );
    const { getAppUrl } = await import("@/lib/app-url");
    const authenticateUrl = `${getAppUrl().replace(/\/$/, "")}/reservations/${encodeURIComponent(reservationId)}/authenticate`;
    if (toEmail) {
      const sent = await sendPaymentAuthenticationRequiredEmail({
        to: toEmail,
        reservationId,
        authenticateUrl,
      });
      if (!sent) {
        console.warn(
          `[Stripe Webhook] reservation_id=${reservationId} authentication-required email not sent`,
        );
      }
    } else {
      console.warn(
        `[Stripe Webhook] reservation_id=${reservationId} no profile email for authentication recovery`,
      );
    }
  }
}

async function handleSetupIntentSetupFailedWebhook(
  setupIntent: Stripe.SetupIntent,
): Promise<void> {
  try {
    const sbAdmin = getSupabaseAdmin();
    const err = setupIntent.last_setup_error;
    const userIdRaw = setupIntent.metadata?.user_id;
    const palletIdRaw = setupIntent.metadata?.pallet_id;
    const userId =
      typeof userIdRaw === "string" && userIdRaw.trim() !== ""
        ? userIdRaw.trim()
        : null;
    const palletId =
      typeof palletIdRaw === "string" && palletIdRaw.trim() !== ""
        ? palletIdRaw.trim()
        : null;

    const reason = (err?.message ?? "Setup failed").slice(0, 2000);

    const { data: existing, error: findErr } = await sbAdmin
      .from("order_reservations")
      .select("id, payment_attempts")
      .eq("setup_intent_id", setupIntent.id)
      .maybeSingle();

    if (findErr) {
      console.error("[WEBHOOK] setup_intent.setup_failed lookup:", findErr);
    }

    if (existing?.id) {
      const nextAttempts = (existing.payment_attempts ?? 0) + 1;
      const { error: upErr } = await sbAdmin
        .from("order_reservations")
        .update({
          payment_status: "failed",
          payment_attempts: nextAttempts,
          payment_last_attempt_at: new Date().toISOString(),
          payment_failed_reason: reason,
          stripe_decline_code: err?.decline_code ?? null,
          stripe_failure_code: err?.code ?? null,
          stripe_error_type: err?.type ?? null,
        })
        .eq("id", existing.id);
      if (upErr) {
        console.error("[WEBHOOK] setup_intent.setup_failed update:", upErr);
      }
    } else if (userId && palletId) {
      const { error: insErr } = await sbAdmin.from("order_reservations").insert({
        user_id: userId,
        pallet_id: palletId,
        setup_intent_id: setupIntent.id,
        payment_mode: "setup_intent",
        payment_status: "failed",
        status: "cancelled",
        cancellation_reason: "Payment setup failed before order was placed",
        cancelled_at: new Date().toISOString(),
        payment_failed_reason: reason,
        stripe_decline_code: err?.decline_code ?? null,
        stripe_failure_code: err?.code ?? null,
        stripe_error_type: err?.type ?? null,
        payment_attempts: 1,
        payment_last_attempt_at: new Date().toISOString(),
      });
      if (insErr) {
        console.error("[WEBHOOK] setup_intent.setup_failed insert:", insErr);
      }
    } else {
      console.log(
        "[WEBHOOK] setup_intent.setup_failed: no reservation row and missing user_id/pallet_id metadata; not persisting",
        { setupIntentId: setupIntent.id, userId, palletId },
      );
    }

    console.log("[WEBHOOK] setup_intent.setup_failed handled", {
      setupIntentId: setupIntent.id,
      userId,
      declineCode: err?.decline_code,
      code: err?.code,
      message: err?.message,
    });
  } catch (e) {
    console.error("[WEBHOOK] setup_intent.setup_failed handler error:", e);
  }
}

async function handleChargeFailedWebhook(charge: Stripe.Charge): Promise<void> {
  try {
    const reservationIdRaw = charge.metadata?.reservation_id;
    if (!reservationIdRaw || typeof reservationIdRaw !== "string") {
      console.log(
        "[WEBHOOK] charge.failed: no reservation_id in metadata, skipping DB update",
      );
      return;
    }
    const reservationId = reservationIdRaw.trim();
    const sbAdmin = getSupabaseAdmin();
    const outcome = charge.outcome;
    const sellerMessage =
      outcome && typeof outcome.seller_message === "string"
        ? outcome.seller_message
        : null;
    const rawRisk = outcome?.risk_score;
    const stripeRiskScore =
      typeof rawRisk === "number" && Number.isFinite(rawRisk)
        ? Math.round(rawRisk)
        : null;
    const card = charge.payment_method_details?.card;
    const last4 =
      card && typeof card.last4 === "string" ? card.last4 : null;
    const brand =
      card && typeof card.brand === "string" ? card.brand : null;

    const { error: upErr } = await sbAdmin
      .from("order_reservations")
      .update({
        charge_id: charge.id,
        stripe_decline_code: charge.failure_code ?? null,
        stripe_failure_code: charge.failure_code ?? null,
        stripe_outcome_seller_message: sellerMessage,
        stripe_risk_score: stripeRiskScore,
        payment_method_last4: last4,
        payment_method_brand: brand,
      })
      .eq("id", reservationId);

    if (upErr) {
      console.error("[WEBHOOK] charge.failed update:", upErr);
      return;
    }

    console.log("[WEBHOOK] charge.failed saved", {
      chargeId: charge.id,
      reservationId,
      failureCode: charge.failure_code,
      declineCode: charge.failure_code,
    });
  } catch (e) {
    console.error("[WEBHOOK] charge.failed handler error:", e);
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
        const setupIntent = event.data.object as Stripe.SetupIntent;
        const err = setupIntent.last_setup_error;
        const reason =
          err?.message ||
          (typeof err?.code === "string" ? `code=${err.code}` : null) ||
          "unknown";
        console.log(
          `❌ [Stripe Webhook] setup_intent.setup_failed: ${setupIntent.id} status=${setupIntent.status} reason=${reason}`,
        );
        if (err) {
          console.log(
            "[Stripe Webhook] setup_failed last_setup_error:",
            JSON.stringify(
              {
                type: err.type,
                code: err.code,
                decline_code: err.decline_code,
                message: err.message,
                param: err.param,
              },
              null,
              2,
            ),
          );
        }
        try {
          await handleSetupIntentSetupFailedWebhook(setupIntent);
        } catch (e) {
          console.error(
            `[Stripe Webhook] setup_intent.setup_failed outer error si=${setupIntent.id}:`,
            e,
          );
        }
        break;
      }

      case "charge.failed": {
        const charge = event.data.object as Stripe.Charge;
        try {
          await handleChargeFailedWebhook(charge);
        } catch (e) {
          console.error(
            `[Stripe Webhook] charge.failed handler error ch=${charge.id}:`,
            e,
          );
        }
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
          const { error: membershipsErr } = await supabase
            .from("user_memberships")
            .update({ stripe_customer_id: null })
            .eq("stripe_customer_id", customerId);
          if (membershipsErr) {
            console.error(
              `❌ [Stripe Webhook] Failed to null out user_memberships.stripe_customer_id for ${customerId}:`,
              membershipsErr,
            );
          }
          const { error: profilesErr } = await supabase
            .from("profiles")
            .update({ stripe_customer_id: null })
            .eq("stripe_customer_id", customerId);
          if (profilesErr) {
            console.error(
              `❌ [Stripe Webhook] Failed to null out profiles.stripe_customer_id for ${customerId}:`,
              profilesErr,
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
