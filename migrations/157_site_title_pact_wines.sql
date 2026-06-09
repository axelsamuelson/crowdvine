-- Ensure default site title uses PACT Wines branding in meta tags
INSERT INTO site_content (key, value, type, description)
VALUES (
  'site_title',
  'PACT Wines — Naturvin direkt från Languedoc',
  'text',
  'Default site title for meta tags'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW()
WHERE site_content.value ILIKE '%PACT%'
  AND site_content.value NOT ILIKE '%PACT Wines%';
