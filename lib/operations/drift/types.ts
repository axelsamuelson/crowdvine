import type { OpsAgentCompany, OpsCompany } from "@/lib/operations/ops-agents"

export type DriftCompanyFilter = OpsCompany | "both"
export type DriftTab = "oversikt" | "botar" | "pipeline"

export interface DriftQueueItem {
  id: string
  title: string
  question: string
  agent: string
  kind: string | null
  deadline: string | null
  recommendation: string | null
  overdue: boolean
  openHref: string
}

export interface DriftWeekItem {
  id: string
  heading: string
  owner: string | null
  at: string
  atLabel: string
  source: "pr" | "ops_agent_log" | null
  projectName: string | null
}

export interface DriftBotRow {
  id: string
  name: string
  agent_id: string
  company: OpsAgentCompany | null
  companyLabel: string
  area: string | null
  latestAt: string | null
  latestAtLabel: string
  latestAction: string | null
  jobbarPa: string
  vantarPa: string
  vantarTone: "none" | "amber" | "red"
  silent: boolean
}

export interface DriftPipelineTaskCard {
  id: string
  heading: string
  owner: string | null
  atLabel: string | null
  source: "pr" | "ops_agent_log" | null
  paused: boolean
  href: string
}

export interface DriftPipelineProject {
  id: string
  name: string
  company: OpsCompany
  companyLabel: string
  archived: boolean
  counts: {
    pagar: number
    pagang: number
    backlog: number
    klartWeek: number
    older: number
    cancelled: number
  }
  lastActivityLabel: string | null
  columns: {
    klart: DriftPipelineTaskCard[]
    klartOlder: DriftPipelineTaskCard[]
    pagar: DriftPipelineTaskCard[]
    pagang: DriftPipelineTaskCard[]
    backlog: DriftPipelineTaskCard[]
  }
}

export interface DriftOverviewData {
  generatedAtLabel: string
  summary: {
    waiting: number
    waitingOverdue: number
    pagar: number
    pagang: number
    klartWeek: number
  }
  queue: DriftQueueItem[]
  weekItems: DriftWeekItem[]
  bots: DriftBotRow[]
  projects: DriftPipelineProject[]
  ownerOptions: string[]
  projectOptions: { id: string; name: string }[]
}
