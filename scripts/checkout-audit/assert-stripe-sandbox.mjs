#!/usr/bin/env node
/**
 * Fail-closed Stripe sandbox identity gate for checkout assurance.
 * Never prints key material. Uses CHECKOUT_AUDIT_* Cursor secrets only.
 *
 * Exit 0: authorized WineComm-sandlåda acct + livemode false
 * Exit 2: missing / live / wrong account / API failure
 */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Stripe = require("stripe");

const AUTHORIZED_ACCOUNT = "acct_1S0puV01MNqMozNK";
const secret = process.env.CHECKOUT_AUDIT_STRIPE_TEST_KEY || "";
const publishable = process.env.CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY || "";

function fail(msg) {
  console.error(`[checkout-audit:stripe] REFUSED: ${msg}`);
  process.exit(2);
}

if (!secret) fail("CHECKOUT_AUDIT_STRIPE_TEST_KEY missing");
if (!publishable) fail("CHECKOUT_AUDIT_STRIPE_PUBLISHABLE_KEY missing");
if (secret.startsWith("sk_live_") || secret.startsWith("rk_live_")) {
  fail("live secret/restricted key prefix");
}
if (publishable.startsWith("pk_live_")) fail("live publishable key prefix");
if (!(secret.startsWith("rk_test_") || secret.startsWith("sk_test_"))) {
  fail("secret key must be rk_test_ or sk_test_");
}
if (!publishable.startsWith("pk_test_")) fail("publishable key must be pk_test_");

const stripe = new Stripe(secret, {
  apiVersion: "2025-07-30.basil",
  typescript: false,
});

const account = await stripe.accounts.retrieve();
if (account.id !== AUTHORIZED_ACCOUNT) {
  fail(`account id mismatch (expected ${AUTHORIZED_ACCOUNT})`);
}

const balance = await stripe.balance.retrieve();
if (balance.livemode !== false) {
  fail("balance.livemode is not false");
}

// Publishable: raw card tokenization from server is disabled on modern Stripe
// accounts (unsupported_publishable_key_tokenization_surface). Prove instead that
// the key is publishable (privileged endpoints require secret) + pk_test_ prefix.
// Same-account binding cannot be proven from pk alone without Elements/browser.
const balPk = await fetch("https://api.stripe.com/v1/balance", {
  headers: { Authorization: `Bearer ${publishable}` },
});
const balPkBody = await balPk.json().catch(() => ({}));
const balPkCode = balPkBody?.error?.code || null;
if (balPk.status !== 401 && balPk.status !== 403 && balPkCode !== "secret_key_required") {
  // Accept classic secret_key_required even when HTTP is 400
  if (balPkCode !== "secret_key_required") {
    fail(
      `publishable key did not behave as pk (HTTP ${balPk.status}, code=${balPkCode})`,
    );
  }
}

console.log(
  JSON.stringify(
    {
      ok: true,
      accountId: account.id,
      balanceLivemode: balance.livemode,
      secretKeyKind: secret.startsWith("rk_test_") ? "rk_test" : "sk_test",
      publishableKind: "pk_test",
      publishableSameAccountProvable: false,
      publishableTestPrefixProven: true,
      publishablePrivilegedDenied: balPkCode === "secret_key_required",
      authorizedAccount: AUTHORIZED_ACCOUNT,
      note: "pk same-sandbox account binding not feasible without Elements; secret key account gate is authoritative",
    },
    null,
    2,
  ),
);
