-- Drop the 8-argument award_pact_points overload.
-- It shares defaults with the 9-argument function, so any call that omits
-- p_pending_until_payment matches both and Postgres refuses to choose.
-- The 9-argument function is unchanged. EXECUTE stays service_role only.

DROP FUNCTION IF EXISTS public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer);

REVOKE EXECUTE ON FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer, boolean) TO service_role;
