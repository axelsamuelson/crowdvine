-- Admin-managed checkout promo codes.
-- NOTE: Existing `discount_codes` is the invitation/milestone voucher ledger
-- (supabase/migrations/20250123_create_discount_codes.sql). These tables are
-- separate to avoid breaking that system.

CREATE TABLE IF NOT EXISTS promo_discount_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  description text,

  type text NOT NULL CHECK (type IN ('percent', 'sek')),
  value numeric NOT NULL CHECK (value > 0),

  applies_to text NOT NULL DEFAULT 'order'
    CHECK (applies_to IN ('order', 'item')),

  max_uses integer,
  max_uses_per_user integer,
  user_id uuid REFERENCES profiles(id),

  valid_from timestamptz NOT NULL DEFAULT now(),
  valid_until timestamptz,

  purpose text NOT NULL DEFAULT 'normal'
    CHECK (purpose IN ('normal', 'testkop')),

  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT promo_discount_codes_percent_max
    CHECK (type <> 'percent' OR value <= 100)
);

CREATE INDEX IF NOT EXISTS idx_promo_discount_codes_code
  ON promo_discount_codes (lower(code));
CREATE INDEX IF NOT EXISTS idx_promo_discount_codes_active
  ON promo_discount_codes (active, valid_from, valid_until);
CREATE INDEX IF NOT EXISTS idx_promo_discount_codes_user
  ON promo_discount_codes (user_id)
  WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS promo_discount_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_code_id uuid NOT NULL REFERENCES promo_discount_codes(id),
  user_id uuid NOT NULL REFERENCES profiles(id),
  reservation_id uuid NOT NULL REFERENCES order_reservations(id),
  discount_amount_sek numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_discount_code_uses_code
  ON promo_discount_code_uses (discount_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_discount_code_uses_user
  ON promo_discount_code_uses (discount_code_id, user_id);
CREATE INDEX IF NOT EXISTS idx_promo_discount_code_uses_reservation
  ON promo_discount_code_uses (reservation_id);

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS discount_code_id uuid REFERENCES promo_discount_codes(id),
  ADD COLUMN IF NOT EXISTS discount_amount_sek numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_sek numeric,
  ADD COLUMN IF NOT EXISTS is_test_purchase boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_order_reservations_discount_code
  ON order_reservations (discount_code_id)
  WHERE discount_code_id IS NOT NULL;

COMMENT ON TABLE promo_discount_codes IS
  'Admin-managed checkout promo codes (percent/SEK). Separate from voucher discount_codes.';
COMMENT ON COLUMN order_reservations.discount_code_id IS
  'Applied promo_discount_codes.id at checkout (null if none).';
COMMENT ON COLUMN order_reservations.discount_amount_sek IS
  'SEK deducted by promo code on this reservation.';
COMMENT ON COLUMN order_reservations.total_sek IS
  'Final charged/expected amount in SEK after discounts for this reservation.';

ALTER TABLE promo_discount_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_discount_code_uses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select promo discount codes"
  ON promo_discount_codes;
DROP POLICY IF EXISTS "Admins can insert promo discount codes"
  ON promo_discount_codes;
DROP POLICY IF EXISTS "Admins can update promo discount codes"
  ON promo_discount_codes;
DROP POLICY IF EXISTS "Admins can delete promo discount codes"
  ON promo_discount_codes;

CREATE POLICY "Admins can select promo discount codes"
  ON promo_discount_codes
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can insert promo discount codes"
  ON promo_discount_codes
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can update promo discount codes"
  ON promo_discount_codes
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can delete promo discount codes"
  ON promo_discount_codes
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

DROP POLICY IF EXISTS "Admins can select promo discount uses"
  ON promo_discount_code_uses;
DROP POLICY IF EXISTS "Users can select own promo discount uses"
  ON promo_discount_code_uses;
DROP POLICY IF EXISTS "Admins can insert promo discount uses"
  ON promo_discount_code_uses;

CREATE POLICY "Admins can select promo discount uses"
  ON promo_discount_code_uses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Users can select own promo discount uses"
  ON promo_discount_code_uses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can insert promo discount uses"
  ON promo_discount_code_uses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE OR REPLACE FUNCTION set_promo_discount_codes_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_promo_discount_codes_updated_at ON promo_discount_codes;
CREATE TRIGGER trg_promo_discount_codes_updated_at
  BEFORE UPDATE ON promo_discount_codes
  FOR EACH ROW
  EXECUTE FUNCTION set_promo_discount_codes_updated_at();
