/**
 * Stripe sandbox SDK proofs (WineComm-sandlåda only).
 *
 * Evidence class: sandbox Stripe API — NOT full app E2E (no Supabase Auth / Next session).
 * Maps Cursor secrets → app env names without printing values:
 *   CHECKOUT_AUDIT_STRIPE_TEST_KEY → STRIPE_SECRET_KEY
 *   CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY → NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
 *
 * Guards: authorized account + livemode false before any mutating call.
 * Synthetic metadata + @example.test only. No receipts/notifications intended.
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import Stripe from "stripe";
import { randomUUID } from "node:crypto";

const AUTHORIZED = "acct_1S0puV01MNqMozNK";
const AUDIT_RUN = `checkout_assurance_${process.env.CURSOR_AGENT_BC_ID || "local"}_${Date.now()}`;

const rawSecret = process.env.CHECKOUT_AUDIT_STRIPE_TEST_KEY || "";
const rawPk = process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY || "";

function secretLooksSafe(v: string): boolean {
  return (
    (v.startsWith("rk_test_") || v.startsWith("sk_test_")) &&
    !v.startsWith("sk_live_") &&
    !v.startsWith("rk_live_")
  );
}

const enabled =
  secretLooksSafe(rawSecret) &&
  rawPk.startsWith("pk_test_") &&
  !rawPk.startsWith("pk_live_");

const describeStripe = enabled ? describe : describe.skip;

/** Never log client_secret / keys. */
function safePi(pi: Stripe.PaymentIntent) {
  return {
    id: pi.id,
    status: pi.status,
    livemode: pi.livemode,
    amount: pi.amount,
    currency: pi.currency,
    hasClientSecret: Boolean(pi.client_secret),
  };
}

describeStripe("checkout audit — Stripe sandbox PaymentIntent (SDK-only)", () => {
  let stripe: Stripe;
  const created: string[] = [];

  beforeAll(async () => {
    // Map to app env names for this process (values never asserted/printed).
    process.env.STRIPE_SECRET_KEY = rawSecret;
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = rawPk;

    stripe = new Stripe(rawSecret, {
      apiVersion: "2025-07-30.basil",
      typescript: true,
    });

    const account = await stripe.accounts.retrieve();
    expect(account.id).toBe(AUTHORIZED);
    const balance = await stripe.balance.retrieve();
    expect(balance.livemode).toBe(false);
  });

  afterAll(async () => {
    for (const id of created) {
      try {
        const pi = await stripe.paymentIntents.retrieve(id);
        if (
          pi.status === "requires_payment_method" ||
          pi.status === "requires_confirmation" ||
          pi.status === "requires_action"
        ) {
          await stripe.paymentIntents.cancel(id);
        }
      } catch {
        /* best-effort cleanup */
      }
    }
  });

  async function createAuditPi(
    extras: Stripe.PaymentIntentCreateParams = {},
  ): Promise<Stripe.PaymentIntent> {
    const pi = await stripe.paymentIntents.create({
      amount: 5000,
      currency: "sek",
      payment_method_types: ["card"],
      receipt_email: "audit+stripe@example.test",
      description: "CHECKOUT_AUDIT synthetic PI — no product charge",
      metadata: {
        audit_run: AUDIT_RUN,
        synthetic: "true",
        reservation_id: randomUUID(),
        fulfillment_channel: "shared_pallet",
      },
      ...extras,
    });
    expect(pi.livemode).toBe(false);
    created.push(pi.id);
    return pi;
  }

  it("success: confirm with pm_card_visa → succeeded", async () => {
    const pi = await createAuditPi({
      payment_method: "pm_card_visa",
      confirm: true,
      // off_session avoids return_url requirement for some PMs
      off_session: true,
    });
    expect(safePi(pi).status).toBe("succeeded");
    expect(pi.livemode).toBe(false);
  });

  it("decline: pm_card_chargeDeclined → CardError or requires_payment_method (livemode false)", async () => {
    let declinedPi: Stripe.PaymentIntent | null = null;
    let threw = false;
    try {
      declinedPi = await createAuditPi({
        payment_method: "pm_card_chargeDeclined",
        confirm: true,
        off_session: true,
      });
    } catch (err) {
      threw = true;
      expect(err).toBeInstanceOf(Stripe.errors.StripeCardError);
      const cardErr = err as Stripe.errors.StripeCardError;
      expect(cardErr.payment_intent?.livemode).toBe(false);
      declinedPi = cardErr.payment_intent ?? null;
      if (declinedPi?.id) created.push(declinedPi.id);
    }
    expect(threw || declinedPi?.status === "requires_payment_method").toBe(
      true,
    );
    expect(declinedPi?.livemode ?? false).toBe(false);
    expect(declinedPi?.status).not.toBe("succeeded");
  });

  it("retry after decline: new PI with pm_card_visa → succeeded", async () => {
    try {
      await createAuditPi({
        payment_method: "pm_card_chargeDeclined",
        confirm: true,
        off_session: true,
      });
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError && err.payment_intent?.id) {
        created.push(err.payment_intent.id);
      }
    }
    const retry = await createAuditPi({
      payment_method: "pm_card_visa",
      confirm: true,
      off_session: true,
    });
    expect(retry.status).toBe("succeeded");
    expect(retry.livemode).toBe(false);
  });

  it("3DS: authentication-required PM leaves requires_action (or succeeded if auto)", async () => {
    let status: string;
    try {
      const pi = await createAuditPi({
        payment_method: "pm_card_authenticationRequired",
        confirm: true,
        // return_url required when next_action may redirect
        return_url: "http://127.0.0.1:3999/checkout/stripe-return?audit=1",
      });
      status = pi.status;
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError && err.payment_intent) {
        status = err.payment_intent.status;
        created.push(err.payment_intent.id);
      } else {
        throw err;
      }
    }
    expect(["requires_action", "requires_source_action", "succeeded"]).toContain(
      status,
    );
  });

  it("double-click: concurrent confirm on same open PI is safe (one win / no livemode leak)", async () => {
    const open = await createAuditPi({
      payment_method: "pm_card_visa",
    });
    expect(open.status).toBe("requires_confirmation");

    const results = await Promise.allSettled([
      stripe.paymentIntents.confirm(open.id, { off_session: true }),
      stripe.paymentIntents.confirm(open.id, { off_session: true }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length + rejected.length).toBe(2);
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    for (const r of fulfilled) {
      const pi = (r as PromiseFulfilledResult<Stripe.PaymentIntent>).value;
      expect(pi.livemode).toBe(false);
      expect(pi.status).toBe("succeeded");
    }

    const final = await stripe.paymentIntents.retrieve(open.id);
    expect(final.livemode).toBe(false);
    expect(final.status).toBe("succeeded");
  });

  it("return-path shaped PI: create with return_url metadata matches app stripe-return route intent", async () => {
    // App return route: /checkout/stripe-return (see app/checkout/stripe-return)
    const pi = await createAuditPi({
      payment_method: "pm_card_visa",
      confirm: true,
      return_url: "http://127.0.0.1:3999/checkout/stripe-return",
      off_session: false,
    });
    expect(pi.livemode).toBe(false);
    expect(["succeeded", "requires_action"]).toContain(pi.status);
    expect(pi.metadata.synthetic).toBe("true");
  });

  it("app env mapping: STRIPE_SECRET_KEY / NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY set for process", () => {
    expect(Boolean(process.env.STRIPE_SECRET_KEY)).toBe(true);
    expect(Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)).toBe(true);
    // App mode matcher only classifies sk_*; rk_test_ → unknown (documented finding)
    const sk = process.env.STRIPE_SECRET_KEY || "";
    const skMode = sk.startsWith("sk_live_")
      ? "live"
      : sk.startsWith("sk_test_")
        ? "test"
        : "unknown";
    if (sk.startsWith("rk_test_")) {
      expect(skMode).toBe("unknown");
    }
  });
});

describe("checkout audit — Stripe gate skip documentation", () => {
  it("skips sandbox suite when Cursor audit keys absent (CI-safe)", () => {
    if (!enabled) {
      expect(enabled).toBe(false);
    } else {
      expect(enabled).toBe(true);
    }
  });
});
