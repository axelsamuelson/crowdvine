-- Testköp exclusion metadata + RLS + funnel view hardening.

ALTER TABLE admin_metrics_excluded_profiles
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS source_discount_code_id uuid
    REFERENCES promo_discount_codes(id) ON DELETE SET NULL;

COMMENT ON COLUMN admin_metrics_excluded_profiles.reason IS
  'testkop | manuell | other short reason key';
COMMENT ON COLUMN admin_metrics_excluded_profiles.source_discount_code_id IS
  'promo_discount_codes.id when exclusion came from a testköp code';

-- Backfill reason from note when missing
UPDATE admin_metrics_excluded_profiles
SET reason = 'manuell'
WHERE reason IS NULL OR btrim(reason) = '';

ALTER TABLE admin_metrics_excluded_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can select excluded profiles"
  ON admin_metrics_excluded_profiles;
DROP POLICY IF EXISTS "Admins can insert excluded profiles"
  ON admin_metrics_excluded_profiles;
DROP POLICY IF EXISTS "Admins can update excluded profiles"
  ON admin_metrics_excluded_profiles;
DROP POLICY IF EXISTS "Admins can delete excluded profiles"
  ON admin_metrics_excluded_profiles;

CREATE POLICY "Admins can select excluded profiles"
  ON admin_metrics_excluded_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can insert excluded profiles"
  ON admin_metrics_excluded_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can update excluded profiles"
  ON admin_metrics_excluded_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

CREATE POLICY "Admins can delete excluded profiles"
  ON admin_metrics_excluded_profiles
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND (
          profiles.role = 'admin'
          OR (profiles.roles IS NOT NULL AND 'admin' = ANY (profiles.roles))
        )
    )
  );

-- Funnel: exclude excluded profiles + events tagged internal.
CREATE OR REPLACE VIEW user_journey_funnel AS
SELECT
  user_id,
  MIN(CASE WHEN event_type = 'access_request_submitted' THEN created_at END) AS access_requested_at,
  MIN(CASE WHEN event_type = 'access_approved' THEN created_at END) AS access_approved_at,
  MIN(CASE WHEN event_type = 'user_first_login' THEN created_at END) AS first_login_at,
  MIN(CASE WHEN event_type = 'product_viewed' THEN created_at END) AS first_product_view_at,
  MIN(CASE WHEN event_type = 'add_to_cart' THEN created_at END) AS first_add_to_cart_at,
  MIN(CASE WHEN event_type = 'cart_validation_passed' THEN created_at END) AS cart_validation_passed_at,
  MIN(CASE WHEN event_type = 'checkout_started' THEN created_at END) AS checkout_started_at,
  MIN(CASE WHEN event_type = 'reservation_completed' THEN created_at END) AS reservation_completed_at
FROM user_events
WHERE user_id IS NOT NULL
  AND user_id NOT IN (
    SELECT e.profile_id FROM admin_metrics_excluded_profiles e
  )
  AND COALESCE(event_metadata->>'internal', '') <> 'true'
GROUP BY user_id;

COMMENT ON VIEW user_journey_funnel IS
  'Per-user funnel timestamps; excludes admin_metrics_excluded_profiles and events with event_metadata.internal = true.';
