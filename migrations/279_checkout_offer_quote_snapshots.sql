-- DRAFT / REVIEW ONLY — do NOT apply without owner approval.
-- Dual-offer accepted quote snapshots for immutable reuse by
-- order / payment / confirmation / later debit.
-- Does NOT enable DIRECT_BOX_CHECKOUT_ENABLED.
-- Does NOT apply migration 277/278.
-- Absolute prices/margins are NOT seeded here.

CREATE TABLE IF NOT EXISTS public.checkout_offer_quote_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id TEXT NOT NULL UNIQUE,
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
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkout_offer_quote_snapshots_user
  ON public.checkout_offer_quote_snapshots (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_checkout_offer_quote_snapshots_cart
  ON public.checkout_offer_quote_snapshots (cart_id)
  WHERE cart_id IS NOT NULL;

COMMENT ON TABLE public.checkout_offer_quote_snapshots IS
  'DRAFT: immutable accepted dual-offer quotes. Do not apply until dual-offer checkout is approved. Synthetic fixture rows must never be treated as production rates.';

ALTER TABLE public.checkout_offer_quote_snapshots ENABLE ROW LEVEL SECURITY;

-- No anon policies — service_role / future authenticated read-own only after review.
REVOKE ALL ON public.checkout_offer_quote_snapshots FROM anon;
REVOKE ALL ON public.checkout_offer_quote_snapshots FROM authenticated;
GRANT ALL ON public.checkout_offer_quote_snapshots TO service_role;
