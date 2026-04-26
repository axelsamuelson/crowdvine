-- Phase 3: Admin marks pallet shipping_ordered → auto-charge deferred SetupIntents; checkout uses PaymentIntent after this point.

ALTER TABLE pallets DROP CONSTRAINT IF EXISTS chk_pallet_status;

ALTER TABLE pallets ADD CONSTRAINT chk_pallet_status
  CHECK (status IN (
    'open',
    'consolidating',
    'shipping_ordered',
    'complete',
    'awaiting_pickup',
    'picked_up',
    'in_transit',
    'out_for_delivery',
    'shipped',
    'delivered',
    'cancelled'
  ));

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS shipping_ordered_at TIMESTAMPTZ;

ALTER TABLE pallets
  ADD COLUMN IF NOT EXISTS shipping_ordered_by UUID
    REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN pallets.shipping_ordered_at IS
  'When admin marked shipping as ordered. Triggers auto-charge of all pending SetupIntent reservations on this pallet.';

COMMENT ON COLUMN pallets.shipping_ordered_by IS
  'Which admin user ordered the shipping.';
