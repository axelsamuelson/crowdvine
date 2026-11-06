-- DRAFT / REVIEW ONLY — do NOT apply without owner + Hugo/Ines approval.
-- Adds fulfillment_channel on order_reservations and allows direct_box rows in
-- customer_shipping_rates.channel. Does NOT seed any customer price (no 99 SEK
-- for direct_box). Shared-pallet/`pact` rates remain unchanged.

-- order_reservations.fulfillment_channel
ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS fulfillment_channel TEXT;

ALTER TABLE order_reservations
  DROP CONSTRAINT IF EXISTS order_reservations_fulfillment_channel_check;

ALTER TABLE order_reservations
  ADD CONSTRAINT order_reservations_fulfillment_channel_check
  CHECK (
    fulfillment_channel IS NULL
    OR fulfillment_channel IN ('shared_pallet', 'direct_box')
  );

COMMENT ON COLUMN order_reservations.fulfillment_channel IS
  'shared_pallet = collective fill + Budbee/Instabee; direct_box = independent case (no pallet_id). NULL = legacy rows treated as shared_pallet when pallet_id present.';

CREATE INDEX IF NOT EXISTS idx_order_reservations_fulfillment_channel
  ON order_reservations (fulfillment_channel)
  WHERE fulfillment_channel IS NOT NULL;

-- Allow mode-scoped direct_box customer shipping rates (empty until owner configures).
-- Existing `pact` rows (shared-pallet / legacy 99 SEK) are NOT reused for direct_box.
ALTER TABLE customer_shipping_rates
  DROP CONSTRAINT IF EXISTS customer_shipping_rates_channel_check;

ALTER TABLE customer_shipping_rates
  ADD CONSTRAINT customer_shipping_rates_channel_check
  CHECK (channel IN ('pact', 'direct_box'));

COMMENT ON COLUMN customer_shipping_rates.channel IS
  'pact = shared_pallet B2C revenue rates; direct_box = explicit direct-case rates only. Checkout never applies pact rates to direct_box.';
