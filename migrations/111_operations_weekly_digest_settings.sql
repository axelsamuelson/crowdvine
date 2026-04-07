-- Weekly Operations digest email: enable/disable + last successful send (dedupe).

CREATE TABLE admin_operations_weekly_digest_settings (
  id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO admin_operations_weekly_digest_settings (id, enabled)
VALUES ('default', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE INDEX idx_admin_task_activity_created_at ON admin_task_activity (created_at DESC);

COMMENT ON TABLE admin_operations_weekly_digest_settings IS 'Controls weekly Operations email to admins (Sunday 12:00 Europe/Stockholm, Vercel cron).';
