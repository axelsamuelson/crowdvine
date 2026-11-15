"use server"

import { requireAdmin } from "@/lib/admin-auth-server"
import { buildDriftOverview } from "@/lib/operations/drift/build-overview"
import type {
  DriftCompanyFilter,
  DriftOverviewData,
} from "@/lib/operations/drift/types"
import type {
  DriftCompany,
  DriftPriority,
} from "@/lib/operations/drift/priority-rules"
import { getSupabaseAdmin } from "@/lib/supabase-admin"

function asCompany(raw: string | null | undefined): DriftCompany {
  return raw === "dirtywine" ? "dirtywine" : "pact"
}

function asPriority(raw: string | null | undefined): DriftPriority {
  if (
    raw === "urgent" ||
    raw === "high" ||
    raw === "medium" ||
    raw === "low"
  ) {
    return raw
  }
  return "medium"
}

export async function getDriftOverview(input?: {
  company?: DriftCompanyFilter
  owner?: string | null
}): Promise<DriftOverviewData> {
  await requireAdmin()
  const sb = getSupabaseAdmin()
  const company = input?.company ?? "pact"

  const [
    objectivesRes,
    initiativesRes,
    projectsRes,
    tasksRes,
    agentsRes,
    queueRes,
  ] = await Promise.all([
    // Load all companies — buildDriftOverview resolves task company via
    // objective/initiative maps; filtering here would mis-attribute DW tasks to PACT.
    sb
      .from("admin_objectives")
      .select(
        "id, title, company, sort_order, priority, owner, short_label, deleted_at",
      )
      .is("deleted_at", null)
      .order("sort_order"),
    sb
      .from("admin_initiatives")
      .select(
        "id, objective_id, company, key, title, owner_agent, sort_order, status",
      )
      .order("sort_order"),
    sb
      .from("admin_projects")
      .select("id, company, deleted_at")
      .is("deleted_at", null),
    sb
      .from("admin_tasks")
      .select(
        "id, title, description, status, due_date, updated_at, completed_at, deleted_at, parent_task_id, owner_agent, assigned_to, project_id, objective_id, initiative_id, sort_order",
      )
      .is("deleted_at", null),
    sb
      .from("ops_agents")
      .select("name, active")
      .eq("active", true)
      .order("name"),
    sb
      .from("ops_approval_queue")
      .select(
        "id, agent, kind, title, detail, question, recommendation, deadline, status, created_at, company, project_id, task_id",
      )
      .eq("status", "väntar")
      .order("created_at", { ascending: true }),
  ])

  if (objectivesRes.error) throw new Error(objectivesRes.error.message)
  if (initiativesRes.error) throw new Error(initiativesRes.error.message)
  if (projectsRes.error) throw new Error(projectsRes.error.message)
  if (tasksRes.error) throw new Error(tasksRes.error.message)
  if (agentsRes.error) throw new Error(agentsRes.error.message)
  if (queueRes.error) throw new Error(queueRes.error.message)

  const projectCompanyById = new Map<string, DriftCompany>()
  for (const p of projectsRes.data ?? []) {
    projectCompanyById.set(p.id, asCompany(p.company))
  }

  return buildDriftOverview({
    companyFilter: company,
    ownerFilter: input?.owner ?? null,
    objectives: (objectivesRes.data ?? []).map((o) => ({
      id: o.id,
      title: o.title,
      company: asCompany(o.company),
      sort_order: o.sort_order ?? 0,
      priority: asPriority(o.priority),
      owner: o.owner,
      short_label: o.short_label,
      deleted_at: o.deleted_at,
    })),
    initiatives: (initiativesRes.data ?? []).map((i) => ({
      id: i.id,
      objective_id: i.objective_id,
      company: asCompany(i.company),
      key: i.key,
      title: i.title,
      owner_agent: i.owner_agent,
      sort_order: i.sort_order ?? 0,
      status: i.status,
    })),
    tasks: tasksRes.data ?? [],
    agents: agentsRes.data ?? [],
    queue: queueRes.data ?? [],
    projectCompanyById,
  })
}
