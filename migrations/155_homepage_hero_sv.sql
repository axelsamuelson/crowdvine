-- Swedish homepage hero copy (optional CMS overrides; app falls back to messages/home.*)
INSERT INTO site_content (key, value, type, description)
VALUES
  (
    'homepage_hero_title_sv',
    'Producenter och konsumenter, tillsammans.',
    'text',
    'Swedish main hero title on homepage'
  ),
  (
    'homepage_hero_subtitle_sv',
    'Vin direkt från producenten.',
    'text',
    'Swedish hero subtitle on homepage'
  ),
  (
    'homepage_hero_description_1_sv',
    'Handla tillsammans i pallar och få bättre priser.',
    'text',
    'Swedish hero description line 1'
  ),
  (
    'homepage_hero_description_2_sv',
    'Upptäck nya producenter varje vecka.',
    'text',
    'Swedish hero description line 2'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
