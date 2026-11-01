-- Guest B2B inquiries on dirtywine.se: nullable user_id + claim token for
-- optional post-submit account linking. Inserts remain service-role only.
-- Guests cannot read other people's inquiries (no anon SELECT; owners SELECT own).

ALTER TABLE public.b2b_inquiries
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.b2b_inquiries
  ADD COLUMN IF NOT EXISTS claim_token_hash text;

ALTER TABLE public.b2b_inquiries
  ADD COLUMN IF NOT EXISTS claim_token_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_b2b_inquiries_user_id
  ON public.b2b_inquiries (user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_b2b_inquiries_claim_token_hash
  ON public.b2b_inquiries (claim_token_hash)
  WHERE claim_token_hash IS NOT NULL;

COMMENT ON COLUMN public.b2b_inquiries.user_id IS
  'Optional owner. Null for guest submits until claimed after signup/login.';
COMMENT ON COLUMN public.b2b_inquiries.claim_token_hash IS
  'SHA-256 of one-time claim token returned to guest submitter. Cleared after claim.';
COMMENT ON COLUMN public.b2b_inquiries.claim_token_expires_at IS
  'Expiry for guest claim token (typically 7 days).';

-- Owners may read their own inquiries (after link). Still no INSERT/UPDATE for non-admins
-- via client — writes go through service-role API routes.
DROP POLICY IF EXISTS "Users read own b2b_inquiries" ON public.b2b_inquiries;
CREATE POLICY "Users read own b2b_inquiries"
  ON public.b2b_inquiries
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users read own b2b_inquiry_lines" ON public.b2b_inquiry_lines;
CREATE POLICY "Users read own b2b_inquiry_lines"
  ON public.b2b_inquiry_lines
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.b2b_inquiries i
      WHERE i.id = b2b_inquiry_lines.inquiry_id
        AND i.user_id = auth.uid()
    )
  );

-- Explicit: anon has no table privileges (already revoked in 261; reinforce).
REVOKE ALL ON public.b2b_inquiries FROM anon;
REVOKE ALL ON public.b2b_inquiry_lines FROM anon;
