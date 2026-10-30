-- Migration 243: Clear Supabase security advisor ERROR/WARN findings.
-- Does not address INFO "RLS enabled no policy", pg_trgm schema, Postgres
-- upgrade, or leaked-password protection (out of scope).
--
-- 1) security_definer_view: set security_invoker on three public views.
--    analytics_intent_sessions is admin/service_role only (re-lock grants;
--    CREATE OR REPLACE in 240 restored anon/authenticated access after 233).
--    systembolaget_* stay readable by anon/authenticated; underlying tables
--    already have published/public SELECT RLS, so invoker semantics match
--    the intended public guide surface. App readers use getSupabaseAdmin
--    (service_role) and continue to work.
-- 2) systembolaget_promote_products (4-arg SECURITY DEFINER): revoke EXECUTE
--    from PUBLIC/anon/authenticated; keep service_role. Caller is
--    lib/systembolaget/sync.ts via getSupabaseAdmin only. Migration 237
--    revoked PUBLIC but left direct anon/authenticated EXECUTE grants.
-- 3) function_search_path_mutable: lock search_path = public, pg_temp on the
--    54 flagged public functions (same pattern as 234). Bodies already use
--    public objects / schema-qualified auth.*; similarity() lives in public
--    (pg_trgm). Empty search_path was skipped to avoid rewriting unqualified
--    table references.

-- ---------------------------------------------------------------------------
-- 1) Views → security_invoker
-- ---------------------------------------------------------------------------

ALTER VIEW public.analytics_intent_sessions SET (security_invoker = true);
ALTER VIEW public.systembolaget_guide_wines SET (security_invoker = true);
ALTER VIEW public.systembolaget_recommendation_wines SET (security_invoker = true);

REVOKE ALL ON public.analytics_intent_sessions FROM anon, authenticated;
GRANT SELECT ON public.analytics_intent_sessions TO service_role;

REVOKE ALL ON public.systembolaget_guide_wines FROM anon, authenticated;
REVOKE ALL ON public.systembolaget_recommendation_wines FROM anon, authenticated;
GRANT SELECT ON public.systembolaget_guide_wines TO anon, authenticated, service_role;
GRANT SELECT ON public.systembolaget_recommendation_wines TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2) Promote RPC — service_role only
-- ---------------------------------------------------------------------------

REVOKE EXECUTE ON FUNCTION public.systembolaget_promote_products(text[], text, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.systembolaget_promote_products(text[], text, text, boolean)
  TO service_role;

-- ---------------------------------------------------------------------------
-- 3) Lock search_path on mutable public functions
-- ---------------------------------------------------------------------------

ALTER FUNCTION public.analytics_channel(text, text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.analytics_site(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.analytics_utm_param(text, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_impact_points(uuid, ip_event_type, integer, uuid, uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_wine_price(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.can_create_invitation(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.check_and_upgrade_level(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_access_tokens() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_invitation_codes() SET search_path = public, pg_temp;
ALTER FUNCTION public.cleanup_expired_invitations() SET search_path = public, pg_temp;
ALTER FUNCTION public.count_search_menu_wines(text, text, integer, integer, text, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.count_search_menu_wines_grouped(text, text, integer, integer, text, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_or_create_grape_variety(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_discount_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_invitation_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_participant_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_session_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.generate_tracking_code() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_all_wines_with_details() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_cohort_analysis() SET search_path = public, pg_temp;
ALTER FUNCTION public.get_grouped_producers(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_invitation_limits(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_invite_quota_for_level(membership_level) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_level_from_points(integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_wine_with_details(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.invoice_status_sv(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.promote_menu_document_to_current(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.reset_monthly_invite_quotas() SET search_path = public, pg_temp;
ALTER FUNCTION public.search_menu_wines(text, text, integer, integer, text, boolean, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_menu_wines_grouped(text, text, integer, integer, text, boolean, text, text, integer, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.set_b2b_pallet_producer_status_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_b2b_pallet_producer_wine_status_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_freight_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_promo_discount_codes_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_systembolaget_curated_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_wine_customer_reviews_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_b2b_pallet_shipment_status() SET search_path = public, pg_temp;
ALTER FUNCTION public.trigger_calculate_wine_price() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_access_requests_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_invitation_codes_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_invitation_limits_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_invitations_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_memberships_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_site_content(character varying, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_wine_images_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_wine_raw(uuid, text, text, text, text, uuid, text, numeric, text, date, date, date, numeric, integer, boolean, numeric, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.update_wine_tasting_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.use_invitation(character varying, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_invitation_code(character varying, character varying) SET search_path = public, pg_temp;
ALTER FUNCTION public.use_invitation_code(text, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.user_has_role(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.validate_invitation_code(character varying) SET search_path = public, pg_temp;

NOTIFY pgrst, 'reload schema';
