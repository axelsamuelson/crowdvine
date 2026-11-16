-- Migration 296: Admin analytics performance indexes + SQL aggregate RPC.
-- TEST/prod apply separately. Do NOT run against prod from agents.
--
-- Notes:
-- - Repo migrations run in a transaction, so CREATE INDEX CONCURRENTLY is not
--   used here (Postgres forbids CONCURRENTLY inside a transaction). For a
--   zero-downtime prod apply, run the equivalent CONCURRENTLY statements
--   manually outside a transaction, then mark this migration applied.
-- - Indexes speed date/site/session/event_type filters used by
--   fetchEventsInDateChunks against user_events / analytics_sessions_clean.

CREATE INDEX IF NOT EXISTS idx_user_events_session_id
  ON public.user_events (session_id);

CREATE INDEX IF NOT EXISTS idx_user_events_session_created_at
  ON public.user_events (session_id, created_at);

CREATE INDEX IF NOT EXISTS idx_user_events_event_type_created_at
  ON public.user_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_created_at_site
  ON public.user_events (created_at DESC, site);

-- Daily visitor/session aggregates over clean events (bots/server/internal
-- filtered the same way as analytics_sessions_clean on TEST bootstrap /
-- migration 258-style filters). Used for equality checks vs JS aggregation.
CREATE OR REPLACE FUNCTION public.admin_analytics_daily_traffic(
  p_since timestamptz,
  p_until timestamptz DEFAULT now(),
  p_site text DEFAULT NULL
)
RETURNS TABLE (
  day date,
  visitors bigint,
  sessions bigint
)
LANGUAGE sql
STABLE
AS $$
  WITH clean AS (
    SELECT
      ue.session_id,
      CASE
        WHEN ue.visitor_id IS NOT NULL AND btrim(ue.visitor_id) <> ''
          THEN btrim(ue.visitor_id)
        ELSE 'session:' || ue.session_id
      END AS visitor_key,
      ((ue.created_at AT TIME ZONE 'Europe/Stockholm')::date) AS day
    FROM public.user_events ue
    WHERE ue.created_at >= p_since
      AND ue.created_at < p_until
      AND (p_site IS NULL OR ue.site = p_site)
      AND (ue.user_agent IS NULL OR ue.user_agent !~* 'bot|crawl|spider|headless|lighthouse|slurp')
      AND (ue.session_id IS NULL OR ue.session_id NOT LIKE 'server\_%' ESCAPE '\')
      AND (ue.referrer IS NULL OR ue.referrer NOT ILIKE '%localhost%')
      AND COALESCE(ue.event_metadata->>'internal', '') IS DISTINCT FROM 'true'
  )
  SELECT
    c.day,
    COUNT(DISTINCT c.visitor_key)::bigint AS visitors,
    COUNT(DISTINCT c.session_id)::bigint AS sessions
  FROM clean c
  GROUP BY c.day
  ORDER BY c.day;
$$;

COMMENT ON FUNCTION public.admin_analytics_daily_traffic(timestamptz, timestamptz, text) IS
  'Admin analytics: daily distinct visitors/sessions from clean user_events (Stockholm civil dates).';

REVOKE ALL ON FUNCTION public.admin_analytics_daily_traffic(timestamptz, timestamptz, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_analytics_daily_traffic(timestamptz, timestamptz, text) TO service_role;
