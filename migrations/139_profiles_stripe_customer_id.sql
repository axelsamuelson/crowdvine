-- Migration 139: Stripe customer on profiles (B2C billing source of truth)
-- Date: 2026-04-28
-- user_memberships.stripe_customer_id remains for backward compatibility; new writes should target profiles.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

COMMENT ON COLUMN profiles.stripe_customer_id IS
  'Stripe Customer ID for this user (B2C checkout, saved cards). Primary source of truth. '
  'user_memberships.stripe_customer_id is legacy and may be mirrored by the application.';

-- Backfill: one user_memberships row per user (user_id UNIQUE). Copy non-empty trimmed id when profile is unset.
UPDATE profiles AS p
SET stripe_customer_id = trim(um.stripe_customer_id)
FROM user_memberships AS um
WHERE um.user_id = p.id
  AND um.stripe_customer_id IS NOT NULL
  AND trim(um.stripe_customer_id) <> ''
  AND (p.stripe_customer_id IS NULL OR trim(p.stripe_customer_id) = '');

-- Canonical customer for production recovery (overrides any prior backfill for this profile).
UPDATE profiles
SET stripe_customer_id = 'cus_UPoWDCQNesHOwo'
WHERE id = 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9'::uuid;

-- One Stripe customer id must not be shared by two profiles (trim-normalized).
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id_unique
  ON profiles (trim(stripe_customer_id))
  WHERE stripe_customer_id IS NOT NULL AND trim(stripe_customer_id) <> '';

-- Verification (run in SQL editor after migrate):
-- SELECT id, email, stripe_customer_id FROM profiles WHERE stripe_customer_id IS NOT NULL LIMIT 50;
-- SELECT stripe_customer_id, count(*) AS n FROM profiles WHERE stripe_customer_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1;
-- SELECT id, email, stripe_customer_id FROM profiles WHERE id = 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9';
-- Latest reservation + setup intent id for that user (compare customer in Stripe Dashboard / API to profiles.stripe_customer_id):
-- SELECT id, setup_intent_id, created_at FROM order_reservations
--   WHERE user_id = 'cdc144b5-a8d5-48a3-a28a-03d76cfef4f9' AND setup_intent_id IS NOT NULL
--   ORDER BY created_at DESC LIMIT 5;
