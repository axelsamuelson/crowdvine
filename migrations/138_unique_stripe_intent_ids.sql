-- Idempotency guardrails: prevent duplicate reservations per Stripe intent.
-- NOTE: If duplicates already exist in production, we dedupe by keeping the
-- most recently created reservation per intent id and NULLing the intent id on older rows.

-- 1) Dedupe duplicate SetupIntent ids (keep newest created_at; tie-break by id)
WITH ranked AS (
  SELECT
    id,
    setup_intent_id,
    ROW_NUMBER() OVER (
      PARTITION BY setup_intent_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM order_reservations
  WHERE setup_intent_id IS NOT NULL
),
dupes AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE order_reservations
SET setup_intent_id = NULL
WHERE id IN (SELECT id FROM dupes);

-- 2) Dedupe duplicate PaymentIntent ids (same strategy)
WITH ranked AS (
  SELECT
    id,
    payment_intent_id,
    ROW_NUMBER() OVER (
      PARTITION BY payment_intent_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM order_reservations
  WHERE payment_intent_id IS NOT NULL
),
dupes AS (
  SELECT id
  FROM ranked
  WHERE rn > 1
)
UPDATE order_reservations
SET payment_intent_id = NULL
WHERE id IN (SELECT id FROM dupes);

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_reservations_setup_intent_id_unique
  ON order_reservations(setup_intent_id)
  WHERE setup_intent_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_order_reservations_payment_intent_id_unique
  ON order_reservations(payment_intent_id)
  WHERE payment_intent_id IS NOT NULL;

