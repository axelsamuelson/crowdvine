-- Analytics V2 etapp 1 — E5: soft-clean historical D1 prerender sessions.
-- Prefer flag table over DELETE of user_events. TEST-only apply by agent.

CREATE TABLE IF NOT EXISTS analytics_prerender_discarded_sessions (
  session_id text PRIMARY KEY,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  rule text NOT NULL DEFAULT 'd1_chrome_ios_wine_prerender',
  started_at timestamptz,
  landing_path text
);

INSERT INTO analytics_prerender_discarded_sessions (
  session_id, started_at, landing_path, rule
)
SELECT
  s.session_id,
  s.started_at,
  analytics_path_from_url(s.landing_url),
  'd1_chrome_ios_wine_prerender'
FROM (
  SELECT
    ue.session_id,
    MIN(ue.created_at) AS started_at,
    (ARRAY_AGG(ue.page_url ORDER BY ue.created_at ASC))[1] AS landing_url,
    (ARRAY_AGG(ue.referrer ORDER BY ue.created_at ASC))[1] AS referrer,
    (ARRAY_AGG(ue.user_agent ORDER BY ue.created_at ASC))[1] AS user_agent,
    BOOL_OR(ue.event_type = 'session_engaged') AS engaged
  FROM user_events ue
  WHERE ue.session_id IS NOT NULL
    AND ue.session_id NOT LIKE 'server\_%' ESCAPE '\'
    AND ue.created_at >= TIMESTAMPTZ '2026-11-02 00:00:00+00'
  GROUP BY ue.session_id
) s
WHERE analytics_is_prerender_suspect(
  s.started_at, s.landing_url, s.referrer, s.user_agent, s.engaged
)
ON CONFLICT (session_id) DO NOTHING;

-- Ensure annotation exists
INSERT INTO admin_analytics_annotations (
  date, occurred_at, label, category, site, source
)
SELECT
  (now() AT TIME ZONE 'Europe/Stockholm')::date,
  now(),
  'Bottfilter v2 aktivt',
  'incident',
  'pact',
  'e5'
WHERE NOT EXISTS (
  SELECT 1 FROM admin_analytics_annotations
  WHERE label = 'Bottfilter v2 aktivt'
);
