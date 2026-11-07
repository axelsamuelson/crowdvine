#!/usr/bin/env bash
# Apply disposable fixture schema + synthetic seed to LOCAL audit Postgres only.
# Hard-refuses non-loopback / prod Supabase project refs.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEFAULT_URL='postgresql://crowdvine_audit:audit_local_only_not_prod@127.0.0.1:5432/crowdvine_checkout_audit'
URL="${CHECKOUT_AUDIT_DATABASE_URL:-$DEFAULT_URL}"

echo "[checkout-audit] asserting isolation…"
node "$ROOT/scripts/checkout-audit/assert-isolated-db.mjs" "$URL"

echo "[checkout-audit] applying fixture-schema.sql…"
psql "$URL" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/checkout-audit/fixture-schema.sql"

echo "[checkout-audit] seeding synthetic data…"
psql "$URL" -v ON_ERROR_STOP=1 -f "$ROOT/scripts/checkout-audit/seed-synthetic.sql"

echo "[checkout-audit] identity proof after write:"
psql "$URL" -v ON_ERROR_STOP=1 -c \
  "SELECT current_database(), inet_server_addr()::text, inet_server_port(),
          (SELECT value FROM checkout_audit_meta WHERE key='isolation') AS isolation,
          (SELECT count(*) FROM synthetic_wines) AS wines,
          (SELECT count(*) FROM synthetic_cart_lines) AS lines;"

echo "[checkout-audit] OK — local ephemeral DB ready (DIRECT_BOX remains OFF in app env)."
