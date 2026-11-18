#!/usr/bin/env node
/**
 * Create a confirmed synthetic Auth user on crowdvine-checkout-audit ONLY.
 * Uses Supabase Admin API (service role). No email/SMS.
 *
 * Required env (never printed):
 *   NEXT_PUBLIC_SUPABASE_URL or CHECKOUT_AUDIT_SUPABASE_URL
 *     → must be https://msdfjrrokcmjifetuwgc.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY or CHECKOUT_AUDIT_SUPABASE_SERVICE_ROLE_KEY
 *   CHECKOUT_AUDIT_TEST_USER_PASSWORD  (parent-supplied; never logged)
 *
 * Optional:
 *   CHECKOUT_AUDIT_TEST_USER_EMAIL (default: synthetic.member@example.test)
 *
 * Also upserts profiles + zone address + 8-bottle cart for the user.
 */
import { createClient } from "@supabase/supabase-js";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const AUTHORIZED_REF = "msdfjrrokcmjifetuwgc";
const PROD_REF = "abrnvjqwpdkodgrtezeg";
const DEFAULT_EMAIL = "synthetic.member@example.test";

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
const password = (process.env.CHECKOUT_AUDIT_TEST_USER_PASSWORD || "").trim();
const email = (
  process.env.CHECKOUT_AUDIT_TEST_USER_EMAIL || DEFAULT_EMAIL
)
  .trim()
  .toLowerCase();

function fail(msg) {
  console.error(`[checkout-audit:auth] REFUSED: ${msg}`);
  process.exit(2);
}

if (!url) fail("Supabase URL missing");
if (url.toLowerCase().includes(PROD_REF)) fail("production ref forbidden");
if (!url.includes(AUTHORIZED_REF)) {
  fail(`URL must target ${AUTHORIZED_REF}`);
}
if (!serviceKey) fail("service role key missing (set SUPABASE_SERVICE_ROLE_KEY)");
if (!password) {
  fail(
    "CHECKOUT_AUDIT_TEST_USER_PASSWORD missing (parent must set via Cursor Runtime Secrets; never commit)",
  );
}
if (!email.endsWith("@example.test")) {
  fail("test email must use @example.test");
}

// Run URL guard as subprocess for shared assert
const assertPath = join(__dirname, "assert-isolated-supabase.mjs");
const g = spawnSync(process.execPath, [assertPath, url], { encoding: "utf8" });
if (g.status !== 0) {
  console.error(g.stderr || g.stdout);
  process.exit(g.status || 2);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const GEO = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1";
const WINE_A = "dddddddd-dddd-dddd-dddd-ddddddddddd1";
const WINE_B = "dddddddd-dddd-dddd-dddd-ddddddddddd2";

const { data: listed, error: listErr } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listErr) fail(`listUsers failed: ${listErr.message}`);

let user = (listed?.users || []).find(
  (u) => (u.email || "").toLowerCase() === email,
);

if (!user) {
  const { data: created, error: createErr } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { synthetic: true, audit: "checkout_assurance" },
    });
  if (createErr) fail(`createUser failed: ${createErr.message}`);
  user = created.user;
  console.log(
    JSON.stringify({
      ok: true,
      action: "created",
      userId: user.id,
      email,
      emailConfirmed: true,
      note: "password not logged",
    }),
  );
} else {
  console.log(
    JSON.stringify({
      ok: true,
      action: "exists",
      userId: user.id,
      email,
      note: "password not logged; not rotated",
    }),
  );
}

const userId = user.id;

const { error: profErr } = await admin.from("profiles").upsert(
  {
    id: userId,
    email,
    full_name: "Synthetic Member",
    phone: "+46700000002",
    role: "user",
    roles: ["user"],
    country: "SE",
    city: "Stockholm",
    postal_code: "11122",
    date_of_birth: "1990-01-15",
    access_granted_at: new Date().toISOString(),
  },
  { onConflict: "id" },
);
if (profErr) fail(`profiles upsert: ${profErr.message}`);

const { error: prefErr } = await admin.from("user_zone_preferences").upsert(
  {
    user_id: userId,
    active_geo_zone_id: GEO,
  },
  { onConflict: "user_id" },
);
if (prefErr) fail(`user_zone_preferences: ${prefErr.message}`);

const { error: addrErr } = await admin.from("user_zone_addresses").upsert(
  {
    user_id: userId,
    geo_zone_id: GEO,
    full_name: "Synthetic Member",
    phone: "+46700000002",
    email,
    address_line1: "Testgatan 1",
    city: "Stockholm",
    postal_code: "11122",
    country_code: "SE",
    is_default_for_zone: true,
  },
  { onConflict: "user_id,geo_zone_id" },
);
if (addrErr) fail(`user_zone_addresses: ${addrErr.message}`);

const sessionId = `audit-session-${userId.slice(0, 8)}`;
const { data: cartRow, error: cartErr } = await admin
  .from("carts")
  .upsert(
    { session_id: sessionId, user_id: userId, updated_at: new Date().toISOString() },
    { onConflict: "session_id" },
  )
  .select("id")
  .maybeSingle();
if (cartErr) fail(`carts upsert: ${cartErr.message}`);

const cartId = cartRow?.id;
if (!cartId) fail("cart id missing after upsert");

await admin.from("cart_items").delete().eq("cart_id", cartId);
const { error: linesErr } = await admin.from("cart_items").insert([
  { cart_id: cartId, wine_id: WINE_A, quantity: 6, source: "producer" },
  { cart_id: cartId, wine_id: WINE_B, quantity: 2, source: "producer" },
]);
if (linesErr) fail(`cart_items: ${linesErr.message}`);

await admin.from("checkout_audit_meta").upsert(
  [
    { key: "seed_auth_user_id", value: userId },
    { key: "seed_auth_email", value: email },
    { key: "seed_cart_id", value: cartId },
    { key: "seed_cart_session_id", value: sessionId },
    { key: "seed_member_at", value: new Date().toISOString() },
  ],
  { onConflict: "key" },
);

console.log(
  JSON.stringify({
    ok: true,
    profile: true,
    zoneAddress: true,
    cartId,
    sessionId,
    bottles: 8,
    palletId: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1",
    next: "Map app env trio + Stripe audit keys; run Next checkout against this user",
  }),
);
