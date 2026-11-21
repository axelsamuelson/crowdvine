-- Analytics V2 etapp 2 M9 (H11): link purchases to analytics session.
-- Additive only. Apply in TEST first. Do NOT alter existing columns.
-- Older rows remain NULL until new checkouts send session_id / visitor_id.

ALTER TABLE public.order_reservations
  ADD COLUMN IF NOT EXISTS session_id text;

ALTER TABLE public.order_reservations
  ADD COLUMN IF NOT EXISTS visitor_id text;

COMMENT ON COLUMN public.order_reservations.session_id IS
  'Analytics session_id from client sessionStorage (analytics_session_id). Nullable for historical rows.';

COMMENT ON COLUMN public.order_reservations.visitor_id IS
  'Analytics visitor_id (pact_visitor_id). Nullable for historical rows.';

CREATE INDEX IF NOT EXISTS idx_order_reservations_session_id
  ON public.order_reservations (session_id)
  WHERE session_id IS NOT NULL;
