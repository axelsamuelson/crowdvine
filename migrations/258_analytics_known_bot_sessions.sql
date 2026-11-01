-- Known Dirty Wine iPhone bot: CriOS on iPhone OS 26_6_2, exactly 2 events,
-- no product_viewed. Reusable so other analytics views can exclude the same set.
-- Chrome version may drift (153→155); OS + CriOS + session shape is the signal.

CREATE OR REPLACE VIEW analytics_known_bot_sessions AS
SELECT ue.session_id
FROM user_events ue
GROUP BY ue.session_id
HAVING
  COUNT(*) = 2
  AND BOOL_AND(
    ue.user_agent IS NOT NULL
    AND ue.user_agent ~* 'CriOS'
    AND ue.user_agent ~* 'iPhone OS 26_6_2'
  )
  AND NOT BOOL_OR(ue.event_type = 'product_viewed');

COMMENT ON VIEW analytics_known_bot_sessions IS
  'Sessions matching the known Dirty Wine CriOS/iOS 26_6_2 bot (2 events, no product_viewed).';

CREATE OR REPLACE FUNCTION public.is_known_bot_session(p_session_id text)
RETURNS boolean
LANGUAGE sql
STABLE
PARALLEL SAFE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM analytics_known_bot_sessions k
    WHERE k.session_id = p_session_id
  );
$$;

COMMENT ON FUNCTION public.is_known_bot_session(text) IS
  'True when session_id matches analytics_known_bot_sessions (CriOS + iOS 26_6_2, 2 events, no product view).';

REVOKE ALL ON public.analytics_known_bot_sessions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.analytics_known_bot_sessions TO service_role;

REVOKE ALL ON FUNCTION public.is_known_bot_session(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_known_bot_session(text) TO service_role;

-- Fold known-bot exclusion into the shared clean view (same columns; dependents keep working).
CREATE OR REPLACE VIEW analytics_sessions_clean AS
WITH base AS (
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
    )
    AND (
      ue.visitor_id IS NULL
      OR NOT EXISTS (
        SELECT 1
        FROM analytics_internal_visitor_ids iv
        WHERE iv.visitor_id = ue.visitor_id
      )
    )
    AND NOT public.is_known_bot_session(ue.session_id)
),
site_counts AS (
  SELECT
    b.session_id,
    analytics_site(b.page_url) AS site,
    COUNT(*)::int AS n
  FROM base b
  WHERE analytics_site(b.page_url) IS NOT NULL
  GROUP BY b.session_id, analytics_site(b.page_url)
),
dominant_site AS (
  SELECT DISTINCT ON (session_id)
    session_id,
    site
  FROM site_counts
  ORDER BY session_id, n DESC, site ASC
),
entry AS (
  SELECT DISTINCT ON (session_id)
    session_id,
    referrer,
    page_url,
    event_metadata
  FROM base
  ORDER BY session_id, created_at ASC
),
session_channel AS (
  SELECT
    e.session_id,
    analytics_channel(
      e.referrer,
      COALESCE(
        NULLIF(e.event_metadata->>'utm_source', ''),
        NULLIF(e.event_metadata->>'first_utm_source', ''),
        analytics_utm_param(e.page_url, 'utm_source')
      ),
      COALESCE(
        NULLIF(e.event_metadata->>'utm_medium', ''),
        NULLIF(e.event_metadata->>'first_utm_medium', ''),
        analytics_utm_param(e.page_url, 'utm_medium')
      )
    ) AS channel
  FROM entry e
)
SELECT
  b.*,
  d.site,
  sc.channel
FROM base b
INNER JOIN dominant_site d ON d.session_id = b.session_id
LEFT JOIN session_channel sc ON sc.session_id = b.session_id;

COMMENT ON VIEW analytics_sessions_clean IS
  'Clean user_events with visitor_id, country_code, session-level site, channel, and known CriOS/iOS bot sessions excluded.';
