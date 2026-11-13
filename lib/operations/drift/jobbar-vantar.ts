import type { OpsCompany } from "@/lib/operations/ops-agents"
import {
  classifyDriftColumn,
  cleanTaskTitle,
  taskOwnerNames,
  type DriftTaskLike,
} from "./column-rules"

export interface DriftLogLike {
  id: string
  agent: string
  action: string
  detail?: string | null
  created_at: string
  company?: string | null
  project_id?: string | null
}

export interface DriftQueueLike {
  id: string
  agent: string
  kind?: string | null
  deadline?: string | null
  status: string
  created_at?: string
  company?: string | null
  project_id?: string | null
}

export interface DriftAgentLike {
  name: string
  agent_id: string
  company?: string | null
  area?: string | null
  active?: boolean
}

function nameMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

function companyAllows(
  rowCompany: OpsCompany,
  filter: OpsCompany | "both",
): boolean {
  if (filter === "both") return true
  return rowCompany === filter
}

function resolveRowCompany(
  row: { company?: string | null; project_id?: string | null },
  projectCompanyById: Map<string, OpsCompany>,
): OpsCompany {
  if (row.company === "pact" || row.company === "dirtywine") return row.company
  if (row.project_id) {
    return projectCompanyById.get(row.project_id) ?? "pact"
  }
  return "pact"
}

export function deriveJobbarPa(input: {
  agentName: string
  tasks: DriftTaskLike[]
  logs: DriftLogLike[]
  waitingCount: number
  companyFilter: OpsCompany | "both"
  projectCompanyById: Map<string, OpsCompany>
  taskCompany: (task: DriftTaskLike) => OpsCompany
  now?: Date
}): string {
  const now = input.now ?? new Date()
  const owned = input.tasks.filter((t) => {
    if (!companyAllows(input.taskCompany(t), input.companyFilter)) return false
    return taskOwnerNames(t).some((n) => nameMatch(n, input.agentName))
  })

  const pagar = owned
    .filter((t) => classifyDriftColumn(t, now) === "pagar")
    .sort((a, b) => (b.updated_at ?? "").localeCompare(a.updated_at ?? ""))
  if (pagar[0]) return cleanTaskTitle(pagar[0].title)

  const pagang = owned
    .filter((t) => classifyDriftColumn(t, now) === "pagang")
    .sort((a, b) => {
      const ad = a.due_date ?? "9999-99-99"
      const bd = b.due_date ?? "9999-99-99"
      if (ad !== bd) return ad.localeCompare(bd)
      return (b.updated_at ?? "").localeCompare(a.updated_at ?? "")
    })
  if (pagang[0]) return cleanTaskTitle(pagang[0].title)

  const logs = input.logs
    .filter((l) => nameMatch(l.agent, input.agentName))
    .filter((l) =>
      companyAllows(
        resolveRowCompany(l, input.projectCompanyById),
        input.companyFilter,
      ),
    )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
  const latest = logs[0]
  if (latest) {
    const ageMs = now.getTime() - new Date(latest.created_at).getTime()
    if (ageMs <= 24 * 60 * 60 * 1000) {
      const detail = latest.detail?.trim()
      return detail ? `${latest.action}: ${detail}`.slice(0, 120) : latest.action
    }
  }

  if (nameMatch(input.agentName, "Elsa") && input.waitingCount > 0) {
    return "Förmedlar frågor ur kön"
  }

  return "—"
}

export function deriveVantarPa(input: {
  agentName: string
  isElsa: boolean
  queue: DriftQueueLike[]
  companyFilter: OpsCompany | "both"
  projectCompanyById: Map<string, OpsCompany>
  todayYmd: string
}): {
  label: string
  count: number
  overdue: number
  tone: "none" | "amber" | "red"
} {
  const waiting = input.queue.filter((q) => {
    if (q.status !== "väntar") return false
    if (
      !companyAllows(
        resolveRowCompany(q, input.projectCompanyById),
        input.companyFilter,
      )
    ) {
      return false
    }
    if (input.isElsa) return true
    return nameMatch(q.agent, input.agentName)
  })

  const count = waiting.length
  if (count === 0) {
    return { label: "—", count: 0, overdue: 0, tone: "none" }
  }

  const overdue = waiting.filter(
    (q) => q.deadline && q.deadline < input.todayYmd,
  ).length

  const allMejl =
    !input.isElsa &&
    waiting.every((q) => (q.kind ?? "").toLowerCase() === "mejl")
  const noun = allMejl
    ? count === 1
      ? "mejlutkast"
      : "mejlutkast"
    : count === 1
      ? "fråga"
      : "frågor"

  if (overdue > 0) {
    const overWord = overdue === 1 ? "förfallen" : "förfallna"
    return {
      label: `${count} ${noun}, ${overdue} ${overWord}`,
      count,
      overdue,
      tone: "red",
    }
  }

  return {
    label: `${count} ${noun}`,
    count,
    overdue: 0,
    tone: "amber",
  }
}

export function isSilentBot(input: {
  latestLogAt: string | null
  now?: Date
  quietDays?: number
}): boolean {
  const quietDays = input.quietDays ?? 7
  if (!input.latestLogAt) return true
  const now = input.now ?? new Date()
  const ageMs = now.getTime() - new Date(input.latestLogAt).getTime()
  return ageMs > quietDays * 24 * 60 * 60 * 1000
}
