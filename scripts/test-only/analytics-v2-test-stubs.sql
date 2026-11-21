-- TEST ONLY (msdfjrrokcmjifetuwgc). Never run against prod (abrnvjqwpdkodgrtezeg).
-- Creates missing exclusion helpers so analytics_refresh_session_facts can run on TEST.
-- Safe for re-run: only creates objects that are missing; never REVOKEs grants on
-- an existing table (prod has authenticated admin policies on these).

DO $$
BEGIN
  IF current_setting('pact.allow_test_analytics_seed', true)
       IS DISTINCT FROM 'msdfjrrokcmjifetuwgc' THEN
    RAISE EXCEPTION
      'Refusing TEST stubs outside TEST. Run: SELECT set_config(''pact.allow_test_analytics_seed'', ''msdfjrrokcmjifetuwgc'', true);';
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.admin_metrics_excluded_profiles') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE public.admin_metrics_excluded_profiles (
        profile_id uuid PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    $sql$;
    EXECUTE 'REVOKE ALL ON TABLE public.admin_metrics_excluded_profiles FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.admin_metrics_excluded_profiles TO service_role';
  END IF;

  IF to_regclass('public.analytics_internal_visitor_ids') IS NULL THEN
    EXECUTE $sql$
      CREATE TABLE public.analytics_internal_visitor_ids (
        visitor_id text PRIMARY KEY,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    $sql$;
    EXECUTE 'REVOKE ALL ON TABLE public.analytics_internal_visitor_ids FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT SELECT ON TABLE public.analytics_internal_visitor_ids TO service_role';
  END IF;

  IF to_regprocedure('public.is_known_bot_session(text)') IS NULL THEN
    EXECUTE $fn$
      CREATE FUNCTION public.is_known_bot_session(p_session_id text)
      RETURNS boolean
      LANGUAGE sql
      STABLE
      PARALLEL SAFE
      SET search_path = public
      AS $body$ SELECT false $body$
    $fn$;
    EXECUTE 'REVOKE ALL ON FUNCTION public.is_known_bot_session(text) FROM PUBLIC, anon, authenticated';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_known_bot_session(text) TO service_role';
  END IF;
END $$;
