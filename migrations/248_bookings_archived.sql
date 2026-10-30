-- Soft-archive for public.bookings (legacy checkout rows).
-- Today only status 'reserved' is used; there is no CHECK/enum (same pattern as
-- order_reservations in 241_order_reservations_archived.sql).
-- 'archived' is a new status value. Non-null archived_at means status should be archived.
--
-- Do NOT archive rows in this migration — ops will archive after merge.
--
-- Example (after apply), for Middle Languedoc leftovers:
--   UPDATE public.bookings
--   SET status = 'archived',
--       status_before_archive = status,
--       archived_at = now(),
--       archive_reason = 'legacy cleanup'
--   WHERE status = 'reserved'
--     AND (
--       pallet_id = '3985cbfe-178f-4fa1-a897-17183a1f18db'
--       OR pallet_id IS NULL
--     );

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archive_reason TEXT,
  ADD COLUMN IF NOT EXISTS status_before_archive TEXT;

COMMENT ON COLUMN public.bookings.archived_at IS
  'When this booking was soft-archived. Non-null means status should be archived.';

COMMENT ON COLUMN public.bookings.archive_reason IS
  'Why this booking was archived (admin note / code).';

COMMENT ON COLUMN public.bookings.status_before_archive IS
  'Lifecycle status before archive; restored on unarchive.';

CREATE INDEX IF NOT EXISTS idx_bookings_archived_at
  ON public.bookings (archived_at)
  WHERE archived_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bookings_status_archived
  ON public.bookings (status)
  WHERE status = 'archived';

CREATE INDEX IF NOT EXISTS idx_bookings_pallet_active
  ON public.bookings (pallet_id)
  WHERE status IS DISTINCT FROM 'archived' AND archived_at IS NULL;

-- Active-only admin view: exclude soft-archived bookings.
DROP VIEW IF EXISTS public.bookings_with_customers CASCADE;
CREATE VIEW public.bookings_with_customers AS
SELECT
  b.id,
  b.user_id,
  b.item_id,
  b.quantity,
  b.band,
  b.status,
  b.created_at,
  b.pallet_id,
  b.archived_at,
  b.archive_reason,
  b.status_before_archive,

  p.email AS customer_email,
  p.full_name AS customer_full_name,

  w.wine_name,
  w.vintage,
  w.color AS wine_color,
  w.grape_varieties,
  w.base_price_cents,

  pr.name AS producer_name,
  pr.region AS producer_region,

  pa.name AS pallet_name,
  pa.bottle_capacity AS pallet_capacity

FROM public.bookings b
LEFT JOIN public.profiles p ON b.user_id = p.id
LEFT JOIN public.wines w ON b.item_id = w.id
LEFT JOIN public.producers pr ON w.producer_id = pr.id
LEFT JOIN public.pallets pa ON b.pallet_id = pa.id
WHERE b.status IS DISTINCT FROM 'archived'
  AND b.archived_at IS NULL;

-- Keep orders_with_customers aligned: exclude archived/cancelled reservations.
DROP VIEW IF EXISTS public.orders_with_customers CASCADE;
CREATE VIEW public.orders_with_customers AS
SELECT
  r.id,
  r.user_id,
  r.status,
  r.created_at,
  r.cart_id,
  r.address_id,
  r.pallet_id,
  r.pickup_zone_id,
  r.delivery_zone_id,
  r.archived_at,

  p.email AS customer_email,
  p.full_name AS customer_full_name,

  pa.name AS pallet_name,

  pz_pickup.name AS pickup_zone_name,
  pz_pickup.zone_type AS pickup_zone_type,

  pz_delivery.name AS delivery_zone_name,
  pz_delivery.zone_type AS delivery_zone_type

FROM public.order_reservations r
LEFT JOIN public.profiles p ON r.user_id = p.id
LEFT JOIN public.pallets pa ON r.pallet_id = pa.id
LEFT JOIN public.pallet_zones pz_pickup ON r.pickup_zone_id = pz_pickup.id
LEFT JOIN public.pallet_zones pz_delivery ON r.delivery_zone_id = pz_delivery.id
WHERE r.status IS DISTINCT FROM 'archived'
  AND r.status IS DISTINCT FROM 'cancelled'
  AND r.archived_at IS NULL;

-- Re-lock customer-data views (same posture as 233_lock_customer_data_views.sql).
REVOKE ALL ON public.bookings_with_customers FROM anon;
REVOKE ALL ON public.bookings_with_customers FROM authenticated;
REVOKE ALL ON public.orders_with_customers FROM anon;
REVOKE ALL ON public.orders_with_customers FROM authenticated;
