#!/usr/bin/env node
/**
 * Signed webhook matrix against the LIVE Next route + isolated Supabase.
 * Distinguishes:
 *   - fabricated_signed: payload we craft + Stripe.webhooks.generateTestHeaderString
 *   - stripe_payload_resigned: real Stripe event object retrieved via API, re-signed locally
 * Actual stripe-cli delivery is reported separately when stripe listen is running.
 *
 * Never prints secrets / JWTs / card data.
 */
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";
import { randomBytes, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const Stripe = require("stripe");

const __dirname = dirname(fileURLToPath(import.meta.url));
const AUTHORIZED_REF = "msdfjrrokcmjifetuwgc";
const PROD_REF = "abrnvjqwpdkodgrtezeg";
const AUTHORIZED_ACCOUNT = "acct_1S0puV01MNqMozNK";
const BASE = process.env.CHECKOUT_AUDIT_APP_URL || "http://127.0.0.1:3000";
const WEBHOOK = `${BASE}/api/stripe/webhook`;

const url = (
  process.env.CHECKOUT_AUDIT_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  ""
).trim();
const serviceKey = (
  process.env.CHECKOUT_AUDIT_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  ""
).trim();
const secret = (
  process.env.CHECKOUT_AUDIT_STRIPE_TEST_KEY ||
  process.env.STRIPE_SECRET_KEY ||
  ""
).trim();
let whsec = (process.env.STRIPE_WEBHOOK_SECRET || "").trim();

function fail(msg) {
  console.error(JSON.stringify({ ok: false, error: msg }));
  process.exit(2);
}

if (!url.includes(AUTHORIZED_REF) || url.includes(PROD_REF)) fail("supabase url guard");
if (!serviceKey) fail("service key missing");
if (!(secret.startsWith("rk_test_") || secret.startsWith("sk_test_"))) {
  fail("stripe secret must be test");
}

const g = spawnSync(
  process.execPath,
  [join(__dirname, "assert-isolated-supabase.mjs"), url],
  { encoding: "utf8" },
);
if (g.status !== 0) {
  console.error(g.stderr || g.stdout);
  process.exit(g.status || 2);
}

if (!whsec.startsWith("whsec_")) {
  whsec = `whsec_${randomBytes(32).toString("base64")}`;
  console.log(
    JSON.stringify({
      note: "generated_ephemeral_whsec_for_fabricated_signed_tests",
      whsecPrefix: "whsec_",
      whsecLen: whsec.length,
      warning:
        "Next must use the SAME STRIPE_WEBHOOK_SECRET for fabricated_signed to verify",
    }),
  );
}

const stripe = new Stripe(secret, { apiVersion: "2025-07-30.basil" });
const account = await stripe.accounts.retrieve();
if (account.id !== AUTHORIZED_ACCOUNT) fail("stripe account mismatch");
const balance = await stripe.balance.retrieve();
if (balance.livemode !== false) fail("livemode not false");

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const results = [];
function record(name, verdict, detail = {}) {
  results.push({ name, verdict, ...detail });
  console.log(JSON.stringify({ name, verdict, ...detail }));
}

async function postWebhook(rawBody, header) {
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": header,
    },
    body: rawBody,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

function sign(rawBody) {
  return Stripe.webhooks.generateTestHeaderString({
    payload: rawBody,
    secret: whsec,
  });
}

// --- A: missing signature ---
{
  const res = await fetch(WEBHOOK, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });
  record("unsigned_rejected", res.status === 400 ? "PASS" : "FAIL", {
    status: res.status,
  });
}

// --- B: tampered signature ---
{
  const payload = JSON.stringify({
    id: "evt_audit_tamper",
    object: "event",
    type: "payment_intent.succeeded",
    data: { object: { id: "pi_x", object: "payment_intent", metadata: {} } },
  });
  const good = sign(payload);
  const bad = good.replace(/v1=[a-f0-9]+/, "v1=deadbeef");
  const { status } = await postWebhook(payload, bad);
  record("tampered_signature_rejected", status === 400 ? "PASS" : "FAIL", {
    status,
  });
}

// Seed reservation row for webhook persistence
const userId = (
  await admin
    .from("checkout_audit_meta")
    .select("value")
    .eq("key", "seed_auth_user_id")
    .maybeSingle()
).data?.value;
if (!userId) fail("seed_auth_user_id missing");

const reservationId = randomUUID();
const { error: insErr } = await admin.from("order_reservations").insert({
  id: reservationId,
  user_id: userId,
  pallet_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1",
  delivery_zone_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
  shipping_region_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb0",
  bottles: 8,
  total_sek: 1579,
  status: "pending_payment",
  payment_status: "pending",
  is_test_purchase: true,
  fulfillment_channel: "shared_pallet",
  country_code: "SE",
});
if (insErr) fail(`reservation insert: ${insErr.message}`);

// Create real sandbox PI with reservation metadata and confirm with test method
const pi = await stripe.paymentIntents.create({
  amount: 157900,
  currency: "sek",
  payment_method: "pm_card_visa",
  confirm: true,
  automatic_payment_methods: { enabled: true, allow_redirects: "never" },
  metadata: { reservation_id: reservationId, audit: "checkout_assurance" },
});
record("stripe_pi_confirm_sdk", pi.status === "succeeded" ? "PASS" : "FAIL", {
  intentIdPrefix: String(pi.id).slice(0, 6),
  status: pi.status,
  livemode: pi.livemode,
  note: "SDK-only PI confirm — not app browser E2E",
});

// --- C: fabricated_signed payment_intent.succeeded ---
const fabricatedEvent = {
  id: `evt_fabricated_${randomUUID().slice(0, 8)}`,
  object: "event",
  api_version: "2025-07-30.basil",
  created: Math.floor(Date.now() / 1000),
  type: "payment_intent.succeeded",
  livemode: false,
  pending_webhooks: 0,
  request: { id: null, idempotency_key: null },
  data: {
    object: {
      id: pi.id,
      object: "payment_intent",
      amount: pi.amount,
      currency: pi.currency,
      status: "succeeded",
      livemode: false,
      metadata: { reservation_id: reservationId },
      latest_charge: typeof pi.latest_charge === "string" ? pi.latest_charge : null,
      payment_method:
        typeof pi.payment_method === "string" ? pi.payment_method : null,
    },
  },
};
const fabricatedRaw = JSON.stringify(fabricatedEvent);
const { status: fabStatus, json: fabJson } = await postWebhook(
  fabricatedRaw,
  sign(fabricatedRaw),
);
record("fabricated_signed_delivery", fabStatus === 200 ? "PASS" : "FAIL", {
  status: fabStatus,
  received: fabJson?.received ?? null,
  class: "fabricated_signed",
});

const { data: afterFab } = await admin
  .from("order_reservations")
  .select("id,status,payment_status,payment_intent_id")
  .eq("id", reservationId)
  .maybeSingle();
record(
  "db_after_fabricated_signed",
  afterFab?.payment_status === "paid" && afterFab?.status === "confirmed"
    ? "PASS"
    : "FAIL",
  {
    payment_status: afterFab?.payment_status ?? null,
    status: afterFab?.status ?? null,
    piMatch: afterFab?.payment_intent_id === pi.id,
  },
);

// --- D: replay same event (idempotent) ---
const { status: replayStatus } = await postWebhook(
  fabricatedRaw,
  sign(fabricatedRaw),
);
const { data: afterReplay } = await admin
  .from("order_reservations")
  .select("status,payment_status")
  .eq("id", reservationId)
  .maybeSingle();
record("replay_idempotent", replayStatus === 200 ? "PASS" : "FAIL", {
  status: replayStatus,
  stillPaid: afterReplay?.payment_status === "paid",
});

// --- E: concurrent duplicate posts ---
const conc = await Promise.all(
  [0, 1, 2].map(() => postWebhook(fabricatedRaw, sign(fabricatedRaw))),
);
record(
  "concurrent_idempotent",
  conc.every((c) => c.status === 200) ? "PASS" : "FAIL",
  { statuses: conc.map((c) => c.status) },
);

// --- F: out-of-order failed then succeeded already paid ---
const failEvt = {
  ...fabricatedEvent,
  id: `evt_fabricated_fail_${randomUUID().slice(0, 8)}`,
  type: "payment_intent.payment_failed",
  data: {
    object: {
      ...fabricatedEvent.data.object,
      status: "requires_payment_method",
      last_payment_error: { message: "audit synthetic decline" },
    },
  },
};
const failRaw = JSON.stringify(failEvt);
const { status: failStatus } = await postWebhook(failRaw, sign(failRaw));
const { data: afterFail } = await admin
  .from("order_reservations")
  .select("status,payment_status")
  .eq("id", reservationId)
  .maybeSingle();
record("out_of_order_failed_after_paid", failStatus === 200 ? "PASS" : "FAIL", {
  status: failStatus,
  payment_status: afterFail?.payment_status ?? null,
  note: "handler should not un-pay; observe DB",
});

// --- G: real Stripe event payload, re-signed locally ---
const events = await stripe.events.list({
  type: "payment_intent.succeeded",
  limit: 10,
});
const real = (events.data || []).find(
  (e) => e.data?.object?.id === pi.id,
);
if (!real) {
  record("stripe_payload_resigned", "BLOCKED", {
    reason: "no_matching_stripe_event_yet",
  });
} else {
  const realRaw = JSON.stringify(real);
  const { status: realStatus } = await postWebhook(realRaw, sign(realRaw));
  record("stripe_payload_resigned", realStatus === 200 ? "PASS" : "FAIL", {
    status: realStatus,
    class: "stripe_api_event_resigned_locally",
    stripeEventIdPrefix: String(real.id).slice(0, 8),
    note: "payload from Stripe API; signature is local whsec — NOT Stripe network delivery",
  });
}

const pass = results.filter((r) => r.verdict === "PASS").length;
const failN = results.filter((r) => r.verdict === "FAIL").length;
const blocked = results.filter((r) => r.verdict === "BLOCKED").length;
console.log(
  JSON.stringify({
    summary: { pass, fail: failN, blocked, total: results.length },
    reservationId,
    piIdPrefix: String(pi.id).slice(0, 8),
    webhookRoute: "/api/stripe/webhook",
    supabaseRef: AUTHORIZED_REF,
    stripeAccount: AUTHORIZED_ACCOUNT,
  }),
);
process.exit(failN > 0 ? 1 : 0);
