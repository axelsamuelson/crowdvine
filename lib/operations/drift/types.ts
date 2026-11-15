import type { OpsCompany } from "@/lib/operations/ops-agents"
import type { DriftTaskBadge } from "./display-title"
import type { DriftPriority } from "./priority-rules"

/** v6: no mixed company view. */
export type DriftCompanyFilter = OpsCompany
export type DriftTab = "oversikt" | "mal" | "pipeline"

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

/** Payload for the detail panel (desktop side / mobile sheet). */
export interface DriftTaskDetail {
  id: string
  heading: string
  description: string
  /** Utförare */
  owner: string | null
  /** Initiative owner (ansvarig) */
  initiativeOwner: string | null
  objectiveId: string | null
  objectiveLabel: string | null
  initiativeId: string | null
  initiativeLabel: string | null
  priorityLabel: string | null
  sortOrderLabel: string | null
  statusLabel: string
  dateLabel: string
  prNumber: number | null
  prUrl: string | null
  unprioritized: boolean
  startedWithoutInitiative: boolean
}

export interface DriftObjectiveChip {
  id: string
  rank: number
  shortLabel: string
  title: string
}

export interface DriftInitiativeTag {
  id: string
  key: string
  title: string
}

export interface DriftWeekItem {
  id: string
  heading: string
  owner: string | null
  at: string
  atLabel: string
  source: "pr" | "ops_agent_log" | null
  objective: DriftObjectiveChip | null
  initiative: DriftInitiativeTag | null
  unprioritized: boolean
  detail: DriftTaskDetail
}

export interface DriftPagarTask {
  id: string
  heading: string
  owner: string | null
  objective: DriftObjectiveChip | null
  initiative: DriftInitiativeTag | null
  dateLabel: string | null
  badge: DriftTaskBadge
  belowRank: boolean
  belowRankLabel: string | null
  unprioritized: boolean
  startedWithoutInitiative: boolean
  detail: DriftTaskDetail
}

export interface DriftUnprioritizedTask {
  id: string
  heading: string
  owner: string | null
  statusLabel: string
  startedWithoutInitiative: boolean
  objectiveLabel: string | null
  detail: DriftTaskDetail
}

export interface DriftPipelineTaskCard {
  id: string
  heading: string
  owner: string | null
  atLabel: string | null
  /** Green date only when the card is in Klart; otherwise neutral grey. */
  atIsDone: boolean
  source: "pr" | "ops_agent_log" | null
  paused: boolean
  unprioritized: boolean
  startedWithoutInitiative: boolean
  belowRank: boolean
  badge: DriftTaskBadge
  href: string
  detail: DriftTaskDetail
}

export interface DriftPipelineInitiative {
  id: string
  key: string
  title: string
  ownerAgent: string
  columns: {
    pagar: DriftPipelineTaskCard[]
    /** Middle column — UI label "Nästa" (formerly "På gång"). */
    pagang: DriftPipelineTaskCard[]
    klart: DriftPipelineTaskCard[]
  }
}

export interface DriftPipelineObjective {
  id: string
  rank: number
  title: string
  shortLabel: string
  defaultExpanded: boolean
  summaryLine: string
  initiatives: DriftPipelineInitiative[]
}

export interface DriftMalTaskRow {
  id: string
  place: number
  heading: string
  owner: string | null
  status: "pagar" | "nasta" | "pausad" | "klart"
  statusLabel: string
  badge: DriftTaskBadge
  belowRank: boolean
  unprioritized: boolean
  startedWithoutInitiative: boolean
  detail: DriftTaskDetail
}

export interface DriftMalInitiative {
  id: string
  key: string
  title: string
  ownerAgent: string
  pagarCount: number
  nastaCount: number
  klartWeekCount: number
  pausedCount: number
  /** Pågår + next three todos shown by default */
  visibleTasks: DriftMalTaskRow[]
  hiddenTaskCount: number
  allTasks: DriftMalTaskRow[]
}

export interface DriftMalObjective {
  id: string
  rank: number
  title: string
  shortLabel: string
  priority: DriftPriority
  priorityLabel: string
  initiativeCount: number
  /** Initiatives hidden by bot filter (neither owner nor any task). */
  hiddenInitiativesCount: number
  pagarCount: number
  doneCount: number
  totalCount: number
  defaultExpanded: boolean
  emptyForFilter: boolean
  initiatives: DriftMalInitiative[]
}

export interface DriftOverviewData {
  generatedAtLabel: string
  company: DriftCompanyFilter
  companySubtitle: string
  summary: {
    waiting: number
    waitingOverdue: number
    pagar: number
    pagang: number
    klartWeek: number
    unprioritized: number
  }
  queue: DriftQueueItem[]
  /** Flat Pågår list in goal order (not grouped by bot). */
  pagarTasks: DriftPagarTask[]
  weekItems: DriftWeekItem[]
  unprioritizedTasks: DriftUnprioritizedTask[]
  startedWithoutInitiativeCount: number
  startedWithoutInitiativePreview: DriftUnprioritizedTask | null
  malObjectives: DriftMalObjective[]
  pipelineUnprioritized: {
    pagar: DriftPipelineTaskCard[]
    pagang: DriftPipelineTaskCard[]
    klart: DriftPipelineTaskCard[]
  }
  pipelineObjectives: DriftPipelineObjective[]
  ownerOptions: string[]
}
