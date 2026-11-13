import type { OpsAgentCompany, OpsCompany } from "@/lib/operations/ops-agents"
import type { DriftTaskBadge } from "./display-title"

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

/** Payload for the v4.1 detail panel (desktop side / mobile sheet). */
export interface DriftTaskDetail {
  id: string
  heading: string
  description: string
  owner: string | null
  projectId: string | null
  projectName: string | null
  statusLabel: string
  dateLabel: string
  prNumber: number | null
  prUrl: string | null
}

export interface DriftWeekItem {
  id: string
  heading: string
  owner: string | null
  at: string
  atLabel: string
  source: "pr" | "ops_agent_log" | null
  projectName: string | null
  projectTag: string | null
  detail: DriftTaskDetail
}

export interface DriftPagarTask {
  id: string
  heading: string
  projectTag: string | null
  dateLabel: string | null
  badge: DriftTaskBadge
  detail: DriftTaskDetail
}

export interface DriftPagarBotGroup {
  ownerKey: string
  ownerLabel: string
  count: number
  hasWaitingForYou: boolean
  tasks: DriftPagarTask[]
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
  pagarGroups: DriftPagarBotGroup[]
  weekItems: DriftWeekItem[]
  bots: DriftBotRow[]
  projects: DriftPipelineProject[]
  ownerOptions: string[]
  projectOptions: { id: string; name: string }[]
}
