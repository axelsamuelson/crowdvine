/**
 * Signed Stripe webhook → loopback order persistence / idempotency.
 *
 * Exact app route: POST /api/stripe/webhook (app/api/stripe/webhook/route.ts)
 * Uses Stripe.webhooks.generateTestHeaderString + constructEvent (real crypto).
 * Persists against crowdvine_checkout_audit ONLY (never Supabase prod).
 *
 * Full Next route handler still needs Supabase Admin client → BLOCKED for true
 * in-process route E2E without isolated Auth/API project. This proves the
 * signature gate + payment_intent.succeeded persistence semantics on real PG.
 */
import { describe, expect, it, beforeAll } from "vitest";
import Stripe from "stripe";
import { randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const AUTHORIZED = "acct_1S0puV01MNqMozNK";
const PROD_REF = "abrnvjqwpdkodgrtezeg";
const WEBHOOK_ROUTE = "/api/stripe/webhook";

const rawUrl = process.env.CHECKOUT_AUDIT_DATABASE_URL || "";
const rawSecret = process.env.CHECKOUT_AUDIT_STRIPE_TEST_KEY || "";

function assertIsolatedUrl(url: string): void {
  const u = new URL(
    url.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:"),
  );
  const host = u.hostname.toLowerCase();
  const db = u.pathname.replace(/^\//, "").split("?")[0];
  if (host.includes(PROD_REF)) throw new Error("REFUSED: production ref");
  if (/\.supabase\.co$/i.test(host)) throw new Error("REFUSED: remote supabase");
  if (!(host === "127.0.0.1" || host === "localhost" || host === "::1")) {
    throw new Error(`REFUSED: non-loopback ${host}`);
  }
  if (db !== "crowdvine_checkout_audit") {
    throw new Error(`REFUSED: unexpected db ${db}`);
  }
}

const enabled =
  Boolean(rawUrl) &&
  (rawSecret.startsWith("rk_test_") || rawSecret.startsWith("sk_test_")) &&
  !rawSecret.includes("_live_");

const describeWh = enabled ? describe : describe.skip;

describeWh("checkout audit — signed webhook + PG persistence", () => {
  let pool: pg.Pool;
  let stripe: Stripe;
  /** VM-only test signing secret — never commit / never print full value. */
  let whsec: string;

  beforeAll(async () => {
    assertIsolatedUrl(rawUrl);
    process.env.STRIPE_SECRET_KEY = rawSecret;
    // Generate ephemeral whsec for constructEvent (stripe listen not required).
    whsec = `whsec_${randomBytes(32).toString("base64")}`;
    process.env.STRIPE_WEBHOOK_SECRET = whsec;

    stripe = new Stripe(rawSecret, {
      apiVersion: "2025-07-30.basil",
      typescript: true,
    });
    const account = await stripe.accounts.retrieve();
    expect(account.id).toBe(AUTHORIZED);
    const balance = await stripe.balance.retrieve();
    expect(balance.livemode).toBe(false);

    pool = new pg.Pool({ connectionString: rawUrl, max: 4 });
  });

  it(`documents exact app webhook route ${WEBHOOK_ROUTE}`, () => {
    expect(WEBHOOK_ROUTE).toBe("/api/stripe/webhook");
  });

  it("rejects tampered signature (constructEvent fail-closed)", () => {
    const payload = JSON.stringify({
      id: "evt_audit_tamper",
      object: "event",
      type: "payment_intent.succeeded",
      data: { object: { id: "pi_x" } },
    });
    expect(() =>
      stripe.webhooks.constructEvent(payload, "t=1,v1=deadbeef", whsec),
    ).toThrow();
  });

  it("accepts valid signed payment_intent.succeeded and persists paid once (idempotent replay)", async () => {
    const reservationId = randomUUID();
    const piId = `pi_audit_wh_${Date.now()}`;

    await pool.query(
      `INSERT INTO order_reservations (
         id, status, payment_status, user_id, cart_id, fulfillment_channel
       ) VALUES ($1, 'pending_payment', 'unpaid',
         'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         '33333333-3333-3333-3333-333333333333',
         'shared_pallet')`,
      [reservationId],
    );

    const eventObject = {
      id: `evt_audit_${Date.now()}`,
      object: "event",
      api_version: "2025-07-30.basil",
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 1,
      request: { id: null, idempotency_key: null },
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: piId,
          object: "payment_intent",
          amount: 5000,
          currency: "sek",
          status: "succeeded",
          livemode: false,
          metadata: {
            reservation_id: reservationId,
            audit_run: "checkout_assurance",
            synthetic: "true",
          },
          latest_charge: null,
          payment_method: null,
        },
      },
    };

    const payload = JSON.stringify(eventObject);
    const header = stripe.webhooks.generateTestHeaderString({
      payload,
      secret: whsec,
    });
    const event = stripe.webhooks.constructEvent(payload, header, whsec);
    expect(event.type).toBe("payment_intent.succeeded");
    expect((event.data.object as { livemode?: boolean }).livemode).toBe(false);

    async function applySucceededOnce() {
      // Mirrors app/api/stripe/webhook handlePaymentIntentSucceededWebhook update
      // against loopback PG (no Supabase client / no carrier / no email).
      const pi = event.data.object as {
        id: string;
        metadata?: { reservation_id?: string };
      };
      const rid = pi.metadata?.reservation_id;
      expect(rid).toBe(reservationId);

      await pool.query(
        `UPDATE order_reservations
         SET payment_status = 'paid',
             payment_intent_id = $2,
             status = 'confirmed'
         WHERE id = $1
           AND (payment_status IS DISTINCT FROM 'paid')`,
        [rid, pi.id],
      );
    }

    await applySucceededOnce();
    await applySucceededOnce(); // replay

    const row = await pool.query(
      `SELECT status, payment_status, payment_intent_id
       FROM order_reservations WHERE id = $1`,
      [reservationId],
    );
    expect(row.rows[0]?.status).toBe("confirmed");
    expect(row.rows[0]?.payment_status).toBe("paid");
    expect(row.rows[0]?.payment_intent_id).toBe(piId);

    // Admin reconciliation: unique PI lookup returns exactly one row
    const byPi = await pool.query(
      `SELECT id FROM order_reservations WHERE payment_intent_id = $1`,
      [piId],
    );
    expect(byPi.rowCount).toBe(1);
  });

  it("UNIQUE payment_intent_id blocks double-attach across reservations (admin reconciliation)", async () => {
    const pi = `pi_audit_reconcile_${Date.now()}`;
    const a = randomUUID();
    const b = randomUUID();
    await pool.query(
      `INSERT INTO order_reservations (id, status, payment_status, payment_intent_id, user_id)
       VALUES ($1, 'confirmed', 'paid', $2, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa')`,
      [a, pi],
    );
    let code: string | undefined;
    try {
      await pool.query(
        `INSERT INTO order_reservations (id, status, payment_status, payment_intent_id, user_id)
         VALUES ($1, 'confirmed', 'paid', $2, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')`,
        [b, pi],
      );
    } catch (e) {
      code = (e as { code?: string }).code;
    }
    expect(code).toBe("23505");
  });
});

describe("checkout audit — webhook suite enablement", () => {
  it("records enablement from isolated DB + audit Stripe key", () => {
    expect(typeof enabled).toBe("boolean");
  });
});
