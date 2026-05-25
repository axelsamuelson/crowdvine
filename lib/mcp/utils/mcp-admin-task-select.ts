/**
 * Supabase `.select()` column lists for MCP task responses.
 * Keeps payloads small (no description on lists/mutations; omits assigned_to, task_type, etc.).
 */

/** Default task projection for lists, writes, and nested task trees in MCP. */
export const MCP_ADMIN_TASK_SELECT_LIST =
  "id, title, status, priority, project_id, objective_id, parent_task_id, due_date, start_date, completed_at, sort_order, status_sort_order, created_by, created_at, updated_at";

/** Single-task read including description (still omits assigned_to, task_type, estimated_hours). */
export const MCP_ADMIN_TASK_SELECT_DETAIL =
  `${MCP_ADMIN_TASK_SELECT_LIST}, description`;
