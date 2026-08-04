-- Internal tasting notes (admin-only) + moderated customer reviews on wines.
-- Idempotent. Does not alter wines, wine_tasting_ratings, or profiles.

-- ---------------------------------------------------------------------------
-- 1. wine_internal_ratings
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wine_internal_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  rater_id uuid NOT NULL REFERENCES profiles(id),
  score smallint CHECK (score BETWEEN 1 AND 100),
  verdict text CHECK (verdict IN ('buy', 'maybe', 'pass')),
  notes text,
  tasted_at date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wir_wine ON wine_internal_ratings(wine_id);

COMMENT ON TABLE wine_internal_ratings IS
  'Internal staff tasting scores/verdicts. Admin-only via RLS.';

-- ---------------------------------------------------------------------------
-- 2. wine_customer_reviews
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS wine_customer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wine_id uuid NOT NULL REFERENCES wines(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score BETWEEN 1 AND 5),
  body text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'published', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wine_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_wcr_wine_status
  ON wine_customer_reviews(wine_id, status);

COMMENT ON TABLE wine_customer_reviews IS
  'Customer wine reviews (1–5). Public read only when status = published.';

-- ---------------------------------------------------------------------------
-- 3. RLS — wine_internal_ratings (admin ALL only; no anon access)
-- ---------------------------------------------------------------------------

ALTER TABLE wine_internal_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage wine_internal_ratings"
  ON wine_internal_ratings;

CREATE POLICY "Admins can manage wine_internal_ratings"
  ON wine_internal_ratings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 3. RLS — wine_customer_reviews
-- ---------------------------------------------------------------------------

ALTER TABLE wine_customer_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can select published or own wine_customer_reviews"
  ON wine_customer_reviews;
DROP POLICY IF EXISTS "Users can insert own pending wine_customer_reviews"
  ON wine_customer_reviews;
DROP POLICY IF EXISTS "Users can update own unpublished wine_customer_reviews"
  ON wine_customer_reviews;
DROP POLICY IF EXISTS "Admins can manage wine_customer_reviews"
  ON wine_customer_reviews;

CREATE POLICY "Anyone can select published or own wine_customer_reviews"
  ON wine_customer_reviews
  FOR SELECT
  USING (status = 'published' OR user_id = auth.uid());

CREATE POLICY "Users can insert own pending wine_customer_reviews"
  ON wine_customer_reviews
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "Users can update own unpublished wine_customer_reviews"
  ON wine_customer_reviews
  FOR UPDATE
  USING (user_id = auth.uid() AND status <> 'published');

CREATE POLICY "Admins can manage wine_customer_reviews"
  ON wine_customer_reviews
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 4. updated_at trigger on wine_customer_reviews
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_wine_customer_reviews_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wine_customer_reviews_updated_at
  ON wine_customer_reviews;

CREATE TRIGGER trg_wine_customer_reviews_updated_at
  BEFORE UPDATE ON wine_customer_reviews
  FOR EACH ROW
  EXECUTE FUNCTION set_wine_customer_reviews_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Aggregated published review stats (RLS via security_invoker)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW wine_customer_review_stats
WITH (security_invoker = true) AS
SELECT
  wine_id,
  round(avg(score)::numeric, 2) AS avg_score,
  count(*) AS review_count
FROM wine_customer_reviews
WHERE status = 'published'
GROUP BY wine_id;
