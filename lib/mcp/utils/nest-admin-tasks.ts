/** MCP responses: group flat admin_tasks rows into roots with `subtasks` (one level). */

export type AdminTaskRow = Record<string, unknown>;

export type AdminTaskWithSubtasks = AdminTaskRow & {
  subtasks: AdminTaskWithSubtasks[];
};

function byCreatedAtDesc(a: AdminTaskRow, b: AdminTaskRow): number {
  const ta = String(a.created_at ?? "");
  const tb = String(b.created_at ?? "");
  return tb.localeCompare(ta);
}

export function nestAdminTasksWithSubtasks(
  rows: AdminTaskRow[],
): AdminTaskWithSubtasks[] {
  const byParent = new Map<string | null, AdminTaskRow[]>();
  for (const t of rows) {
    const pid = (t.parent_task_id as string | null | undefined) ?? null;
    const list = byParent.get(pid) ?? [];
    list.push(t);
    byParent.set(pid, list);
  }
  const roots = [...(byParent.get(null) ?? [])].sort(byCreatedAtDesc);
  return roots.map((task) => {
    const id = task.id as string;
    const children = [...(byParent.get(id) ?? [])].sort(byCreatedAtDesc);
    return {
      ...task,
      subtasks: children.map((st) => ({
        ...st,
        subtasks: [] as AdminTaskWithSubtasks[],
      })),
    };
  });
}
