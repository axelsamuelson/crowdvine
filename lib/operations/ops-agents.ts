/**
 * Typed access for Drift data-model columns (migration 293):
 * admin_projects.company, admin_tasks.owner_agent, ops_agents,
 * optional company/project_id on ops_agent_log and ops_approval_queue.
 */
import { getSupabaseAdmin } from "@/lib/supabase-admin"

/** Company stored on projects / log / queue rows. */
export type OpsCompany = "pact" | "dirtywine"

/** Company on ops_agents (may span both brands). */
export type OpsAgentCompany = OpsCompany | "both"

export const OPS_COMPANIES: readonly OpsCompany[] = ["pact", "dirtywine"] as const
export const OPS_AGENT_COMPANIES: readonly OpsAgentCompany[] = [
  "pact",
  "dirtywine",
  "both",
] as const

export function isOpsCompany(value: unknown): value is OpsCompany {
  return value === "pact" || value === "dirtywine"
}

export function isOpsAgentCompany(value: unknown): value is OpsAgentCompany {
  return value === "pact" || value === "dirtywine" || value === "both"
}

/** Swedish display label; never show raw DB keys in UI. */
export function formatOpsCompanyLabel(
  company: OpsCompany | OpsAgentCompany | null | undefined,
): string {
  if (company === "dirtywine") return "Dirty Wine"
  if (company === "both") return "Båda"
  return "PACT"
}

/**
 * Resolve company for a task/log/queue row:
 * explicit company → project.company → default pact.
 */
export function resolveInheritedCompany(input: {
  company?: string | null
  projectCompany?: string | null
}): OpsCompany {
  if (isOpsCompany(input.company)) return input.company
  if (isOpsCompany(input.projectCompany)) return input.projectCompany
  return "pact"
}

export type TaskSourceKind = "pr" | "ops_agent_log"

export type TaskSourceMarker =
  | { kind: "pr"; prNumber: number }
  | { kind: "ops_agent_log"; logId: string }

/**
 * First line of admin_tasks.description must be exactly
 * `källa: PR #<n>` or `källa: ops_agent_log <uuid>`.
 */
export function parseTaskSourceMarker(
  description: string | null | undefined,
): TaskSourceMarker | null {
  if (!description) return null
  const firstLine = description.split(/\r?\n/, 1)[0]?.trim() ?? ""
  const pr = /^källa: PR #(\d+)$/.exec(firstLine)
  if (pr) {
    return { kind: "pr", prNumber: Number(pr[1]) }
  }
  const log =
    /^källa: ops_agent_log ([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(
      firstLine,
    )
  if (log) {
    return { kind: "ops_agent_log", logId: log[1]!.toLowerCase() }
  }
  return null
}

export interface OpsAgent {
  id: string
  name: string
  agent_id: string
  company: OpsAgentCompany | null
  area: string | null
  active: boolean
  created_at: string
  updated_at: string
}

const OPS_AGENT_SELECT =
  "id, name, agent_id, company, area, active, created_at, updated_at" as const

function mapOpsAgentRow(row: Record<string, unknown>): OpsAgent {
  const company = isOpsAgentCompany(row.company) ? row.company : null
  return {
    id: String(row.id),
    name: String(row.name),
    agent_id: String(row.agent_id),
    company,
    area: (row.area as string | null) ?? null,
    active: Boolean(row.active),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export async function listOpsAgents(options?: {
  activeOnly?: boolean
  company?: OpsAgentCompany | OpsCompany
}): Promise<OpsAgent[]> {
  const sb = getSupabaseAdmin()
  let query = sb
    .from("ops_agents")
    .select(OPS_AGENT_SELECT)
    .order("name", { ascending: true })

  if (options?.activeOnly !== false) {
    query = query.eq("active", true)
  }

  if (options?.company) {
    // 'both' agents belong to every company filter; brand filter also includes matching brand.
    if (options.company === "both") {
      query = query.eq("company", "both")
    } else {
      query = query.in("company", [options.company, "both"])
    }
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapOpsAgentRow(row as Record<string, unknown>))
}

export async function getOpsAgentByAgentId(
  agentId: string,
): Promise<OpsAgent | null> {
  const sb = getSupabaseAdmin()
  const { data, error } = await sb
    .from("ops_agents")
    .select(OPS_AGENT_SELECT)
    .eq("agent_id", agentId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapOpsAgentRow(data as Record<string, unknown>)
}

/** Select fragments for new columns (for composing larger queries). */
export const DRIFT_PROJECT_COMPANY_SELECT = "company" as const
export const DRIFT_TASK_OWNER_AGENT_SELECT = "owner_agent" as const
export const DRIFT_OPS_LOG_COMPANY_SELECT = "company, project_id" as const
export const DRIFT_OPS_QUEUE_COMPANY_SELECT = "company, project_id" as const
