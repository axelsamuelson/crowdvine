-- Align RLS admin checks with app isPlatformAdminProfile():
-- profiles.role = 'admin' OR 'admin' = ANY(profiles.roles).
-- Previously some policies only accepted profiles.role.
--
-- Numbered 244 after 243_supabase_security_advisor_fixes /
-- 243_ops_approval_queue_questions. Does not touch
-- analytics_intent_sessions grants (locked in 243).
-- search_path matches 243's public, pg_temp pattern.
-- Not the same as user_has_role(uuid, text), which only checks
-- profiles.roles and ignores profiles.role.

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND (
        role = 'admin'
        OR (roles IS NOT NULL AND 'admin' = ANY (roles))
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO service_role;

COMMENT ON FUNCTION public.is_platform_admin() IS
  'True when the current auth.uid() profile is a platform admin via role or roles[]. Matches lib/auth/platform-admin-profile.ts.';

-- ---------------------------------------------------------------------------
-- Recreate role-only admin policies to use is_platform_admin()
-- ---------------------------------------------------------------------------

-- access_requests
DROP POLICY IF EXISTS "Allow admins to manage access requests" ON public.access_requests;
CREATE POLICY "Allow admins to manage access requests"
  ON public.access_requests
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- impact_point_events
DROP POLICY IF EXISTS "Admins can read all events" ON public.impact_point_events;
CREATE POLICY "Admins can read all events"
  ON public.impact_point_events
  FOR SELECT
  USING (public.is_platform_admin());

-- membership_perks
DROP POLICY IF EXISTS "Admins can manage perks" ON public.membership_perks;
CREATE POLICY "Admins can manage perks"
  ON public.membership_perks
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- pact_points_events
DROP POLICY IF EXISTS "Admins can read all pact points events" ON public.pact_points_events;
CREATE POLICY "Admins can read all pact points events"
  ON public.pact_points_events
  FOR SELECT
  USING (public.is_platform_admin());

-- producer_groups
DROP POLICY IF EXISTS "Admins can manage producer groups" ON public.producer_groups;
CREATE POLICY "Admins can manage producer groups"
  ON public.producer_groups
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- producer_group_members
DROP POLICY IF EXISTS "Admins can manage group members" ON public.producer_group_members;
CREATE POLICY "Admins can manage group members"
  ON public.producer_group_members
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- producers
DROP POLICY IF EXISTS "Admin can manage producers" ON public.producers;
CREATE POLICY "Admin can manage producers"
  ON public.producers
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- user_access
DROP POLICY IF EXISTS "Allow admins to manage user access" ON public.user_access;
CREATE POLICY "Allow admins to manage user access"
  ON public.user_access
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- user_events
DROP POLICY IF EXISTS "Admins can view all events" ON public.user_events;
CREATE POLICY "Admins can view all events"
  ON public.user_events
  FOR SELECT
  USING (public.is_platform_admin());

-- user_memberships
DROP POLICY IF EXISTS "Admins can read all memberships" ON public.user_memberships;
CREATE POLICY "Admins can read all memberships"
  ON public.user_memberships
  FOR SELECT
  USING (public.is_platform_admin());

DROP POLICY IF EXISTS "Admins can update memberships" ON public.user_memberships;
CREATE POLICY "Admins can update memberships"
  ON public.user_memberships
  FOR UPDATE
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- wine_internal_ratings
DROP POLICY IF EXISTS "Admins can manage wine_internal_ratings" ON public.wine_internal_ratings;
CREATE POLICY "Admins can manage wine_internal_ratings"
  ON public.wine_internal_ratings
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

-- wine_customer_reviews
DROP POLICY IF EXISTS "Admins can manage wine_customer_reviews" ON public.wine_customer_reviews;
CREATE POLICY "Admins can manage wine_customer_reviews"
  ON public.wine_customer_reviews
  FOR ALL
  USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());
