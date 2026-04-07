-- Live metrics attached to admin objectives (cached values + RPC refresh)

CREATE TABLE admin_objective_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id    UUID NOT NULL REFERENCES admin_objectives(id) ON DELETE CASCADE,
  slug            TEXT NOT NULL,
  label           TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT '',
  query_type      TEXT NOT NULL CHECK (
    query_type IN ('count', 'ratio', 'average', 'sum', 'custom')
  ),
  query_config    JSONB NOT NULL DEFAULT '{}',
  target_value    NUMERIC,
  current_value   NUMERIC NOT NULL DEFAULT 0,
  refreshed_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  period_type     TEXT NOT NULL DEFAULT 'all_time' CHECK (
    period_type IN (
      'all_time',
      'last_7_days',
      'last_30_days',
      'last_90_days',
      'current_month',
      'custom'
    )
  ),
  period_start    TIMESTAMPTZ,
  period_end      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_admin_objective_metrics_objective
  ON admin_objective_metrics(objective_id);

CREATE UNIQUE INDEX idx_admin_objective_metrics_objective_slug
  ON admin_objective_metrics(objective_id, slug);

COMMENT ON TABLE admin_objective_metrics IS
  'Metric definitions and cached values for objectives; refreshed via admin_refresh_objective_metrics.';
