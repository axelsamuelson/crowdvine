"use server"

import { getSupabaseAdmin } from "@/lib/supabase-admin"
import type { Task } from "@/lib/types/operations"
import {
  ADMIN_TASK_SELECT,
  mapAdminTaskRow,
  type AdminTaskRow,
} from "@/lib/operations/admin-task-select"

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
    .select(ADMIN_TASK_SELECT)
    .in("id", taskIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (tasks ?? []).map((row) => mapAdminTaskRow(row as AdminTaskRow))
}
