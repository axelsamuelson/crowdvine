-- B2B pallet lifecycle. status is the source of truth; is_active stays in sync
-- until callers are moved off the boolean. Idempotent.

ALTER TABLE b2b_pallet_shipments
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'inactive';

-- Postgres doesn't support "ADD CONSTRAINT IF NOT EXISTS", so we guard via pg_constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'b2b_pallet_shipments_status_check'
  ) THEN
    ALTER TABLE b2b_pallet_shipments
      ADD CONSTRAINT b2b_pallet_shipments_status_check
      CHECK (status IN ('inactive', 'in_transit', 'active'));
  END IF;
END
$$;

COMMENT ON COLUMN b2b_pallet_shipments.status IS
  'inactive = planerad, ej på väg. in_transit = på väg, vinerna visas som kommande på dirtywine.se. active = levererad, räknas som lager. Ersätter is_active, som tills vidare hålls i synk via trigger.';

-- Pallets already marked sellable become active. Does not name individual rows.
UPDATE b2b_pallet_shipments
SET status = 'active'
WHERE is_active = true
  AND status = 'inactive';

CREATE OR REPLACE FUNCTION sync_b2b_pallet_shipment_status()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Existing writers that only flip is_active keep working.
  IF TG_OP = 'UPDATE'
     AND NEW.status IS NOT DISTINCT FROM OLD.status
     AND NEW.is_active IS DISTINCT FROM OLD.is_active
  THEN
    NEW.status := CASE WHEN NEW.is_active THEN 'active' ELSE 'inactive' END;
  ELSIF TG_OP = 'INSERT'
     AND NEW.is_active = true
     AND NEW.status = 'inactive'
  THEN
    NEW.status := 'active';
  END IF;

  -- status is the source of truth; is_active is derived.
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_b2b_pallet_shipments_sync_status
  ON b2b_pallet_shipments;

CREATE TRIGGER trg_b2b_pallet_shipments_sync_status
  BEFORE INSERT OR UPDATE ON b2b_pallet_shipments
  FOR EACH ROW
  EXECUTE FUNCTION sync_b2b_pallet_shipment_status();

CREATE INDEX IF NOT EXISTS idx_b2b_pallet_shipments_status
  ON b2b_pallet_shipments (status);
