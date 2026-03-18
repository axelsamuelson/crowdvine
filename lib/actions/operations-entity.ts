"use server"

import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { Task } from "@/lib/types/operations"

export async function getTasksForEntity(
  entity_type: string,
  entity_id: string
): Promise<Task[]> {
  const sb = getSupabaseAdmin()

  // Hämta task_ids kopplade till entiteten
  const { data: links, error: linksError } = await sb
    .from("admin_entity_links")
    .select("task_id")
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id)

  if (linksError || !links || links.length === 0) return []

  const taskIds = links.map((l) => l.task_id)

  const { data: tasks, error } = await sb
    .from("admin_tasks")
    .select(`
      *,
      project:admin_projects(id, name),
      objective:admin_objectives(id, title),
      assignee:profiles!admin_tasks_assigned_to_fkey(id, email)
    `)
    .in("id", taskIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return tasks ?? []
}
