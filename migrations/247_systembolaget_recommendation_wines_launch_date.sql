-- Migration 247: Expose product_launch_date on systembolaget_recommendation_wines.
-- Appended last so CREATE OR REPLACE stays compatible with prior view shapes.
-- Keeps security_invoker from migration 243.

CREATE OR REPLACE VIEW public.systembolaget_recommendation_wines
WITH (security_invoker = true)
AS
SELECT
  r.id,
  r.issue_year,
  r.issue_week,
  r.product_number,
  r.editorial_note_sv,
  r.editorial_note_en,
  r.sort_order,
  r.published_at,
  p.name_bold,
  p.name_thin,
  p.producer_name,
  p.category_level_2,
  p.country,
  p.origin_level_1,
  p.vintage,
  p.price,
  p.volume,
  p.alcohol_percentage,
  p.grapes,
  p.assortment_text,
  p.is_organic,
  p.image_url,
  p.synced_at,
  p.availability_state,
  p.store_count,
  p.product_launch_date
FROM public.systembolaget_recommendations r
JOIN public.systembolaget_products p USING (product_number)
WHERE r.is_published = true
  AND p.availability_state = ANY (ARRAY['available'::text, 'limited'::text]);

COMMENT ON VIEW public.systembolaget_recommendation_wines IS
  'Published weekly-issue Systembolaget wines (available/limited) with product_launch_date for the release calendar.';

GRANT SELECT ON public.systembolaget_recommendation_wines TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
