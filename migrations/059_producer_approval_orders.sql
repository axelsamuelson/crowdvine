-- Migration 059: Producer approval flow for reservations
-- Adds producer linkage + approval metadata to order_reservations.
-- Date: 2026-01-21

-- 1) Link each reservation to a producer (for producer dashboard + approvals)
ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS producer_id UUID;

ALTER TABLE order_reservations
ADD CONSTRAINT fk_order_reservations_producer
FOREIGN KEY (producer_id)
REFERENCES producers(id)
ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_order_reservations_producer_id
ON order_reservations(producer_id);

-- 2) Store producer approval decision timestamps (status remains in order_reservations.status)
ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS producer_approved_at TIMESTAMPTZ;

ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS producer_approved_by UUID;

ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS producer_rejected_at TIMESTAMPTZ;

ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS producer_rejected_by UUID;

ALTER TABLE order_reservations
ADD COLUMN IF NOT EXISTS producer_decision_note TEXT;

COMMENT ON COLUMN order_reservations.producer_id IS
'Producer that owns this reservation (single-producer reservation required for producer approval flow).';

COMMENT ON COLUMN order_reservations.producer_approved_at IS
'When the producer approved the reservation (stock confirmed).';

COMMENT ON COLUMN order_reservations.producer_rejected_at IS
'When the producer rejected the reservation.';

-- 3) Best-effort backfill producer_id for existing reservations (only if exactly one producer in items)
-- If a reservation contains wines from multiple producers, producer_id will remain NULL.
WITH reservation_producers AS (
  SELECT
    ori.reservation_id,
    COUNT(DISTINCT w.producer_id) AS producer_count,
    -- Supabase/Postgres: MAX(uuid) may not be available; aggregate as text and cast back.
    MAX(w.producer_id::text)::uuid AS producer_id
  FROM order_reservation_items ori
  JOIN wines w ON w.id = ori.item_id
  GROUP BY ori.reservation_id
)
UPDATE order_reservations r
SET producer_id = rp.producer_id
FROM reservation_producers rp
WHERE r.id = rp.reservation_id
  AND (r.producer_id IS NULL)
  AND rp.producer_count = 1;

