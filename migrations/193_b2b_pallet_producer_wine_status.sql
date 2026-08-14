-- Per-wine confirm/reject decisions for B2B pallet producer fulfilment.
-- Idempotent. Rolls up into b2b_pallet_producer_status at the API layer.

CREATE TABLE IF NOT EXISTS b2b_pallet_producer_wine_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id uuid NOT NULL REFERENCES b2b_pallet_shipments(id) ON DELETE CASCADE,
  producer_id uuid NOT NULL REFERENCES producers(id) ON DELETE RESTRICT,
  wine_id uuid NOT NULL REFERENCES wines(id) ON DELETE RESTRICT,
  decision_status text NOT NULL DEFAULT 'pending'
    CHECK (decision_status IN ('pending', 'confirmed', 'declined')),
  confirmed_quantity integer,
  reject_reason text,
  decided_at timestamptz,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, wine_id)
);

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_producer_wine_status_shipment
  ON b2b_pallet_producer_wine_status (shipment_id);

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_producer_wine_status_producer
  ON b2b_pallet_producer_wine_status (producer_id);

COMMENT ON TABLE b2b_pallet_producer_wine_status IS
  'Per-wine confirm/reject for a producer on a Dirty Wine B2B pallet shipment.';

COMMENT ON COLUMN b2b_pallet_producer_wine_status.reject_reason IS
  'Required when decision_status is declined — why this wine cannot be fulfilled.';

CREATE OR REPLACE FUNCTION set_b2b_pallet_producer_wine_status_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_pallet_producer_wine_status_updated_at
  ON b2b_pallet_producer_wine_status;

CREATE TRIGGER trg_b2b_pallet_producer_wine_status_updated_at
  BEFORE UPDATE ON b2b_pallet_producer_wine_status
  FOR EACH ROW
  EXECUTE FUNCTION set_b2b_pallet_producer_wine_status_updated_at();

ALTER TABLE b2b_pallet_producer_wine_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Producers can select own b2b pallet wine status"
  ON b2b_pallet_producer_wine_status;

CREATE POLICY "Producers can select own b2b pallet wine status"
  ON b2b_pallet_producer_wine_status
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'producer'
        AND profiles.producer_id = b2b_pallet_producer_wine_status.producer_id
    )
  );

REVOKE ALL ON TABLE b2b_pallet_producer_wine_status FROM PUBLIC;
REVOKE ALL ON TABLE b2b_pallet_producer_wine_status FROM anon;
REVOKE ALL ON TABLE b2b_pallet_producer_wine_status FROM authenticated;

GRANT SELECT (
  id,
  shipment_id,
  producer_id,
  wine_id,
  decision_status,
  confirmed_quantity,
  reject_reason,
  decided_at,
  updated_by,
  created_at,
  updated_at
) ON b2b_pallet_producer_wine_status TO authenticated;
