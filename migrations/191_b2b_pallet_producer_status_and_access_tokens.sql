-- B2B pallet per-producer fulfilment status + opaque access tokens.
-- Idempotent. Does not alter b2b_pallet_shipments / b2b_pallet_shipment_items.

-- ---------------------------------------------------------------------------
-- 1. b2b_pallet_producer_status
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS b2b_pallet_producer_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES b2b_pallet_shipments(id) ON DELETE CASCADE,
  producer_id uuid NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
  order_sent_at timestamptz,
  producer_decision_status text NOT NULL DEFAULT 'pending'
    CHECK (producer_decision_status IN ('pending', 'confirmed', 'partial', 'declined')),
  producer_decided_at timestamptz,
  confirmed_quantity integer,
  pickup_date date,
  pickup_date_confirmed_at timestamptz,
  goods_ready_at timestamptz,
  delivered_to_hub_at timestamptz,
  invoice_received_at timestamptz,
  invoice_paid_at timestamptz,
  invoice_amount_cents integer,
  blocked_reason text,
  producer_note text,
  admin_note text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, producer_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_producer_status_shipment_id
  ON b2b_pallet_producer_status (shipment_id);

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_producer_status_producer_id
  ON b2b_pallet_producer_status (producer_id);

COMMENT ON TABLE b2b_pallet_producer_status IS
  'Per-producer fulfilment / invoice status for a Dirty Wine B2B pallet shipment.';

COMMENT ON COLUMN b2b_pallet_producer_status.admin_note IS
  'Internal admin-only note. Must not be exposed to producers (column GRANT excludes it).';

-- updated_at trigger (same convention as migrations/183, 178)
CREATE OR REPLACE FUNCTION set_b2b_pallet_producer_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_pallet_producer_status_updated_at
  ON b2b_pallet_producer_status;

CREATE TRIGGER trg_b2b_pallet_producer_status_updated_at
  BEFORE UPDATE ON b2b_pallet_producer_status
  FOR EACH ROW
  EXECUTE FUNCTION set_b2b_pallet_producer_status_updated_at();

-- ---------------------------------------------------------------------------
-- 2. b2b_pallet_access_tokens
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS b2b_pallet_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES b2b_pallet_shipments(id) ON DELETE CASCADE,
  producer_id uuid NOT NULL REFERENCES producers(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '180 days'),
  revoked_at timestamptz,
  last_viewed_at timestamptz,
  view_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_access_tokens_shipment_id
  ON b2b_pallet_access_tokens (shipment_id);

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_access_tokens_producer_id
  ON b2b_pallet_access_tokens (producer_id);

-- token_hash is covered by UNIQUE (token_hash) above

COMMENT ON TABLE b2b_pallet_access_tokens IS
  'Opaque hashed tokens for producer B2B pallet status links. Service role only (no producer RLS policies).';

-- ---------------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------------

ALTER TABLE b2b_pallet_producer_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE b2b_pallet_access_tokens ENABLE ROW LEVEL SECURITY;

-- Producers: SELECT own rows only. No INSERT/UPDATE/DELETE in this phase.
DROP POLICY IF EXISTS "Producers can select own b2b pallet producer status"
  ON b2b_pallet_producer_status;

CREATE POLICY "Producers can select own b2b pallet producer status"
  ON b2b_pallet_producer_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'producer'
        AND profiles.producer_id = b2b_pallet_producer_status.producer_id
    )
  );

-- b2b_pallet_access_tokens: no producer-facing policies (service role only).

-- ---------------------------------------------------------------------------
-- 4. Column privileges — exclude admin_note from producer (authenticated) reads
-- ---------------------------------------------------------------------------
-- RLS is row-level only; without this, a producer SELECT * would include admin_note.
-- Table-level SELECT is revoked; column-level SELECT is granted for everything except admin_note.

REVOKE ALL ON TABLE b2b_pallet_producer_status FROM PUBLIC;
REVOKE ALL ON TABLE b2b_pallet_producer_status FROM anon;
REVOKE ALL ON TABLE b2b_pallet_producer_status FROM authenticated;

GRANT SELECT (
  id,
  shipment_id,
  producer_id,
  order_sent_at,
  producer_decision_status,
  producer_decided_at,
  confirmed_quantity,
  pickup_date,
  pickup_date_confirmed_at,
  goods_ready_at,
  delivered_to_hub_at,
  invoice_received_at,
  invoice_paid_at,
  invoice_amount_cents,
  blocked_reason,
  producer_note,
  updated_by,
  created_at,
  updated_at
) ON b2b_pallet_producer_status TO authenticated;

REVOKE ALL ON TABLE b2b_pallet_access_tokens FROM PUBLIC;
REVOKE ALL ON TABLE b2b_pallet_access_tokens FROM anon;
REVOKE ALL ON TABLE b2b_pallet_access_tokens FROM authenticated;
