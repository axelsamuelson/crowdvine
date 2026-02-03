-- Migration 063: Producer MOQ (minimum bottles per pallet)
-- Lets each producer define a minimum number of bottles that must be reached
-- within a pallet for that producer's bottles to count toward pallet fill/completion.
-- Date: 2026-01-21

ALTER TABLE producers
ADD COLUMN IF NOT EXISTS moq_min_bottles INTEGER NOT NULL DEFAULT 0;

-- Postgres doesn't support "ADD CONSTRAINT IF NOT EXISTS", so we guard via pg_constraint.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_producers_moq_min_bottles_nonnegative'
  ) THEN
    ALTER TABLE producers
    ADD CONSTRAINT chk_producers_moq_min_bottles_nonnegative
    CHECK (moq_min_bottles >= 0);
  END IF;
END
$$;

COMMENT ON COLUMN producers.moq_min_bottles IS
'Minimum bottles per pallet (MOQ). If a producer has fewer bottles than this in a pallet, those bottles do not count toward pallet fill/completion.';

