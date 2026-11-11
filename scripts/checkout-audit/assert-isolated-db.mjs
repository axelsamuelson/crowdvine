#!/usr/bin/env node
/**
 * Refuse any DATABASE URL that is not a loopback ephemeral audit DB.
 * Never target abrnvjqwpdkodgrtezeg / Vercel shared / remote Supabase.
 *
 * Usage:
 *   node scripts/checkout-audit/assert-isolated-db.mjs "$CHECKOUT_AUDIT_DATABASE_URL"
 * Exit 0 only when safe; exit 2 on refusal.
 */
const PROD_REF = "abrnvjqwpdkodgrtezeg";
const raw = process.argv[2] || process.env.CHECKOUT_AUDIT_DATABASE_URL || "";

function fail(msg) {
  console.error(`[checkout-audit] REFUSED: ${msg}`);
  process.exit(2);
}

if (!raw) fail("CHECKOUT_AUDIT_DATABASE_URL is empty");

let u;
try {
  // URL() needs http scheme; postgres URLs work after rewrite
  u = new URL(raw.replace(/^postgresql:/i, "http:").replace(/^postgres:/i, "http:"));
} catch {
  fail("unparseable database URL");
}

const host = (u.hostname || "").toLowerCase();
const dbName = (u.pathname || "").replace(/^\//, "").split("?")[0];

if (host.includes(PROD_REF)) {
  fail(`hostname contains production project ref ${PROD_REF}`);
}
if (/\.supabase\.co$/i.test(host)) {
  fail(`remote Supabase host blocked (${host}) — local loopback only`);
}
if (!(host === "127.0.0.1" || host === "localhost" || host === "::1")) {
  fail(`non-loopback host blocked (${host})`);
}
if (dbName !== "crowdvine_checkout_audit") {
  fail(
    `database name must be crowdvine_checkout_audit (got "${dbName || "(empty)"}")`,
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      host,
      port: u.port || "5432",
      database: dbName,
      user: u.username || "(unset)",
      prodRefBlocked: true,
      note: "isolated local audit DB only",
    },
    null,
    2,
  ),
);
