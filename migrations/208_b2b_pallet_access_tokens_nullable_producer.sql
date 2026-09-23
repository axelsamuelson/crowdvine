-- Allow whole-pallet share tokens (producer_id NULL) alongside per-producer tokens.
-- Idempotent.

ALTER TABLE b2b_pallet_access_tokens
  ALTER COLUMN producer_id DROP NOT NULL;

COMMENT ON COLUMN b2b_pallet_access_tokens.producer_id IS
  'Producer-scoped share when set. NULL = whole-pallet status overview share.';

COMMENT ON TABLE b2b_pallet_access_tokens IS
  'Opaque hashed tokens for B2B pallet status links (per-producer or whole-pallet). Service role only.';
