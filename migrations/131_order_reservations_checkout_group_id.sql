-- Group multiple order_reservations created in one checkout (e.g. one per producer).

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS checkout_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_order_reservations_checkout_group_id
  ON order_reservations(checkout_group_id)
  WHERE checkout_group_id IS NOT NULL;

COMMENT ON COLUMN order_reservations.checkout_group_id IS
  'Groups multiple reservations created in the same checkout. One per producer when cart has multiple producers.';
