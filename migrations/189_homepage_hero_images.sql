-- Homepage hero frame images (CMS-editable; app falls back to these defaults)
INSERT INTO site_content (key, value, type, description)
VALUES
  (
    'homepage_hero_image_1',
    '/images/hero_bild_5.webp',
    'image',
    'Homepage hero image frame 1 (left)'
  ),
  (
    'homepage_hero_image_2',
    '/images/hero_bild_4.webp',
    'image',
    'Homepage hero image frame 2 (center)'
  ),
  (
    'homepage_hero_image_3',
    '/images/hero-side-2.png',
    'image',
    'Homepage hero image frame 3 (right)'
  )
ON CONFLICT (key) DO NOTHING;
