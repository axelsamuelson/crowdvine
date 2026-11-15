import {
  PACT_TOP_GOAL_RANKS,
  PACT_TOP_GOALS_MIN_SHARE,
} from "./focus-constants"
import type { DriftCompany } from "./priority-rules"

export type FocusSignalKind = "omfordela" | "i_balans"

export interface FocusGoalPointsInput {
  rank: number
  shortLabel: string
  donePoints: number
}

export interface FocusSignalResult {
  kind: FocusSignalKind
  pillLabel: string
  headline: string
  /** Optional grey reason line (Omfördela only, max one sentence). */
  reason: string | null
}

/**
 * PACT signal:
 * - Omfördela if goals 1–2 together get under 60% of period points, OR
 * - any of goals 3–6 gets more points than goal 1 or goal 2.
 * Dirty Wine: "mål 1 fick flest poäng" (always I balans for now; no target shares).
 */
export function computeFocusSignal(input: {
  company: DriftCompany
  goals: FocusGoalPointsInput[]
  totalDonePoints: number
  periodShortLabel: string
  /** e.g. "v. 46" or "i november" / "november" */
  periodInPhrase: string
}): FocusSignalResult {
  const { company, goals, totalDonePoints, periodInPhrase } = input

  if (company === "dirtywine") {
    const sorted = [...goals].sort((a, b) => b.donePoints - a.donePoints)
    const top = sorted[0]
    const label = top?.shortLabel?.trim() || `mål ${top?.rank ?? 1}`
    const rank = top?.rank ?? 1
    return {
      kind: "i_balans",
      pillLabel: "I balans",
      headline: `Mål ${rank} ${label} fick flest poäng ${periodInPhrase}`,
      reason: null,
    }
  }

  const byRank = new Map(goals.map((g) => [g.rank, g]))
  const g1 = byRank.get(1)
  const g2 = byRank.get(2)
  const topPoints = (g1?.donePoints ?? 0) + (g2?.donePoints ?? 0)
  const topShare =
    totalDonePoints > 0 ? (topPoints / totalDonePoints) * 100 : 0
  const topShareRounded = Math.round(topShare)

  const underMin =
    totalDonePoints > 0 && topShare < PACT_TOP_GOALS_MIN_SHARE - 1e-9

  const g1p = g1?.donePoints ?? 0
  const g2p = g2?.donePoints ?? 0
  const lowerGoals = goals.filter((g) => g.rank >= 3 && g.rank <= 6)
  const offenders = lowerGoals.filter(
    (g) => g.donePoints > g1p || g.donePoints > g2p,
  )
  // Heaviest offender only (one sentence)
  offenders.sort((a, b) => b.donePoints - a.donePoints)
  const heaviest = offenders[0] ?? null

  const needsRedistribute = underMin || !!heaviest

  const ranksLabel = PACT_TOP_GOAL_RANKS.join("–")
  const headline = `Mål ${ranksLabel} fick ${topShareRounded} % av poängen ${periodInPhrase}, mål ${PACT_TOP_GOALS_MIN_SHARE} %`

  if (!needsRedistribute) {
    return {
      kind: "i_balans",
      pillLabel: "I balans",
      headline,
      reason: null,
    }
  }

  let reason: string | null = null
  if (heaviest) {
    const name = heaviest.shortLabel?.trim() || `mål ${heaviest.rank}`
    reason = `Mål ${heaviest.rank} ${name} fick fler poäng än mål 1 och 2.`
  }

  return {
    kind: "omfordela",
    pillLabel: "Omfördela",
    headline,
    reason,
  }
}

/**
 * Cumulative target markers for stacked bar (PACT only).
 * Sketch: 35 / 70 / 85 for goals 1–3. Group share (4–6) is not marked on the
 * overview bar (would sit at 100%); it appears on the group summary row instead.
 */
export function pactCumulativeTargetMarkers(
  goals: Array<{ rank: number; targetShare: number | null; targetGroup: string | null }>,
): number[] {
  const solo = goals
    .filter((g) => !g.targetGroup && g.targetShare != null)
    .sort((a, b) => a.rank - b.rank)
  const markers: number[] = []
  let cum = 0
  for (const g of solo) {
    cum += g.targetShare!
    markers.push(cum)
  }
  return markers
}
