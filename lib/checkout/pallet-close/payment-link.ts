/**
 * Create a Stripe Checkout payment link for failed off-session close charges.
 * 3-day pay window is tracked on the reservation (offsession_pay_by).
 */

import { stripe } from "@/lib/stripe";
import { getAppUrl } from "@/lib/app-url";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function createPalletClosePaymentLink(opts: {
  reservationId: string;
  amountOre: number;
  customerEmail?: string | null;
  palletId?: string | null;
  palletName?: string | null;
}): Promise<{ ok: true; url: string; sessionId: string } | { ok: false; reason: string }> {
  if (!stripe) {
    return { ok: false, reason: "stripe_unavailable" };
  }
  const amount = Math.round(Number(opts.amountOre) || 0);
  if (amount <= 0) {
    return { ok: false, reason: "invalid_amount" };
  }

  const baseUrl = getAppUrl().replace(/\/$/, "");
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      ...(opts.customerEmail ? { customer_email: opts.customerEmail } : {}),
      line_items: [
        {
          price_data: {
            currency: "sek",
            product_data: {
              name: opts.palletName
                ? `PACT — ${opts.palletName}`
                : "PACT — order payment",
              description: `Order ${opts.reservationId}`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/checkout/success?reservation_id=${encodeURIComponent(opts.reservationId)}`,
      cancel_url: `${baseUrl}/profile/reservations`,
      metadata: {
        reservation_id: opts.reservationId,
        pallet_id: opts.palletId || "",
        pallet_close_pay_link: "1",
      },
      payment_method_types: ["card"],
      expires_at: Math.floor(Date.now() / 1000) + 3 * 24 * 60 * 60,
    },
    {
      idempotencyKey: `pallet_close_pay_link:${opts.reservationId}`,
    },
  );

  if (!session.url) {
    return { ok: false, reason: "missing_session_url" };
  }

  const sb = getSupabaseAdmin();
  await sb
    .from("order_reservations")
    .update({
      offsession_payment_link_url: session.url,
      payment_link: session.url,
    })
    .eq("id", opts.reservationId);

  return { ok: true, url: session.url, sessionId: session.id };
}
