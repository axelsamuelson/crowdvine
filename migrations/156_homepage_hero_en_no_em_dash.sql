-- English homepage hero copy (CMS overrides; app falls back to messages/home.*)
INSERT INTO site_content (key, value, type, description)
VALUES
  (
    'homepage_hero_subtitle',
    'Crowdsourcing directly from winemakers.',
    'text',
    'Hero subtitle on homepage'
  ),
  (
    'homepage_hero_description_1',
    'A smarter way to buy wine together.',
    'text',
    'Hero description line 1 on homepage'
  ),
  (
    'homepage_hero_description_2',
    'Discover new producers every week.',
    'text',
    'Hero description line 2 on homepage'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
