-- Admin UPS / direct_box fulfillment support.
-- Adds delivered_at + dispatch audit columns on order_reservations,
-- and order_reservation_shipments (tracking per packing source).
-- RLS: service_role + platform admin only. No customer access.

-- ---------------------------------------------------------------------------
-- order_reservations: delivered_at + dispatch status audit
-- ---------------------------------------------------------------------------

ALTER TABLE public.order_reservations
  ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

COMMENT ON COLUMN public.order_reservations.delivered_at IS
  'When the direct_box order was marked delivered/completed. Set automatically on fulfillment_dispatch_status=completed; admin may correct.';

ALTER TABLE public.order_reservations
  ADD COLUMN IF NOT EXISTS fulfillment_dispatch_status_updated_at TIMESTAMPTZ;

ALTER TABLE public.order_reservations
  ADD COLUMN IF NOT EXISTS fulfillment_dispatch_status_updated_by UUID
    REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.order_reservations.fulfillment_dispatch_status_updated_at IS
  'When fulfillment_dispatch_status was last changed by an admin.';

COMMENT ON COLUMN public.order_reservations.fulfillment_dispatch_status_updated_by IS
  'Admin auth.users.id who last changed fulfillment_dispatch_status.';

CREATE INDEX IF NOT EXISTS idx_order_reservations_delivered_at
  ON public.order_reservations (delivered_at)
  WHERE delivered_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- order_reservation_shipments: one UPS tracking row per packing source
-- source_key matches resolvePackingSourceId (producer:<uuid> | wholesaler:<name>)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.order_reservation_shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL
    REFERENCES public.order_reservations (id) ON DELETE CASCADE,
  source_key TEXT NOT NULL,
  source_label TEXT NOT NULL,
  carrier TEXT NOT NULL DEFAULT 'ups',
  tracking_number TEXT NOT NULL,
  boxes INT NOT NULL DEFAULT 1
    CHECK (boxes > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users (id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_reservation_shipments_reservation_source_unique
    UNIQUE (reservation_id, source_key)
);

COMMENT ON TABLE public.order_reservation_shipments IS
  'Admin-managed carrier tracking per packing source for a reservation (UPS direct_box).';

COMMENT ON COLUMN public.order_reservation_shipments.source_key IS
  'Packing source id from resolvePackingSourceId (producer:<uuid> or wholesaler:<normalized name>).';

CREATE INDEX IF NOT EXISTS idx_order_reservation_shipments_reservation
  ON public.order_reservation_shipments (reservation_id);

ALTER TABLE public.order_reservation_shipments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.order_reservation_shipments FROM PUBLIC;
REVOKE ALL ON public.order_reservation_shipments FROM anon;
REVOKE ALL ON public.order_reservation_shipments FROM authenticated;

GRANT ALL ON public.order_reservation_shipments TO service_role;

DROP POLICY IF EXISTS "Admins manage order reservation shipments"
  ON public.order_reservation_shipments;
CREATE POLICY "Admins manage order reservation shipments"
  ON public.order_reservation_shipments
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
