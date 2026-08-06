-- Migration 184: Idempotency key for order_reservations (double-submit guard).
-- UNIQUE allows multiple NULLs (sibling rows in multi-producer checkout leave key null).

ALTER TABLE order_reservations
  ADD COLUMN IF NOT EXISTS idempotency_key uuid;

COMMENT ON COLUMN order_reservations.idempotency_key IS
  'Client-generated UUID for a checkout submit. Unique when set; primary reservation only for multi-producer groups.';

CREATE UNIQUE INDEX IF NOT EXISTS order_reservations_idempotency_key_uidx
  ON order_reservations (idempotency_key)
  WHERE idempotency_key IS NOT NULL;
