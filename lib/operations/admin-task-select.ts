import type { AdminUserMin, Task } from "@/lib/types/operations"

/** Standard admin_tasks-rad: projekt, objective, assignee(s), skapare. */
export const ADMIN_TASK_SELECT = `*,
  project:admin_projects(id, name),
  objective:admin_objectives(id, title, goal_id, goal:admin_goals(id, title)),
  assignee:profiles!admin_tasks_assigned_to_fkey(id, email, full_name),
  assignee_links:admin_task_assignees!admin_task_assignees_task_id_fkey(
    profile_id,
    profile:profiles!admin_task_assignees_profile_id_fkey(id, email, full_name)
  ),
  creator:profiles!admin_tasks_created_by_fkey(id, email, full_name)`

export type AdminTaskRow = Record<string, unknown> & {
  assignee_links?: { profile?: AdminUserMin | null }[]
  assignee?: AdminUserMin | null
}

export function mapAdminTaskRow(row: AdminTaskRow): Task {
  const links = row.assignee_links ?? []
  const fromLinks: AdminUserMin[] = links
    .map((l) => l.profile)
    .filter((p): p is AdminUserMin => Boolean(p))
  const assignees =
    fromLinks.length > 0
      ? fromLinks
      : row.assignee
        ? [row.assignee]
        : []
  const { assignee_links: _a, ...rest } = row
  return {
    ...(rest as unknown as Task),
    assignees,
    assignee: assignees[0] ?? row.assignee ?? null,
  }
}
