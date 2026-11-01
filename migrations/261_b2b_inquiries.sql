-- B2B order inquiries from dirtywine.se (warehouse stock, no payment).
-- Public insert only via service-role API route; admins read/update via RLS.

CREATE TABLE IF NOT EXISTS public.b2b_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'confirmed', 'rejected')),
  company_name text NOT NULL,
  organization_number text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  delivery_address text NOT NULL,
  postal_code text NOT NULL,
  desired_delivery_date date,
  message text,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.b2b_inquiry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.b2b_inquiries (id) ON DELETE CASCADE,
  wine_id uuid NOT NULL REFERENCES public.wines (id) ON DELETE RESTRICT,
  wine_title text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price_cents integer CHECK (unit_price_cents IS NULL OR unit_price_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_b2b_inquiries_created_at
  ON public.b2b_inquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_b2b_inquiries_status
  ON public.b2b_inquiries (status);

CREATE INDEX IF NOT EXISTS idx_b2b_inquiry_lines_inquiry_id
  ON public.b2b_inquiry_lines (inquiry_id);

COMMENT ON TABLE public.b2b_inquiries IS
  'Dirtywine B2B order inquiries (inquiry checkout mode). No payment. Admin-only RLS; inserts via service role.';

COMMENT ON TABLE public.b2b_inquiry_lines IS
  'Line items for b2b_inquiries. Quantities validated against B2B warehouse stock at submit.';

ALTER TABLE public.b2b_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.b2b_inquiry_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage b2b_inquiries" ON public.b2b_inquiries;
CREATE POLICY "Admins manage b2b_inquiries"
  ON public.b2b_inquiries
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins manage b2b_inquiry_lines" ON public.b2b_inquiry_lines;
CREATE POLICY "Admins manage b2b_inquiry_lines"
  ON public.b2b_inquiry_lines
  FOR ALL
  TO authenticated
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

REVOKE ALL ON public.b2b_inquiries FROM anon, authenticated;
REVOKE ALL ON public.b2b_inquiry_lines FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_inquiries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.b2b_inquiry_lines TO authenticated;
GRANT ALL ON public.b2b_inquiries TO service_role;
GRANT ALL ON public.b2b_inquiry_lines TO service_role;
