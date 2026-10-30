-- Global Live/Pause for automated menu extraction (cron + alerts).
-- "true" = paused, "false"/missing = live.
INSERT INTO site_content (key, value, type, description)
VALUES (
  'menu_pipeline_paused',
  'false',
  'text',
  'When true, menu pipeline crons and alert delivery are paused'
)
ON CONFLICT (key) DO NOTHING;
