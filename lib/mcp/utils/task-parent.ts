import type { SupabaseClient } from "@supabase/supabase-js";

type ParentRow = {
  id: string;
  project_id: string | null;
  objective_id: string | null;
  parent_task_id: string | null;
};

export async function loadAdminTaskParentRow(
  sb: SupabaseClient,
  parentTaskId: string,
): Promise<ParentRow | null> {
  const { data, error } = await sb
    .from("admin_tasks")
    .select("id, project_id, objective_id, parent_task_id")
    .eq("id", parentTaskId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return data as ParentRow;
}

/** Parent must exist, not deleted, and be a root task (only one nesting level). */
export async function assertValidSubtaskParent(
  sb: SupabaseClient,
  parentTaskId: string,
): Promise<ParentRow> {
  const parent = await loadAdminTaskParentRow(sb, parentTaskId);
  if (!parent) {
    throw new Error(
      "parent_task_id: Parent task not found or has been deleted.",
    );
  }
  if (parent.parent_task_id != null) {
    throw new Error(
      "parent_task_id: Parent is already a subtask; only one level of subtasks is allowed.",
    );
  }
  return parent;
}

/** Direct children of taskId (non-deleted). */
async function loadChildIds(
  sb: SupabaseClient,
  taskId: string,
): Promise<string[]> {
  const { data, error } = await sb
    .from("admin_tasks")
    .select("id")
    .eq("parent_task_id", taskId)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.id as string);
}

/**
 * Validate moving taskId under newParentId (or null to detach).
 * Prevents self-parent, cycles, and nesting under a non-root.
 */
export async function assertValidTaskParentUpdate(
  sb: SupabaseClient,
  taskId: string,
  newParentId: string | null,
): Promise<void> {
  if (newParentId === null) return;
  if (newParentId === taskId) {
    throw new Error("parent_task_id: A task cannot be its own parent.");
  }

  await assertValidSubtaskParent(sb, newParentId);

  const childIds = await loadChildIds(sb, taskId);
  if (childIds.includes(newParentId)) {
    throw new Error(
      "parent_task_id: Cannot set parent to a direct subtask of this task (would create a cycle).",
    );
  }
}
