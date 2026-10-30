-- Exclude sessions that contain any internally tagged device event.
-- Session-level: one event with event_metadata.internal = true marks the whole session.

CREATE OR REPLACE VIEW analytics_sessions_clean AS
SELECT ue.*
FROM user_events ue
WHERE
  (
    ue.user_id IS NULL
    OR ue.user_id NOT IN (
      SELECT e.profile_id FROM admin_metrics_excluded_profiles e
    )
  )
  AND (
    ue.user_agent IS NULL
    OR ue.user_agent !~* 'bot|crawl|spider|headless|lighthouse|slurp'
  )
  AND ue.session_id NOT LIKE 'server\_%'
  AND (
    ue.referrer IS NULL
    OR ue.referrer NOT ILIKE '%localhost%'
  )
  AND ue.session_id NOT IN (
    SELECT DISTINCT e.session_id
    FROM user_events e
    WHERE e.event_metadata->>'internal' = 'true'
      AND e.session_id IS NOT NULL
  );

COMMENT ON VIEW analytics_sessions_clean IS
  'user_events excluding internal profiles, bot UAs, server-side inserts, localhost referrers, and sessions tagged internal via device flag. Used by admin Trafik analytics.';
