-- Migration 253: Raise default min_bottles_to_complete from 120 to 270.
-- Already applied in production; kept idempotent for fresh/staging DBs.
-- Does not rewrite existing pallet rows (only the column DEFAULT for new inserts).

ALTER TABLE public.pallets
ALTER COLUMN min_bottles_to_complete SET DEFAULT 270;
