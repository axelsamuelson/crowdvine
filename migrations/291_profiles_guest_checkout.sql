-- Migration 291: Guest checkout identity markers on profiles
--
-- Guest shared-pallet checkout (GUEST_CHECKOUT_ENABLED) creates a real
-- auth.users + profiles row via /api/checkout/ensure-session so Stripe
-- SetupIntent, off_session pallet-close charging, order emails, and admin
-- views keep working unchanged (order_reservations.user_id → profiles).
--
-- guest_checkout_at: set when the silent guest path created/used this profile.
-- account_claimed_at: set when the shopper optionally claims an account on
-- the confirmation page. NULL means still a guest identity for UX (offer CTA).
--
-- Do NOT run this against prod from the agent — apply via normal migrate process.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS guest_checkout_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS account_claimed_at TIMESTAMPTZ;

COMMENT ON COLUMN public.profiles.guest_checkout_at IS
  'Set when profile was established via silent guest checkout (ensure-session under GUEST_CHECKOUT_ENABLED or PLATFORM_OPEN).';

COMMENT ON COLUMN public.profiles.account_claimed_at IS
  'Set when a guest opted into an account on the confirmation page. NULL = still guest for UX.';

CREATE INDEX IF NOT EXISTS idx_profiles_guest_checkout_unclaimed
  ON public.profiles (guest_checkout_at)
  WHERE guest_checkout_at IS NOT NULL AND account_claimed_at IS NULL;
