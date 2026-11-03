-- Homepage hero title: pallet wording. Replaces the middlemen headline.

INSERT INTO site_content (key, value, type, description)
VALUES
  (
    'homepage_hero_title',
    'natural wine by the pallet',
    'text',
    'Main hero title on homepage'
  ),
  (
    'homepage_hero_title_sv',
    'naturvin per pall',
    'text',
    'Swedish main hero title on homepage'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
