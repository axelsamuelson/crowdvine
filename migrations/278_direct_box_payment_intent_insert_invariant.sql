-- DRAFT / REVIEW ONLY — do NOT apply without owner + Hugo/Ines approval.
-- Documents the DB invariant that makes concurrent direct_box confirm idempotent.
--
-- No new index: migration 138 already created
--   idx_order_reservations_payment_intent_id_unique
--   ON order_reservations(payment_intent_id) WHERE payment_intent_id IS NOT NULL
--
-- Application contract (app/api/checkout/confirm):
--   For direct_box + succeeded PaymentIntent, the PRIMARY order_reservations
--   INSERT must include payment_intent_id (+ payment_status=paid). Concurrent
--   duplicate confirms then fail at INSERT with unique_violation and replay the
--   existing row — no ephemeral unpaid twin, no post-insert attach race window
--   for durable orders.
--
-- Shared_pallet SetupIntent path unchanged (still attaches setup_intent_id after insert).
-- Enablement still requires migration 277 (fulfillment_channel + dispatch status)
-- and remains fail-closed when those columns are missing.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'i'
      AND c.relname = 'idx_order_reservations_payment_intent_id_unique'
  ) THEN
    EXECUTE $c$
      COMMENT ON INDEX idx_order_reservations_payment_intent_id_unique IS
        'Idempotency: at most one order_reservations row per Stripe payment_intent_id. direct_box confirm binds this column at INSERT.'
    $c$;
  END IF;
END $$;
