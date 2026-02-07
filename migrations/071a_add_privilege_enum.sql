-- Migration 071a: Add 'privilege' to membership_level enum
-- MUST be run and committed BEFORE 071b (PostgreSQL requires new enum values to be committed before use)

ALTER TYPE membership_level ADD VALUE IF NOT EXISTS 'privilege' AFTER 'guld';
