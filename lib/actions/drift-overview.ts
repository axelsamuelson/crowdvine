"use server"

import { requireAdmin } from "@/lib/admin-auth-server"
import { buildDriftOverview } from "@/lib/operations/drift/build-overview"
import type {
  DriftCompanyFilter,
  DriftOverviewData,
} from "@/lib/operations/drift/types"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

export async function getDriftOverview(input?: {
  company?: DriftCompanyFilter
  owner?: string | null
  projectId?: string | null
}): Promise<DriftOverviewData> {
  await requireAdmin()
  const sb = getSupabaseAdmin()

  const [
    projectsRes,
    tasksRes,
    agentsRes,
    logsRes,
    queueRes,
  ] = await Promise.all([
    sb
      .from("admin_projects")
      .select("id, name, company, status, deleted_at, updated_at")
      .is("deleted_at", null)
      .order("name"),
    sb
      .from("admin_tasks")
      .select(
        "id, title, description, status, due_date, updated_at, completed_at, deleted_at, parent_task_id, owner_agent, assigned_to, project_id",
      )
      .is("deleted_at", null),
    sb
      .from("ops_agents")
      .select("name, agent_id, company, area, active")
      .eq("active", true)
      .order("name"),
    sb
      .from("ops_agent_log")
      .select("id, agent, action, detail, created_at, company, project_id")
      .order("created_at", { ascending: false })
      .limit(500),
    sb
      .from("ops_approval_queue")
      .select(
        "id, agent, kind, title, detail, question, recommendation, deadline, status, created_at, company, project_id, task_id",
      )
      .eq("status", "väntar")
      .order("created_at", { ascending: true }),
  ])

  if (projectsRes.error) throw new Error(projectsRes.error.message)
  if (tasksRes.error) throw new Error(tasksRes.error.message)
  if (agentsRes.error) throw new Error(agentsRes.error.message)
  if (logsRes.error) throw new Error(logsRes.error.message)
  if (queueRes.error) throw new Error(queueRes.error.message)

  return buildDriftOverview({
    companyFilter: input?.company ?? "both",
    ownerFilter: input?.owner ?? null,
    projectFilter: input?.projectId ?? null,
    projects: projectsRes.data ?? [],
    tasks: tasksRes.data ?? [],
    agents: agentsRes.data ?? [],
    logs: logsRes.data ?? [],
    queue: queueRes.data ?? [],
  })
}
