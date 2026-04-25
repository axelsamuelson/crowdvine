-- Founding Member: enum label only.
-- PostgreSQL requires this migration to COMMIT before any statement can use 'founding_member'.
-- Run migrations/122_founding_member_perks_and_columns.sql next (same deploy is fine if migrations run as separate transactions).

ALTER TYPE membership_level ADD VALUE IF NOT EXISTS 'founding_member' AFTER 'privilege';
