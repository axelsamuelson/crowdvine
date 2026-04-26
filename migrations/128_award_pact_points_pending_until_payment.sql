-- Migration 128: award_pact_points supports pending_until_payment
-- Date: 2026-04-26
-- Purpose: Allow provisional PACT Points redemptions for deferred payments.

CREATE OR REPLACE FUNCTION award_pact_points(
  p_user_id UUID,
  p_event_type TEXT,
  p_points_delta INTEGER,
  p_bottle_count INTEGER DEFAULT NULL,
  p_related_order_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_expires_in_days INTEGER DEFAULT 365,
  p_pending_until_payment BOOLEAN DEFAULT false
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
    related_order_id, related_user_id, description, expires_at,
    pending_until_payment
  ) VALUES (
    p_user_id, p_event_type, p_points_delta, p_bottle_count,
    p_related_order_id, p_related_user_id, p_description, v_expires_at,
    p_pending_until_payment
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

