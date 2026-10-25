-- Lock customer-data views to service_role.
-- Any NEW view in public must be created WITH (security_invoker = true),
-- or have its grants revoked from anon and authenticated in the same migration.
-- Existing views below stay security definer; anon and authenticated lose access.
-- Numbered 233 because 232_analytics_checkout_steps.sql already exists.

REVOKE ALL ON public.analytics_sessions_clean FROM anon;
REVOKE ALL ON public.analytics_intent_sessions FROM anon;
REVOKE ALL ON public.orders_with_customers FROM anon;
REVOKE ALL ON public.bookings_with_customers FROM anon;
REVOKE ALL ON public.invitation_details FROM anon;
REVOKE ALL ON public.user_journey_funnel FROM anon;

REVOKE ALL ON public.analytics_sessions_clean FROM authenticated;
REVOKE ALL ON public.analytics_intent_sessions FROM authenticated;
REVOKE ALL ON public.analytics_human_sessions FROM authenticated;
REVOKE ALL ON public.orders_with_customers FROM authenticated;
REVOKE ALL ON public.bookings_with_customers FROM authenticated;
REVOKE ALL ON public.invitation_details FROM authenticated;
REVOKE ALL ON public.user_journey_funnel FROM authenticated;

DROP POLICY IF EXISTS wine_tasting_participants_select_public ON public.wine_tasting_participants;
DROP POLICY IF EXISTS wine_tasting_participants_select_admin ON public.wine_tasting_participants;
CREATE POLICY wine_tasting_participants_select_admin ON public.wine_tasting_participants
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role = 'admin' OR 'admin' = ANY(p.roles))
    )
  );
