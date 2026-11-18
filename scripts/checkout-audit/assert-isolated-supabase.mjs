#!/usr/bin/env node
/**
 * Fail-closed guard for crowdvine-checkout-audit only.
 * Refuses production abrnvjqwpdkodgrtezeg and any other project ref.
 *
 * Usage:
 *   node scripts/checkout-audit/assert-isolated-supabase.mjs [url-or-ref]
 *   CHECKOUT_AUDIT_SUPABASE_URL=… node scripts/checkout-audit/assert-isolated-supabase.mjs
 *
 * Exit 0 only when the exact authorized test ref is targeted.
 */
const AUTHORIZED_REF = "msdfjrrokcmjifetuwgc";
const PROD_REF = "abrnvjqwpdkodgrtezeg";

const raw =
  process.argv[2] ||
  process.env.CHECKOUT_AUDIT_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

function fail(msg) {
  console.error(`[checkout-audit:supabase] REFUSED: ${msg}`);
  process.exit(2);
}

if (!raw) {
  fail(
    "no URL/ref provided (pass argv or set CHECKOUT_AUDIT_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL)",
  );
}

const lower = String(raw).toLowerCase();
if (lower.includes(PROD_REF)) {
  fail(`production project ref ${PROD_REF} is forbidden`);
}

let ref = "";
if (/^[a-z0-9]{20}$/i.test(raw.trim())) {
  ref = raw.trim().toLowerCase();
} else {
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.co$/i);
    if (!m) fail(`unrecognized supabase host (${host})`);
    ref = m[1].toLowerCase();
  } catch {
    fail("unparseable supabase URL/ref");
  }
}

if (ref === PROD_REF) fail(`production project ref ${PROD_REF} is forbidden`);
if (ref !== AUTHORIZED_REF) {
  fail(
    `project ref must be exactly ${AUTHORIZED_REF} (got "${ref}") — crowdvine-checkout-audit only`,
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      projectRef: ref,
      projectUrl: `https://${AUTHORIZED_REF}.supabase.co`,
      name: "crowdvine-checkout-audit",
      prodRefForbidden: PROD_REF,
      note: "isolated checkout-audit Supabase only",
    },
    null,
    2,
  ),
);
