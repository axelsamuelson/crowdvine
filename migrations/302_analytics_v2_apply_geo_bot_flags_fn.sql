-- Analytics V2 etapp 1 — post-refresh geo-bot applicator (v1.2).
-- Soft flag only; never DELETE user_events.
-- Cron calls analytics_apply_geo_bot_flags() after analytics_refresh_session_facts.

CREATE OR REPLACE FUNCTION analytics_apply_geo_bot_flags()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_flagged int := 0;
BEGIN
  INSERT INTO analytics_geo_bot_discarded_sessions (
    session_id, country_code, started_at, events, duration_s, rule
  )
  SELECT
    f.session_id,
    f.country_code,
    f.started_at,
    f.events,
    f.duration_s,
    'geo_cn_sg_hk_direct_short'
  FROM analytics_session_facts f
  WHERE analytics_is_geo_bot_suspect(
    f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
  )
  ON CONFLICT (session_id) DO NOTHING;

  UPDATE analytics_session_facts f
  SET
    is_geo_bot_suspect = true,
    is_clean = false,
    exclusion_reason = CASE
      WHEN f.exclusion_reason IS NULL OR f.exclusion_reason = '' THEN 'geo_bot_suspect'
      WHEN f.exclusion_reason = 'geo_bot_suspect' THEN f.exclusion_reason
      ELSE f.exclusion_reason
    END
  WHERE analytics_is_geo_bot_suspect(
    f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
  )
  OR EXISTS (
    SELECT 1 FROM analytics_geo_bot_discarded_sessions d
    WHERE d.session_id = f.session_id
  );

  GET DIAGNOSTICS v_flagged = ROW_COUNT;

  UPDATE analytics_session_facts f
  SET
    is_geo_bot_suspect = false,
    is_clean = CASE
      WHEN f.exclusion_reason = 'geo_bot_suspect'
           AND NOT f.is_prerender_suspect
        THEN true
      ELSE f.is_clean
    END,
    exclusion_reason = CASE
      WHEN f.exclusion_reason = 'geo_bot_suspect' THEN NULL
      ELSE f.exclusion_reason
    END
  WHERE f.is_geo_bot_suspect
    AND NOT analytics_is_geo_bot_suspect(
      f.country_code, f.channel, f.duration_s, f.events, f.is_engaged
    )
    AND NOT EXISTS (
      SELECT 1 FROM analytics_geo_bot_discarded_sessions d
      WHERE d.session_id = f.session_id
    );

  RETURN jsonb_build_object('ok', true, 'flagged', v_flagged);
END;
$$;

REVOKE ALL ON FUNCTION analytics_apply_geo_bot_flags() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION analytics_apply_geo_bot_flags() TO service_role;

COMMENT ON FUNCTION analytics_apply_geo_bot_flags() IS
  'v1.2: soft-flag CN/SG/HK direct short sessions after facts refresh. No DELETE.';
