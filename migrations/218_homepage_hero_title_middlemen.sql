-- Homepage hero title: "wine without the middlemen"
INSERT INTO site_content (key, value, type, description)
VALUES
  (
    'homepage_hero_title',
    E'wine without\nthe middlemen',
    'text',
    'Main hero title on homepage'
  ),
  (
    'homepage_hero_title_sv',
    E'wine without\nthe middlemen',
    'text',
    'Swedish main hero title on homepage'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
