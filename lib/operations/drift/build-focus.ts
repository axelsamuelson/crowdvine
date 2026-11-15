import {
  classifyDriftColumn,
  isPausedTitle,
  taskOwnerNames,
  type DriftTaskLike,
} from "./column-rules"
import { focusPointsConfirmer } from "./focus-constants"
import {
  completedAtInPeriod,
  focusMonthPeriod,
  focusTrendEndWeek,
  focusWeekPeriod,
  isFutureFocusWeek,
  lastNIsoWeeks,
  shiftFocusPeriod,
  type FocusPeriodBounds,
  type FocusPeriodKind,
} from "./focus-period"
import {
  computeFocusSignal,
  pactCumulativeTargetMarkers,
  type FocusSignalResult,
} from "./focus-signal"
import {
  companySubtitle,
  isUnprioritized,
  resolveTaskCompany,
  taskMatchesBotFilter,
  type DriftCompany,
  type DriftInitiativeLike,
  type DriftObjectiveLike,
} from "./priority-rules"
import { formatStockholmDateTime } from "./stockholm-time"
import type {
  DriftFocusBotRow,
  DriftFocusData,
  DriftFocusEffectMetric,
  DriftFocusExpandedTask,
  DriftFocusGoalRow,
  DriftFocusTrendWeek,
} from "./types"

export interface FocusTaskInput extends DriftTaskLike {
  objective_id?: string | null
  initiative_id?: string | null
  project_id?: string | null
  sort_order?: number | null
  description?: string | null
  task_points?: number | null
  points_status?: "proposed" | "confirmed" | null
}

export interface FocusObjectiveInput extends DriftObjectiveLike {
  target_share?: number | null
  target_group?: string | null
  effect_metric_key?: string | null
}

export interface BuildFocusInput {
  now?: Date
  company: DriftCompany
  ownerFilter?: string | null
  periodKind: FocusPeriodKind
  /** Anchor date for the selected period (defaults to now). */
  periodAnchor?: Date
  objectives: FocusObjectiveInput[]
  initiatives: DriftInitiativeLike[]
  tasks: FocusTaskInput[]
  projectCompanyById?: Map<string, DriftCompany>
  /** Optional synthetic effect series keyed by metric_key → oldest..newest weekly values. */
  effectSeriesByKey?: Record<string, number[]>
}

function pointsOf(task: FocusTaskInput): number {
  const p = task.task_points
  return typeof p === "number" && (p === 1 || p === 2 || p === 4 || p === 8)
    ? p
    : 0
}

function hasMissingPoints(task: FocusTaskInput): boolean {
  return task.task_points == null
}

function isExcludedFromFocus(task: FocusTaskInput): boolean {
  if (task.deleted_at) return true
  if (task.parent_task_id) return true
  if (task.status === "cancelled") return true
  if (isPausedTitle(task.title) || task.status === "paused") return true
  if (isUnprioritized(task)) return true
  return false
}

function periodInPhrase(period: FocusPeriodBounds): string {
  if (period.kind === "week") return period.shortLabel
  return `i ${period.shortLabel}`
}

function shareOf(points: number, total: number): number {
  if (total <= 0) return 0
  return (points / total) * 100
}

function toExpandedTask(
  task: FocusTaskInput,
  initiative: DriftInitiativeLike | undefined,
): DriftFocusExpandedTask {
  const pts = task.task_points
  const proposed = task.points_status === "proposed"
  return {
    id: task.id,
    heading: task.title.replace(/^\s*\[[^\]]+\]\s*/g, "").trim() || task.title,
    owner: taskOwnerNames(task)[0] ?? null,
    points: typeof pts === "number" ? pts : null,
    pointsStatus: task.points_status ?? null,
    proposed,
    splitHint: pts === 8,
    initiativeKey: initiative?.key ?? null,
    initiativeTitle: initiative?.title ?? null,
    atLabel: task.completed_at
      ? formatStockholmDateTime(task.completed_at)
      : null,
  }
}

export function buildDriftFocus(input: BuildFocusInput): DriftFocusData {
  const now = input.now ?? new Date()
  const anchor = input.periodAnchor ?? now
  const period =
    input.periodKind === "month"
      ? focusMonthPeriod(anchor)
      : focusWeekPeriod(anchor)

  const objectiveById = new Map(input.objectives.map((o) => [o.id, o]))
  const initiativeById = new Map(input.initiatives.map((i) => [i.id, i]))
  const projectCompanyById = input.projectCompanyById ?? new Map()

  const companyObjectives = input.objectives
    .filter((o) => o.company === input.company && !o.deleted_at)
    .sort((a, b) => a.sort_order - b.sort_order)

  const scopedTasks = input.tasks.filter((t) => {
    if (isExcludedFromFocus(t)) return false
    const company = resolveTaskCompany({
      task: t,
      objectiveById,
      initiativeById,
      projectCompanyById,
    })
    if (company !== input.company) return false
    if (
      !taskMatchesBotFilter(
        t,
        input.ownerFilter,
        initiativeById,
        taskOwnerNames,
      )
    ) {
      return false
    }
    return true
  })

  const withoutPointsCount = scopedTasks.filter(hasMissingPoints).length

  // Done in period
  const doneInPeriod = scopedTasks.filter(
    (t) =>
      t.status === "done" &&
      completedAtInPeriod(t.completed_at, period.startYmd, period.endYmd),
  )

  const totalDonePoints = doneInPeriod.reduce((s, t) => s + pointsOf(t), 0)
  const totalDoneTasks = doneInPeriod.length

  const goalRows: DriftFocusGoalRow[] = companyObjectives.map((obj) => {
    const objTasks = scopedTasks.filter((t) => t.objective_id === obj.id)
    const done = objTasks.filter(
      (t) =>
        t.status === "done" &&
        completedAtInPeriod(t.completed_at, period.startYmd, period.endYmd),
    )
    const pagar = objTasks.filter((t) => {
      const col = classifyDriftColumn(t, now)
      return col === "pagar"
    })
    const kvar = objTasks.filter((t) => {
      const col = classifyDriftColumn(t, now)
      return col === "pagang" || col === "backlog"
    })

    const donePoints = done.reduce((s, t) => s + pointsOf(t), 0)
    const pagarPoints = pagar.reduce((s, t) => s + pointsOf(t), 0)
    const kvarPoints = kvar.reduce((s, t) => s + pointsOf(t), 0)
    const share = shareOf(donePoints, totalDonePoints)

    const botMap = new Map<string, number>()
    for (const t of done) {
      const owner = taskOwnerNames(t)[0] ?? "—"
      botMap.set(owner, (botMap.get(owner) ?? 0) + pointsOf(t))
    }
    const botsInGoal = [...botMap.entries()]
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name, "sv"))

    // Also list pågår owners with 0 done for expanded panel
    for (const t of pagar) {
      const owner = taskOwnerNames(t)[0]
      if (owner && !botMap.has(owner)) {
        botsInGoal.push({ name: owner, points: 0 })
      }
    }

    const targetShare =
      obj.target_share != null ? Number(obj.target_share) : null
    const targetGroup = obj.target_group?.trim() || null

    let targetLabel: string
    if (input.company === "dirtywine") {
      const place =
        [...companyObjectives]
          .map((o) => ({
            id: o.id,
            pts: scopedTasks
              .filter(
                (t) =>
                  t.objective_id === o.id &&
                  t.status === "done" &&
                  completedAtInPeriod(
                    t.completed_at,
                    period.startYmd,
                    period.endYmd,
                  ),
              )
              .reduce((s, t) => s + pointsOf(t), 0),
            rank: o.sort_order,
          }))
          .sort(
            (a, b) =>
              b.pts - a.pts || a.rank - b.rank,
          )
          .findIndex((x) => x.id === obj.id) + 1
      targetLabel = `plats ${place} av ${companyObjectives.length}`
    } else if (targetGroup) {
      targetLabel = `i grupp ${targetGroup}`
    } else if (targetShare != null) {
      targetLabel = `mål ${Math.round(targetShare)} %`
    } else {
      targetLabel = "—"
    }

    const underTarget =
      !targetGroup &&
      targetShare != null &&
      share + 1e-9 < targetShare

    const placeByPoints =
      [...companyObjectives]
        .map((o) => ({
          id: o.id,
          pts: scopedTasks
            .filter(
              (t) =>
                t.objective_id === o.id &&
                t.status === "done" &&
                completedAtInPeriod(
                  t.completed_at,
                  period.startYmd,
                  period.endYmd,
                ),
            )
            .reduce((s, t) => s + pointsOf(t), 0),
        }))
        .sort((a, b) => b.pts - a.pts)
        .findIndex((x) => x.id === obj.id) + 1

    const focusBlurb = underTarget
      ? `Under målandelen. ${donePoints} p av ${totalDonePoints} p (${Math.round(share)} %). Målandel ${Math.round(targetShare!)} %. Plats ${placeByPoints} av ${companyObjectives.length} i poäng, rang ${obj.sort_order}.`
      : targetShare != null && !targetGroup
        ? `På eller över målandelen. ${donePoints} p av ${totalDonePoints} p (${Math.round(share)} %). Målandel ${Math.round(targetShare)} %. Plats ${placeByPoints} av ${companyObjectives.length} i poäng, rang ${obj.sort_order}.`
        : `${donePoints} p av ${totalDonePoints} p (${Math.round(share)} %). Plats ${placeByPoints} av ${companyObjectives.length} i poäng, rang ${obj.sort_order}.`

    return {
      id: obj.id,
      rank: obj.sort_order,
      title: obj.title,
      shortLabel: obj.short_label?.trim() || obj.title,
      donePoints,
      sharePct: share,
      targetShare,
      targetGroup,
      targetLabel,
      doneCount: done.length,
      pagarCount: pagar.length,
      pagarPoints,
      kvarCount: kvar.length,
      kvarPoints,
      effectMetricKey: obj.effect_metric_key ?? null,
      focusBlurb,
      botsInGoal,
      doneTasks: done
        .sort(
          (a, b) =>
            (b.completed_at ?? "").localeCompare(a.completed_at ?? "") ||
            a.title.localeCompare(b.title, "sv"),
        )
        .map((t) =>
          toExpandedTask(
            t,
            t.initiative_id ? initiativeById.get(t.initiative_id) : undefined,
          ),
        ),
      pagarTasks: pagar
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((t) =>
          toExpandedTask(
            t,
            t.initiative_id ? initiativeById.get(t.initiative_id) : undefined,
          ),
        ),
      kvarTasks: kvar
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map((t) =>
          toExpandedTask(
            t,
            t.initiative_id ? initiativeById.get(t.initiative_id) : undefined,
          ),
        ),
    }
  })

  // Group summary rows (e.g. 4-6)
  const groupKeys = [
    ...new Set(
      goalRows
        .map((g) => g.targetGroup)
        .filter((g): g is string => !!g),
    ),
  ]
  const groupSummaries = groupKeys.map((key) => {
    const members = goalRows.filter((g) => g.targetGroup === key)
    const donePoints = members.reduce((s, g) => s + g.donePoints, 0)
    const doneCount = members.reduce((s, g) => s + g.doneCount, 0)
    const pagarCount = members.reduce((s, g) => s + g.pagarCount, 0)
    const pagarPoints = members.reduce((s, g) => s + g.pagarPoints, 0)
    const kvarCount = members.reduce((s, g) => s + g.kvarCount, 0)
    const kvarPoints = members.reduce((s, g) => s + g.kvarPoints, 0)
    const share = shareOf(donePoints, totalDonePoints)
    const targetShare = members[0]?.targetShare ?? null
    const ranks = members.map((m) => m.rank).sort((a, b) => a - b)
    const label =
      ranks.length >= 2
        ? `Mål ${ranks[0]}–${ranks[ranks.length - 1]} tillsammans`
        : `Mål ${ranks[0]} tillsammans`
    return {
      key,
      label,
      donePoints,
      sharePct: share,
      targetShare,
      doneCount,
      pagarCount,
      pagarPoints,
      kvarCount,
      kvarPoints,
    }
  })

  const signal = computeFocusSignal({
    company: input.company,
    goals: goalRows.map((g) => ({
      rank: g.rank,
      shortLabel: g.shortLabel,
      donePoints: g.donePoints,
    })),
    totalDonePoints,
    periodShortLabel: period.shortLabel,
    periodInPhrase: periodInPhrase(period),
  })

  const markers =
    input.company === "pact"
      ? pactCumulativeTargetMarkers(
          goalRows.map((g) => ({
            rank: g.rank,
            targetShare: g.targetShare,
            targetGroup: g.targetGroup,
          })),
        )
      : []

  // Points per bot (done in period)
  const botAgg = new Map<
    string,
    { total: number; byGoal: Map<number, number> }
  >()
  for (const t of doneInPeriod) {
    const owner = taskOwnerNames(t)[0]
    if (!owner) continue
    const obj = t.objective_id ? objectiveById.get(t.objective_id) : undefined
    const rank = obj?.sort_order ?? 0
    const pts = pointsOf(t)
    if (!botAgg.has(owner)) {
      botAgg.set(owner, { total: 0, byGoal: new Map() })
    }
    const row = botAgg.get(owner)!
    row.total += pts
    if (rank > 0) {
      row.byGoal.set(rank, (row.byGoal.get(rank) ?? 0) + pts)
    }
  }
  const botRows: DriftFocusBotRow[] = [...botAgg.entries()]
    .map(([name, data]) => ({
      name,
      totalPoints: data.total,
      segments: [...data.byGoal.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rank, points]) => ({ rank, points })),
    }))
    .sort(
      (a, b) =>
        b.totalPoints - a.totalPoints || a.name.localeCompare(b.name, "sv"),
    )

  // 6-week trend: last completed weeks up to period end, capped at current week
  const endWeek = focusTrendEndWeek(period, now)
  const weeks = lastNIsoWeeks(endWeek, 6)
  const trendWeeks: DriftFocusTrendWeek[] = weeks.map((w) => ({
    isoWeek: w.isoWeek!,
    shortLabel: w.shortLabel,
    startYmd: w.startYmd,
    endYmd: w.endYmd,
    isFuture: isFutureFocusWeek(w, now),
  }))

  const trendByGoal = companyObjectives.map((obj) => {
    const points = weeks.map((w, i) => {
      if (trendWeeks[i]?.isFuture) return null
      return scopedTasks
        .filter(
          (t) =>
            t.objective_id === obj.id &&
            t.status === "done" &&
            completedAtInPeriod(t.completed_at, w.startYmd, w.endYmd),
        )
        .reduce((s, t) => s + pointsOf(t), 0)
    })
    const sum = points.reduce<number>((a, b) => a + (b ?? 0), 0)
    const first = points[0]
    const last = points[points.length - 1]
    const delta =
      typeof first === "number" && typeof last === "number"
        ? last - first
        : null
    return {
      objectiveId: obj.id,
      rank: obj.sort_order,
      shortLabel: obj.short_label?.trim() || obj.title,
      title: obj.title,
      pointsPerWeek: points,
      sum,
      deltaVsFirst: delta,
    }
  })

  // Effect metrics (synthetic / unlinked)
  const effectMetrics: DriftFocusEffectMetric[] = companyObjectives
    .filter((o) => o.effect_metric_key)
    .map((o) => {
      const key = o.effect_metric_key!
      const series = input.effectSeriesByKey?.[key] ?? null
      const linked = !!series && series.length > 0
      return {
        objectiveId: o.id,
        rank: o.sort_order,
        metricKey: key,
        label:
          key === "checkout_completion_rate"
            ? "Slutförda köp / påbörjade kassor"
            : key === "plp_pdp_sessions_weekly"
              ? "PLP/PDP-sessioner per vecka, direkt och via guider"
              : key,
        sourceLabel: "Saga",
        exampleData: linked,
        unlinked: !linked,
        values: linked ? series! : [],
        currentLabel: linked
          ? key === "checkout_completion_rate"
            ? `${String(series![series!.length - 1]!).replace(".", ",")} %`
            : String(series![series!.length - 1]!)
          : null,
        trendDirection: linked
          ? series![series!.length - 1]! < series![0]!
            ? "down"
            : series![series!.length - 1]! > series![0]!
              ? "up"
              : "flat"
          : null,
      }
    })

  const pausedCount = input.tasks.filter(
    (t) =>
      !t.deleted_at &&
      !t.parent_task_id &&
      resolveTaskCompany({
        task: t,
        objectiveById,
        initiativeById,
        projectCompanyById,
      }) === input.company &&
      (isPausedTitle(t.title) || t.status === "paused"),
  ).length

  const unprioritizedCount = input.tasks.filter(
    (t) =>
      !t.deleted_at &&
      !t.parent_task_id &&
      resolveTaskCompany({
        task: t,
        objectiveById,
        initiativeById,
        projectCompanyById,
      }) === input.company &&
      isUnprioritized(t) &&
      t.status !== "cancelled",
  ).length

  return {
    company: input.company,
    companySubtitle: companySubtitle(input.company),
    confirmer: focusPointsConfirmer(input.company),
    period,
    signal,
    cumulativeTargetMarkers: markers,
    goals: goalRows,
    groupSummaries,
    bots: botRows,
    totalDonePoints,
    totalDoneTasks,
    withoutPointsCount,
    unprioritizedCount,
    pausedCount,
    trendWeeks,
    trendByGoal,
    effectMetrics,
    prevPeriodAnchorYmd:
      period.kind === "week"
        ? shiftFocusPeriod(period, -1).startYmd
        : shiftFocusPeriod(period, -1).startYmd,
    nextPeriodAnchorYmd:
      period.kind === "week"
        ? shiftFocusPeriod(period, 1).startYmd
        : shiftFocusPeriod(period, 1).startYmd,
  }
}

export type { FocusSignalResult, FocusPeriodBounds }
