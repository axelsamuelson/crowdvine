ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS instabee_parcel_id TEXT,
  ADD COLUMN IF NOT EXISTS instabee_label_url TEXT,
  ADD COLUMN IF NOT EXISTS instabee_tracking_url TEXT,
  ADD COLUMN IF NOT EXISTS instabee_label_created_at TIMESTAMPTZ;

COMMENT ON COLUMN order_reservations.instabee_parcel_id
  IS 'Parcel ID from Instabee/Budbee after Post Packing';
COMMENT ON COLUMN order_reservations.instabee_label_url
  IS 'Shipping label URL from Instabee — printed by producer';
COMMENT ON COLUMN order_reservations.instabee_tracking_url
  IS 'Tracking URL sent to customer';
COMMENT ON COLUMN order_reservations.instabee_label_created_at
  IS 'When the Instabee label was generated';
