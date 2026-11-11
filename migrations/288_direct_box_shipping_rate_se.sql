-- Additive: seeds SE direct_box customer shipping rate (Axel 2026-11-11 01:24).
-- REQUIRES migration 277 first (customer_shipping_rates.channel allows 'direct_box').
-- flat_fee_cents = 14900 (149 SEK incl. VAT) PER BOX of 6 bottles.
-- Application multiplies by (bottle_count / 6) in lib/customer-shipping-pricing.ts.
-- Do NOT apply from an agent. Order in prod: 277 → 278 → 288.

INSERT INTO customer_shipping_rates (
  channel,
  country_code,
  flat_fee_cents,
  free_shipping,
  free_shipping_threshold_cents,
  min_bottles,
  max_bottles,
  active,
  notes
)
SELECT
  'direct_box',
  'SE',
  14900,
  false,
  NULL,
  6,
  NULL,
  true,
  'per_box_of_6_incl_vat Axel 01:24 — app multiplies by bottle_count/6'
WHERE NOT EXISTS (
  SELECT 1
  FROM customer_shipping_rates
  WHERE channel = 'direct_box'
    AND country_code = 'SE'
    AND active = true
);

COMMENT ON COLUMN customer_shipping_rates.flat_fee_cents IS
  'Gross SEK öre. For channel=direct_box this is the fee PER BOX of 6 bottles (multiplied in app). For channel=pact this is a flat per-order fee.';
