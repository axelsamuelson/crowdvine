-- PACT Points: parallel ledger + balance columns (Impact Points unchanged).
-- Includes RPC award_pact_points, backfill from IP + unused milestone vouchers, and verification notices.

-- -----------------------------------------------------------------------------
-- 1. Columns on user_memberships
-- -----------------------------------------------------------------------------

ALTER TABLE user_memberships
  ADD COLUMN IF NOT EXISTS pact_points INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pact_points_lifetime INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pact_points_last_calculated TIMESTAMPTZ;

COMMENT ON COLUMN user_memberships.pact_points IS
  'Spendable balance. Decreases when user redeems at checkout. Increases when earned.';
COMMENT ON COLUMN user_memberships.pact_points_lifetime IS
  'Total points earned in rolling 12 months. Used for tier calculation.';

-- -----------------------------------------------------------------------------
-- 2. Ledger table
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS pact_points_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  points_delta INTEGER NOT NULL,
  bottle_count INTEGER,
  related_order_id UUID,
  related_user_id UUID REFERENCES auth.users(id),
  description TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pact_points_events_user_id ON pact_points_events(user_id);
CREATE INDEX IF NOT EXISTS idx_pact_points_events_created_at ON pact_points_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pact_points_events_expires_at ON pact_points_events(expires_at)
  WHERE expires_at IS NOT NULL;

-- event_type values (documentation):
-- 'own_order', 'welcome_bonus', 'invite_friend_first_order', 'review_after_delivery',
-- 'zone_set', 'redemption', 'expiration', 'migration_from_ip', 'migration_from_voucher',
-- 'manual_adjustment'

ALTER TABLE pact_points_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own pact points events" ON pact_points_events;
CREATE POLICY "Users can read own pact points events" ON pact_points_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can read all pact points events" ON pact_points_events;
CREATE POLICY "Admins can read all pact points events" ON pact_points_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "System can insert pact points events" ON pact_points_events;
CREATE POLICY "System can insert pact points events" ON pact_points_events
  FOR INSERT WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. RPC: award_pact_points
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION award_pact_points(
  p_user_id UUID,
  p_event_type TEXT,
  p_points_delta INTEGER,
  p_bottle_count INTEGER DEFAULT NULL,
  p_related_order_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 365
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
  v_expires_at TIMESTAMPTZ;
  v_row_count INTEGER;
BEGIN
  IF p_event_type = 'redemption' OR p_event_type = 'expiration' THEN
    v_expires_at := NULL;
  ELSE
    v_expires_at := NOW() + (p_expires_in_days || ' days')::INTERVAL;
  END IF;

  INSERT INTO pact_points_events (
    user_id, event_type, points_delta, bottle_count,
    related_order_id, related_user_id, description, expires_at
  ) VALUES (
    p_user_id, p_event_type, p_points_delta, p_bottle_count,
    p_related_order_id, p_related_user_id, p_description, v_expires_at
  );

  UPDATE user_memberships
  SET
    pact_points = pact_points + p_points_delta,
    pact_points_lifetime = pact_points_lifetime + GREATEST(0, p_points_delta),
    pact_points_last_calculated = NOW()
  WHERE user_id = p_user_id
  RETURNING pact_points INTO v_new_balance;

  GET DIAGNOSTICS v_row_count = ROW_COUNT;
  IF v_row_count = 0 OR v_new_balance IS NULL THEN
    RAISE EXCEPTION 'award_pact_points: no user_memberships row for user %', p_user_id;
  END IF;

  RETURN v_new_balance;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Pre-migration counts (logged as NOTICE for deploy logs)
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  v_ip_user_count INTEGER;
  v_voucher_user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_ip_user_count
  FROM user_memberships
  WHERE impact_points > 0;

  SELECT COUNT(DISTINCT earned_by_user_id) INTO v_voucher_user_count
  FROM discount_codes
  WHERE voucher_type = 'milestone'
    AND used_at IS NULL
    AND earned_by_user_id IS NOT NULL;

  RAISE NOTICE 'PACT migration (pre-apply): users with impact_points > 0 = %; distinct users with unused milestone vouchers = %',
    v_ip_user_count, v_voucher_user_count;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Migrate IP → PACT Points (1 IP = 5 PACT Points)
-- -----------------------------------------------------------------------------

INSERT INTO pact_points_events (
  user_id, event_type, points_delta, description, expires_at
)
SELECT
  user_id,
  'migration_from_ip',
  impact_points * 5,
  'Migrated from Impact Points (1 IP = 5 PACT Points)',
  NOW() + INTERVAL '365 days'
FROM user_memberships
WHERE impact_points > 0;

UPDATE user_memberships
SET
  pact_points = pact_points + (impact_points * 5),
  pact_points_lifetime = pact_points_lifetime + (impact_points * 5),
  pact_points_last_calculated = NOW()
WHERE impact_points > 0;

-- -----------------------------------------------------------------------------
-- 6. Migrate unused milestone vouchers → PACT Points
-- -----------------------------------------------------------------------------

-- Older DBs may have been created without supabase/migrations discount_codes columns.
ALTER TABLE discount_codes
  ADD COLUMN IF NOT EXISTS discount_amount_cents INTEGER,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Milestone mint uses fixed SEK value (see lib/membership/milestone-vouchers.ts).
-- Prefer stored cents / 100; if unset, 500 PACT Points per voucher.
INSERT INTO pact_points_events (
  user_id, event_type, points_delta, description, expires_at
)
SELECT
  earned_by_user_id,
  'migration_from_voucher',
  COALESCE(NULLIF(discount_amount_cents, 0) / 100, 500),
  'Migrated from milestone voucher (' || code || ')',
  NOW() + INTERVAL '365 days'
FROM discount_codes
WHERE voucher_type = 'milestone'
  AND used_at IS NULL
  AND earned_by_user_id IS NOT NULL;

UPDATE user_memberships um
SET
  pact_points = pact_points + COALESCE((
    SELECT SUM(COALESCE(NULLIF(dc.discount_amount_cents, 0) / 100, 500))
    FROM discount_codes dc
    WHERE dc.earned_by_user_id = um.user_id
      AND dc.voucher_type = 'milestone'
      AND dc.used_at IS NULL
  ), 0),
  pact_points_lifetime = pact_points_lifetime + COALESCE((
    SELECT SUM(COALESCE(NULLIF(dc.discount_amount_cents, 0) / 100, 500))
    FROM discount_codes dc
    WHERE dc.earned_by_user_id = um.user_id
      AND dc.voucher_type = 'milestone'
      AND dc.used_at IS NULL
  ), 0),
  pact_points_last_calculated = NOW()
WHERE EXISTS (
  SELECT 1 FROM discount_codes dc
  WHERE dc.earned_by_user_id = um.user_id
    AND dc.voucher_type = 'milestone'
    AND dc.used_at IS NULL
);

UPDATE discount_codes
SET
  is_active = false,
  updated_at = NOW()
WHERE voucher_type = 'milestone'
  AND used_at IS NULL;

-- -----------------------------------------------------------------------------
-- 7. Post-migration verification (re-run these in SQL editor if needed)
-- -----------------------------------------------------------------------------
-- SELECT COUNT(DISTINCT user_id) FROM pact_points_events WHERE event_type = 'migration_from_ip';
-- SELECT COUNT(*) FROM pact_points_events WHERE event_type = 'migration_from_ip';
-- SELECT COUNT(DISTINCT user_id) FROM pact_points_events WHERE event_type = 'migration_from_voucher';
-- SELECT COUNT(*) FROM pact_points_events WHERE event_type = 'migration_from_voucher';

DO $$
DECLARE
  v_ip_events INTEGER;
  v_ip_distinct_users INTEGER;
  v_voucher_events INTEGER;
  v_voucher_distinct_users INTEGER;
BEGIN
  SELECT COUNT(*), COUNT(DISTINCT user_id)
  INTO v_ip_events, v_ip_distinct_users
  FROM pact_points_events
  WHERE event_type = 'migration_from_ip';

  SELECT COUNT(*), COUNT(DISTINCT user_id)
  INTO v_voucher_events, v_voucher_distinct_users
  FROM pact_points_events
  WHERE event_type = 'migration_from_voucher';

  RAISE NOTICE 'PACT migration (post-apply): migration_from_ip rows=%, distinct users=%; migration_from_voucher rows=%, distinct users=%',
    v_ip_events, v_ip_distinct_users, v_voucher_events, v_voucher_distinct_users;
END $$;
