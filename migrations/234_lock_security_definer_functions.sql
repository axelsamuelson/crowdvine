-- Lock SECURITY DEFINER functions in public to service_role.
-- Any new SECURITY DEFINER function in public must REVOKE EXECUTE FROM PUBLIC,
-- anon and authenticated in the same migration unless a browser call is intended,
-- and must SET search_path = public, pg_temp.
-- Trigger functions do not need an EXECUTE grant for the trigger to fire.

REVOKE EXECUTE ON FUNCTION public.create_invitation_reward_discount(uuid, uuid, integer, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_progression_buffs(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.clear_progression_buffs_on_level_up(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_total_buff_percentage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_active_progression_buffs(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_progression_rewards_for_segment(character varying) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.systembolaget_promote_products(text[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.systembolaget_snapshot_ranks(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_refresh_objective_metrics(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_sync_parent_task_status_from_subtasks(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_tasks_subtasks_sync_parent_trigger() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_delivery_note_number() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.issue_invoice(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.replace_invoice_draft_lines(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_membership() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_invitation_reward_discount(uuid, uuid, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.apply_progression_buffs(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.clear_progression_buffs_on_level_up(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.calculate_total_buff_percentage(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_progression_buffs(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_progression_rewards_for_segment(character varying) TO service_role;
GRANT EXECUTE ON FUNCTION public.systembolaget_promote_products(text[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.systembolaget_snapshot_ranks(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_refresh_objective_metrics(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_sync_parent_task_status_from_subtasks(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_tasks_subtasks_sync_parent_trigger() TO service_role;
GRANT EXECUTE ON FUNCTION public.next_delivery_note_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_invoice_draft_lines(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_membership() TO service_role;

ALTER FUNCTION public.create_invitation_reward_discount(uuid, uuid, integer, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.award_pact_points(uuid, text, integer, integer, uuid, uuid, text, integer, boolean) SET search_path = public, pg_temp;
ALTER FUNCTION public.apply_progression_buffs(uuid, uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.clear_progression_buffs_on_level_up(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.calculate_total_buff_percentage(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_active_progression_buffs(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_progression_rewards_for_segment(character varying) SET search_path = public, pg_temp;
ALTER FUNCTION public.systembolaget_promote_products(text[]) SET search_path = public, pg_temp;
ALTER FUNCTION public.systembolaget_snapshot_ranks(text) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_refresh_objective_metrics(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_sync_parent_task_status_from_subtasks(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.admin_tasks_subtasks_sync_parent_trigger() SET search_path = public, pg_temp;
ALTER FUNCTION public.next_delivery_note_number() SET search_path = public, pg_temp;
ALTER FUNCTION public.issue_invoice(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.replace_invoice_draft_lines(uuid, jsonb) SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.handle_new_user_membership() SET search_path = public, pg_temp;
