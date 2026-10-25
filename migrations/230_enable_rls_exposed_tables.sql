-- Enable RLS on the 26 public tables that were exposed with the anon key.
-- Skips any table that already has RLS. No write policies for anon.
--
-- A. Service role only (no policies): cross_domain_codes, menu_extraction_batches,
--    b2b pallet shipments, and every admin_* table.
-- B. Public read: pallets, wine_boxes, wine_box_items, wine_images, shipping_regions.
--    Wine-box and wine-image writes go through service role after an admin check.
-- C. Public read, no anon write: followers (list route uses the session client)
--    and the three tasting tables (QR writes are service role; live updates are
--    anon Realtime subscriptions, which need SELECT).

DO $$
DECLARE
  service_only text[] := ARRAY[
    'cross_domain_codes',
    'menu_extraction_batches',
    'b2b_pallet_shipments',
    'b2b_pallet_shipment_items',
    'admin_objectives',
    'admin_key_results',
    'admin_projects',
    'admin_tasks',
    'admin_task_dependencies',
    'admin_task_comments',
    'admin_task_activity',
    'admin_entity_links',
    'admin_task_templates',
    'admin_goals',
    'admin_objective_metrics',
    'admin_task_assignees',
    'admin_operations_weekly_digest_settings'
  ];
  public_read text[] := ARRAY[
    'pallets',
    'wine_boxes',
    'wine_box_items',
    'wine_images',
    'shipping_regions',
    'followers',
    'wine_tasting_sessions',
    'wine_tasting_participants',
    'wine_tasting_ratings'
  ];
  t text;
  policy_name text;
BEGIN
  FOREACH t IN ARRAY service_only LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND c.relkind = 'r'
        AND NOT c.relrowsecurity
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    END IF;
  END LOOP;

  FOREACH t IN ARRAY public_read LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = t
        AND c.relkind = 'r'
        AND NOT c.relrowsecurity
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      policy_name := t || '_select_public';
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', policy_name, t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (true)',
        policy_name,
        t
      );
    END IF;
  END LOOP;
END $$;
