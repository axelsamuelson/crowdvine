-- Migration 058: Pallet completion rules (data-driven completion)
-- Adds JSON rules to define when a pallet is considered complete using IF/AND/OR/ELSE logic.
-- Date: 2026-01-21

ALTER TABLE pallets
ADD COLUMN IF NOT EXISTS completion_rules JSONB;

COMMENT ON COLUMN pallets.completion_rules IS
'JSON rules for completion (Klaviyo-like): operator + groups of conditions; IF rules match THEN complete ELSE incomplete.';

