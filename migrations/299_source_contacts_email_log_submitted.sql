-- Migration 299: Source contacts, per-source email claim log, shipment submitted_at.
-- Additive + idempotent. No emails are sent by this migration.
-- SOURCE_EMAILS_ENABLED (app env) stays OFF by default — schema only.

-- ---------------------------------------------------------------------------
-- a) wholesaler_sources: packing key = wholesaler:<lower(source_name)>
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wholesaler_sources (
  source_key TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_email TEXT,
  address_street TEXT,
  address_postcode TEXT,
  address_city TEXT,
  address_country TEXT,
  contact_locale TEXT NOT NULL DEFAULT 'fr',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT wholesaler_sources_source_key_format
    CHECK (source_key LIKE 'wholesaler:%'),
  CONSTRAINT wholesaler_sources_contact_locale_len
    CHECK (char_length(contact_locale) BETWEEN 2 AND 8)
);

COMMENT ON TABLE public.wholesaler_sources IS
  'Grossistkällor keyed by packing-source id (wholesaler:<lower(source_name)>).';

COMMENT ON COLUMN public.wholesaler_sources.source_key IS
  'Must match resolvePackingSourceId for wholesaler wines.';

COMMENT ON COLUMN public.wholesaler_sources.contact_locale IS
  'Contact language for source emails (default fr).';

CREATE INDEX IF NOT EXISTS idx_wholesaler_sources_name
  ON public.wholesaler_sources (name);

ALTER TABLE public.wholesaler_sources ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.wholesaler_sources FROM PUBLIC;
REVOKE ALL ON public.wholesaler_sources FROM anon;
REVOKE ALL ON public.wholesaler_sources FROM authenticated;

GRANT ALL ON public.wholesaler_sources TO service_role;

DROP POLICY IF EXISTS "Admins manage wholesaler sources"
  ON public.wholesaler_sources;
CREATE POLICY "Admins manage wholesaler sources"
  ON public.wholesaler_sources
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- b) producers.contact_locale (default fr)
-- ---------------------------------------------------------------------------

ALTER TABLE public.producers
  ADD COLUMN IF NOT EXISTS contact_locale TEXT;

UPDATE public.producers
SET contact_locale = 'fr'
WHERE contact_locale IS NULL;

ALTER TABLE public.producers
  ALTER COLUMN contact_locale SET DEFAULT 'fr';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'producers_contact_locale_len'
      AND conrelid = 'public.producers'::regclass
  ) THEN
    ALTER TABLE public.producers
      ADD CONSTRAINT producers_contact_locale_len
      CHECK (contact_locale IS NULL OR char_length(contact_locale) BETWEEN 2 AND 8);
  END IF;
END $$;

COMMENT ON COLUMN public.producers.contact_locale IS
  'Contact language for source emails (default fr).';

-- ---------------------------------------------------------------------------
-- c) source_email_sends: claim-before-send log per source + event
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.source_email_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL
    REFERENCES public.order_reservations (id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  event TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'claimed',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error TEXT,
  resend_id TEXT,
  CONSTRAINT source_email_sends_event_reservation_source_unique
    UNIQUE (event, reservation_id, source_key),
  CONSTRAINT source_email_sends_status_check
    CHECK (status IN ('claimed', 'sent', 'failed', 'skipped'))
);

COMMENT ON TABLE public.source_email_sends IS
  'Claim log for per-source transactional emails. Insert before send; unique conflict = already claimed.';

COMMENT ON COLUMN public.source_email_sends.event IS
  'Stable key e.g. booking, reminder_ad2, alarm_ad4, change, cancel, return.';

COMMENT ON COLUMN public.source_email_sends.source_key IS
  'Packing source id (producer:<uuid> or wholesaler:<name>).';

COMMENT ON COLUMN public.source_email_sends.resend_id IS
  'Provider message id from Resend when sent (nullable).';

CREATE INDEX IF NOT EXISTS idx_source_email_sends_reservation
  ON public.source_email_sends (reservation_id);

CREATE INDEX IF NOT EXISTS idx_source_email_sends_source_key
  ON public.source_email_sends (source_key);

CREATE INDEX IF NOT EXISTS idx_source_email_sends_sent_at
  ON public.source_email_sends (sent_at DESC);

ALTER TABLE public.source_email_sends ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.source_email_sends FROM PUBLIC;
REVOKE ALL ON public.source_email_sends FROM anon;
REVOKE ALL ON public.source_email_sends FROM authenticated;

GRANT ALL ON public.source_email_sends TO service_role;

DROP POLICY IF EXISTS "Admins manage source email sends"
  ON public.source_email_sends;
CREATE POLICY "Admins manage source email sends"
  ON public.source_email_sends
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- ---------------------------------------------------------------------------
-- d) order_reservation_shipments: inlämnad (submitted_at / submitted_by)
-- ---------------------------------------------------------------------------

ALTER TABLE public.order_reservation_shipments
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;

ALTER TABLE public.order_reservation_shipments
  ADD COLUMN IF NOT EXISTS submitted_by UUID
    REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.order_reservation_shipments.submitted_at IS
  'When the packing source marked the shipment as handed in (inlämnad) at Access Point.';

COMMENT ON COLUMN public.order_reservation_shipments.submitted_by IS
  'auth.users.id who recorded inlämnad (admin or future source account).';

CREATE INDEX IF NOT EXISTS idx_order_reservation_shipments_submitted_at
  ON public.order_reservation_shipments (submitted_at)
  WHERE submitted_at IS NOT NULL;
