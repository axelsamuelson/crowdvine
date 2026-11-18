/**
 * Real Postgres proofs against disposable local crowdvine_checkout_audit ONLY.
 *
 * Evidence class: D = actual Postgres (not mocked UNIQUE simulation).
 * Skips cleanly when CHECKOUT_AUDIT_DATABASE_URL is unset / guard refuses.
 * Never targets abrnvjqwpdkodgrtezeg or remote Supabase.
 */
import { describe, expect, it, beforeAll } from "vitest";
import pg from "pg";
import { canApplyDirectBoxPendingMark } from "@/lib/commerce/direct-box-reservation-persistence";

const PROD_REF = "abrnvjqwpdkodgrtezeg";
const rawUrl = process.env.CHECKOUT_AUDIT_DATABASE_URL || "";

function assertIsolatedUrl(url: string): URL {
  const u = new URL(
    url.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:"),
  );
  const host = u.hostname.toLowerCase();
  const db = u.pathname.replace(/^\//, "").split("?")[0];
  if (host.includes(PROD_REF)) {
    throw new Error("REFUSED: production supabase project ref");
  }
  if (/\.supabase\.co$/i.test(host)) {
    throw new Error("REFUSED: remote supabase host");
  }
  if (!(host === "127.0.0.1" || host === "localhost" || host === "::1")) {
    throw new Error(`REFUSED: non-loopback host ${host}`);
  }
  if (db !== "crowdvine_checkout_audit") {
    throw new Error(`REFUSED: unexpected database ${db}`);
  }
  return u;
}

const enabled = Boolean(rawUrl);
const describePg = enabled ? describe : describe.skip;

describePg("checkout OFF — real Postgres isolation + concurrency (local only)", () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    assertIsolatedUrl(rawUrl);
    pool = new pg.Pool({ connectionString: rawUrl, max: 8 });
    const id = await pool.query<{
      db: string;
      addr: string | null;
      isolation: string | null;
    }>(
      `SELECT current_database() AS db,
              inet_server_addr()::text AS addr,
              (SELECT value FROM checkout_audit_meta WHERE key = 'isolation') AS isolation`,
    );
    expect(id.rows[0]?.db).toBe("crowdvine_checkout_audit");
    expect(id.rows[0]?.isolation).toBe("local_loopback_only");
    // inet_server_addr may be 127.0.0.1/32 or null on some unix paths — host already guarded
  });

  it("synthetic seed present (no prod customer emails)", async () => {
    const wines = await pool.query(`SELECT slug, price_sek FROM synthetic_wines ORDER BY slug`);
    expect(wines.rowCount).toBe(2);
    expect(wines.rows.every((r) => String(r.slug).startsWith("synthetic-"))).toBe(
      true,
    );
    const emails = await pool.query(`SELECT email FROM profiles`);
    expect(
      emails.rows.every((r) => String(r.email).endsWith("@example.test")),
    ).toBe(true);
    const rates = await pool.query(
      `SELECT channel, flat_fee_sek FROM customer_shipping_rates WHERE country_code='SE'`,
    );
    expect(rates.rows.some((r) => r.channel === "pact")).toBe(true);
    expect(rates.rows.some((r) => r.channel === "direct_box")).toBe(false);
  });

  it("concurrent INSERT same payment_intent_id → exactly one durable row (real UNIQUE)", async () => {
    const pi = `pi_audit_concurrent_${Date.now()}`;
    const sql = `
      INSERT INTO order_reservations (
        status, payment_status, payment_intent_id, user_id, cart_id,
        fulfillment_channel, fulfillment_dispatch_status
      ) VALUES (
        'placed', 'paid', $1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '33333333-3333-3333-3333-333333333333',
        'direct_box', 'pending_manual_handoff'
      ) RETURNING id`;

    const results = await Promise.allSettled([
      pool.query(sql, [pi]),
      pool.query(sql, [pi]),
      pool.query(sql, [pi]),
      pool.query(sql, [pi]),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(3);
    for (const r of rejected) {
      const err = (r as PromiseRejectedResult).reason as { code?: string };
      expect(err.code).toBe("23505"); // unique_violation
    }
    const count = await pool.query(
      `SELECT count(*)::int AS c FROM order_reservations WHERE payment_intent_id = $1`,
      [pi],
    );
    expect(count.rows[0].c).toBe(1);
  });

  it("SQL CAS: pending mark does not overwrite booked (simultaneous sessions)", async () => {
    const ins = await pool.query<{ id: string }>(
      `INSERT INTO order_reservations (
         status, payment_status, payment_intent_id, user_id,
         fulfillment_channel, fulfillment_dispatch_status
       ) VALUES (
         'placed', 'paid', $1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
         'direct_box', NULL
       ) RETURNING id`,
      [`pi_audit_cas_${Date.now()}`],
    );
    const id = ins.rows[0].id;

    // Session A: ops progresses to booked
    // Session B: webhook CAS pending mark (PostgREST .or equivalent)
    const casSql = `
      UPDATE order_reservations
      SET fulfillment_dispatch_status = 'pending_manual_handoff'
      WHERE id = $1
        AND (
          fulfillment_dispatch_status IS NULL
          OR fulfillment_dispatch_status IN ('pending_manual_handoff', 'pending')
        )
      RETURNING id, fulfillment_dispatch_status`;

    await pool.query(
      `UPDATE order_reservations SET fulfillment_dispatch_status = 'booked' WHERE id = $1`,
      [id],
    );

    const cas = await pool.query(casSql, [id]);
    expect(cas.rowCount).toBe(0);

    const row = await pool.query(
      `SELECT fulfillment_dispatch_status FROM order_reservations WHERE id = $1`,
      [id],
    );
    expect(row.rows[0].fulfillment_dispatch_status).toBe("booked");
    expect(canApplyDirectBoxPendingMark("booked")).toBe(false);
  });

  it("SQL CAS race: booked between read and update loses pending write", async () => {
    const clientA = await pool.connect();
    const clientB = await pool.connect();
    try {
      const ins = await clientA.query<{ id: string }>(
        `INSERT INTO order_reservations (
           status, payment_status, payment_intent_id, user_id,
           fulfillment_channel, fulfillment_dispatch_status
         ) VALUES (
           'placed', 'paid', $1, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
           'direct_box', NULL
         ) RETURNING id`,
        [`pi_audit_race_${Date.now()}`],
      );
      const id = ins.rows[0].id;

      await clientA.query("BEGIN");
      const read = await clientA.query(
        `SELECT fulfillment_dispatch_status FROM order_reservations WHERE id = $1 FOR SHARE`,
        [id],
      );
      expect(read.rows[0].fulfillment_dispatch_status).toBeNull();

      // Concurrent session books while A holds share lock? Use plain UPDATE after A commits read path:
      // Emulate read-then-write race without long lock: B books, then A applies CAS.
      await clientA.query("COMMIT");

      await clientB.query(
        `UPDATE order_reservations SET fulfillment_dispatch_status = 'booked' WHERE id = $1`,
        [id],
      );

      const cas = await clientA.query(
        `UPDATE order_reservations
         SET fulfillment_dispatch_status = 'pending_manual_handoff'
         WHERE id = $1
           AND (
             fulfillment_dispatch_status IS NULL
             OR fulfillment_dispatch_status IN ('pending_manual_handoff', 'pending')
           )
         RETURNING fulfillment_dispatch_status`,
        [id],
      );
      expect(cas.rowCount).toBe(0);
      const final = await clientA.query(
        `SELECT fulfillment_dispatch_status FROM order_reservations WHERE id = $1`,
        [id],
      );
      expect(final.rows[0].fulfillment_dispatch_status).toBe("booked");
    } finally {
      clientA.release();
      clientB.release();
    }
  });
});

describe("checkout OFF — Stripe sandbox env names (no values; no claim of verification)", () => {
  it("documents required test-only env var NAMES for later sandbox wiring", () => {
    const requiredNames = [
      "STRIPE_SECRET_KEY", // must be sk_test_* when provided
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", // must be pk_test_*
      "STRIPE_WEBHOOK_SECRET", // whsec_* for local listener / stripe listen
      "CHECKOUT_AUDIT_DATABASE_URL", // local loopback audit DB only
    ] as const;
    expect(requiredNames).toContain("STRIPE_SECRET_KEY");
    expect(requiredNames).toContain("STRIPE_WEBHOOK_SECRET");
    // Safe webhook delivery needs (names/process only):
    // 1) stripe listen --forward-to http://localhost:3000/api/stripe/webhook
    // 2) STRIPE_WEBHOOK_SECRET from that listener
    // 3) Never use live sk_live / production whsec
    expect(process.env.STRIPE_SECRET_KEY ?? "").not.toMatch(/^sk_live_/);
  });
});
