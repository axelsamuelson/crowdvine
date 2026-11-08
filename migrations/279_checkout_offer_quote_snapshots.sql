-- DRAFT / REVIEW ONLY — do NOT apply without owner approval.
-- Dual-offer accepted quote snapshots for immutable reuse by
-- order / payment / confirmation / later debit.
-- Does NOT enable DIRECT_BOX_CHECKOUT_ENABLED.
-- Does NOT apply migration 277/278.
-- Absolute prices/margins are NOT seeded here.
--
-- quote_id is the scoped acceptance identity (user+cart+offer+content_digest).
-- content_digest is the money/lines/terms hash WITHOUT tenant — identical
-- offers for two users share a digest but MUST have distinct quote_ids.

CREATE TABLE IF NOT EXISTS public.checkout_offer_quote_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Scoped acceptance id (embeds tenant+cart). Global UNIQUE is safe because
  -- buildOfferQuoteId includes user_id + cart_id + offer + content_digest.
  quote_id TEXT NOT NULL UNIQUE,
  -- Content-only digest (no user/cart). NOT unique alone — two tenants may share.
  content_digest TEXT NOT NULL,
  schema_version INTEGER NOT NULL DEFAULT 1,
  offer TEXT NOT NULL CHECK (offer IN ('shared_pallet', 'direct_box')),
  cart_id UUID,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  payload_hash TEXT NOT NULL,
  -- Full authoritative offer quote JSON (money, lines, terms codes).
  payload JSONB NOT NULL,
  pricing_source TEXT NOT NULL CHECK (
    pricing_source IN ('live_catalog', 'synthetic_fixture', 'unavailable')
  ),
  destination_country TEXT,
  destination_zone_id UUID,
  valid_until TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  explicit_acceptance BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Prevent two accepted rows for the same user/cart/offer content collision
  -- under different quote_id schemes if identity rules change later.
  CONSTRAINT checkout_offer_quote_snapshots_scope_chk CHECK (
    (user_id IS NULL AND cart_id IS NULL)
    OR (user_id IS NOT NULL AND cart_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_checkout_offer_quote_snapshots_user
  ON public.checkout_offer_quote_snapshots (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_offer_quote_snapshots_cart
  ON public.checkout_offer_quote_snapshots (cart_id)
  WHERE cart_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_checkout_offer_quote_snapshots_digest
  ON public.checkout_offer_quote_snapshots (content_digest);

-- Same user+cart+offer+content must not double-persist when accepted.
CREATE UNIQUE INDEX IF NOT EXISTS uq_checkout_offer_quote_snapshots_scoped_digest
  ON public.checkout_offer_quote_snapshots (
    user_id,
    cart_id,
    offer,
    content_digest
  )
  WHERE user_id IS NOT NULL AND cart_id IS NOT NULL;

COMMENT ON TABLE public.checkout_offer_quote_snapshots IS
  'DRAFT: immutable accepted dual-offer quotes. Do not apply until dual-offer checkout is approved. Synthetic fixture rows must never be treated as production rates. quote_id is tenant-scoped; content_digest is not.';

COMMENT ON COLUMN public.checkout_offer_quote_snapshots.content_digest IS
  'SHA-256 of canonical money/lines/terms only — NOT unique across tenants.';

COMMENT ON COLUMN public.checkout_offer_quote_snapshots.quote_id IS
  'oq_<hash(user|cart|offer|content_digest)> — globally unique acceptance identity.';

ALTER TABLE public.checkout_offer_quote_snapshots ENABLE ROW LEVEL SECURITY;

-- No anon policies — service_role / future authenticated read-own only after review.
REVOKE ALL ON public.checkout_offer_quote_snapshots FROM anon;
REVOKE ALL ON public.checkout_offer_quote_snapshots FROM authenticated;
GRANT ALL ON public.checkout_offer_quote_snapshots TO service_role;
