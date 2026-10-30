-- Purpose on promo codes: normal vs testkop (auto-exclude from "clean" analytics).

ALTER TABLE promo_discount_codes
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'normal';

ALTER TABLE promo_discount_codes
  DROP CONSTRAINT IF EXISTS promo_discount_codes_purpose_check;

ALTER TABLE promo_discount_codes
  ADD CONSTRAINT promo_discount_codes_purpose_check
    CHECK (purpose IN ('normal', 'testkop'));

COMMENT ON COLUMN promo_discount_codes.purpose IS
  'normal = real campaigns; testkop = test purchase — reservations flagged and user auto-excluded from admin metrics / clean analytics.';

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS is_test_purchase boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_order_reservations_is_test_purchase
  ON order_reservations (is_test_purchase)
  WHERE is_test_purchase = true;

COMMENT ON COLUMN order_reservations.is_test_purchase IS
  'True when checkout used a promo_discount_codes.purpose = testkop code.';
