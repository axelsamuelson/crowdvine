-- Brand copy: shared-pallet framing for CMS site/hero keys.
-- Idempotent upserts by key. Do not run against production from this agent.

INSERT INTO public.site_content (key, value, type, description)
VALUES
  (
    'site_description',
    'Natural wine from several French regions, on shared pallets.',
    'text',
    'Default site description for meta tags'
  ),
  (
    'homepage_hero_title',
    'natural wine from France, on shared pallets',
    'text',
    'Main hero title on homepage'
  ),
  (
    'homepage_hero_title_sv',
    'naturvin från Frankrike, på delade pallar',
    'text',
    'Swedish main hero title on homepage'
  ),
  (
    'homepage_hero_description_1',
    'Orders travel together on shared pallets.',
    'text',
    'Hero description line 1 on homepage'
  ),
  (
    'homepage_hero_description_1_sv',
    'Beställningarna skickas tillsammans på delade pallar.',
    'text',
    'Swedish hero description line 1 on homepage'
  ),
  (
    'homepage_hero_subtitle',
    'A new way to buy wine, for those who drink it, but also for those who produce it.',
    'text',
    'Hero subtitle on homepage'
  ),
  (
    'homepage_hero_subtitle_sv',
    'Ett nytt sätt att köpa vin på, för de som dricker men även för de som producerar. ',
    'text',
    'Swedish hero subtitle on homepage'
  )
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description,
  updated_at = NOW();
