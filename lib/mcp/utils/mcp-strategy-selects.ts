/**
 * Narrow column sets for OKR "read" tools (get_full_strategy, get_goal, get_objective, get_project).
 * Omits heavy/unused fields vs select("*") where safe for MCP token budget.
 */

export const MCP_STRATEGY_GOAL_COLUMNS =
  "id, title, description, status, created_at, updated_at";

/** Objective row without owner/strategy noise; keeps period for context. */
export const MCP_STRATEGY_OBJECTIVE_COLUMNS =
  "id, title, description, period, status, goal_id, strategy_area, progress_method, manual_progress, insights_target, created_at, updated_at";

/** Minimal objective row for get_full_strategy summary counts only. */
export const MCP_OBJECTIVE_COUNTING_COLUMNS =
  "id, goal_id, title, status";

export const MCP_STRATEGY_PROJECT_COLUMNS =
  "id, name, description, objective_id, key_result_id, status, priority, start_date, due_date, created_at, updated_at";

/** Key results without long description / owner when embedded under objectives. */
export const MCP_KEY_RESULT_BRIEF_COLUMNS =
  "id, objective_id, title, status, type, start_value, target_value, current_value, due_date, sort_order, created_at, updated_at";

/** Metrics without query_config JSONB blob. */
export const MCP_OBJECTIVE_METRIC_BRIEF_COLUMNS =
  "id, objective_id, slug, label, unit, query_type, current_value, target_value, period_type, period_start, period_end, refreshed_at, created_at";

/** Task ids + links only (for server-side counting, not returned to client). */
export const MCP_TASK_COUNTING_COLUMNS = "id, project_id, objective_id";
