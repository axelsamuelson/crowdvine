"use client"

import { ChevronLeft, ChevronRight, HelpCircle } from "lucide-react"
import { useMemo, useState } from "react"
import { focusGoalColorClass } from "@/lib/operations/drift/focus-constants"
import type { FocusPeriodKind } from "@/lib/operations/drift/focus-period"
import type {
  DriftFocusData,
  DriftFocusGoalRow,
} from "@/lib/operations/drift/types"
import { cn } from "@/lib/utils"

interface Props {
  data: DriftFocusData
  period: FocusPeriodKind
  onPeriodChange: (period: FocusPeriodKind) => void
  onPeriodAnchorChange: (ymd: string) => void
  initialExpandId?: string | null
  initialHelpOpen?: boolean
}

function pct(n: number): string {
  return `${Math.round(n)} %`
}

function PointsBrick({
  points,
  proposed,
  confirmer,
}: {
  points: number | null
  proposed?: boolean
  confirmer: string
}) {
  if (points == null) {
    return (
      <span
        className="inline-flex items-center rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-xs tabular-nums text-gray-600 dark:border-zinc-600 dark:text-zinc-300"
        title="Poäng saknas"
      >
        – p
      </span>
    )
  }
  if (proposed) {
    return (
      <span
        className="inline-flex items-center rounded border border-dashed border-gray-400 px-1.5 py-0.5 text-xs tabular-nums text-gray-700 dark:border-zinc-500 dark:text-zinc-200"
        title={`Föreslagen, väntar på ${confirmer}`}
      >
        {points} p
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded bg-gray-100 px-1.5 py-0.5 text-xs tabular-nums text-gray-800 dark:bg-zinc-800 dark:text-zinc-100">
      {points} p
    </span>
  )
}

function Sparkline({
  values,
  className,
}: {
  values: number[]
  className?: string
}) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const w = 48
  const h = 16
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w
      const y = h - ((v - min) / span) * (h - 2) - 1
      return `${x},${y}`
    })
    .join(" ")
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className={cn("shrink-0 text-gray-400 dark:text-zinc-500", className)}
      aria-hidden
    >
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={pts}
      />
    </svg>
  )
}

function GoalMiniBar({
  sharePct,
  targetShare,
  targetGroup,
  rank,
}: {
  sharePct: number
  targetShare: number | null
  targetGroup: string | null
  rank: number
}) {
  const width = Math.min(100, sharePct * 2)
  const showMarker = !targetGroup && targetShare != null
  const markerLeft = showMarker ? targetShare! * 2 : null
  return (
    <div className="relative min-w-0 flex-1" aria-hidden>
      <div className="h-2 overflow-hidden rounded-sm bg-gray-100 dark:bg-zinc-800">
        <div
          className={cn("h-full rounded-sm", focusGoalColorClass(rank))}
          style={{ width: `${width}%` }}
        />
      </div>
      {markerLeft != null ? (
        <div
          className="absolute -inset-y-1 w-px bg-gray-800 dark:bg-zinc-100"
          style={{ left: `calc(${markerLeft}% - 0.5px)` }}
          title={`Målandel ${Math.round(targetShare!)} %`}
        />
      ) : null}
    </div>
  )
}

function ExpandedGoal({
  goal,
  data,
  effect,
}: {
  goal: DriftFocusGoalRow
  data: DriftFocusData
  effect: DriftFocusData["effectMetrics"][number] | undefined
}) {
  const maxBot = Math.max(1, ...goal.botsInGoal.map((b) => b.points))
  return (
    <div className="space-y-6 border-t border-gray-200 bg-gray-50 px-3 py-5 text-sm dark:border-[#1F1F23] dark:bg-zinc-900/50 sm:px-4">
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
            Fokus
          </p>
          <p className="mt-2 text-sm text-gray-900 dark:text-zinc-100">
            {goal.focusBlurb}
          </p>
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
              Kvalitet
            </p>
            {effect?.exampleData ? (
              <span className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-500 dark:border-zinc-600 dark:text-zinc-400">
                Exempeldata
              </span>
            ) : null}
          </div>
          {effect && !effect.unlinked ? (
            <div className="mt-2 space-y-1 text-sm text-gray-800 dark:text-zinc-200">
              <p className="font-medium">
                {effect.trendDirection === "down"
                  ? "Effektmåttet sjunker"
                  : effect.trendDirection === "up"
                    ? "Effektmåttet stiger"
                    : "Effektmåttet oförändrat"}
              </p>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                <span>
                  {effect.label}: {effect.currentLabel}{" "}
                  {data.period.shortLabel}
                  {effect.values.length >= 2
                    ? `, ${
                        effect.metricKey === "checkout_completion_rate"
                          ? `${String(effect.values[0]).replace(".", ",")} %`
                          : effect.values[0]
                      } ${data.trendWeeks[0]?.shortLabel ?? ""}`
                    : ""}
                  . Källa {effect.sourceLabel}.
                </span>
                <Sparkline values={effect.values} className="hidden sm:block" />
              </div>
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
              Effektmåttet är inte kopplat ännu.
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
              Poäng per bot
            </h4>
            <span className="text-xs tabular-nums text-gray-600 dark:text-zinc-400">
              {goal.donePoints} p
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {goal.botsInGoal.map((b) => (
              <li key={b.name} className="flex items-center gap-2 text-xs">
                <span className="w-16 shrink-0 truncate text-gray-800 dark:text-zinc-200">
                  {b.name}
                </span>
                <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-gray-200 dark:bg-zinc-800">
                  <div
                    className={cn("h-full", focusGoalColorClass(goal.rank))}
                    style={{
                      width: `${(b.points / maxBot) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-8 text-right tabular-nums text-gray-600 dark:text-zinc-400">
                  {b.points > 0 ? `${b.points} p` : "0"}
                </span>
              </li>
            ))}
            {goal.botsInGoal.length === 0 ? (
              <li className="text-xs text-gray-500 dark:text-zinc-400">
                Inget klart i perioden
              </li>
            ) : null}
          </ul>
        </div>
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
              Klart {data.period.shortLabel}
            </h4>
            <span className="text-xs tabular-nums text-gray-600 dark:text-zinc-400">
              {goal.doneCount} uppgifter · {goal.donePoints} p
            </span>
          </div>
          <ul className="mt-2 divide-y divide-gray-200 dark:divide-zinc-800">
            {goal.doneTasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2 py-2 text-xs">
                <PointsBrick
                  points={t.points}
                  proposed={t.proposed}
                  confirmer={data.confirmer}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-gray-900 dark:text-zinc-100">{t.heading}</p>
                  <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
                    {[t.owner, t.initiativeKey, t.atLabel]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {t.splitHint ? (
                    <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
                      Dela upp om det går
                    </p>
                  ) : null}
                  {t.proposed ? (
                    <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
                      Föreslagen, väntar på {data.confirmer}
                    </p>
                  ) : null}
                </div>
              </li>
            ))}
            {goal.doneTasks.length === 0 ? (
              <li className="py-2 text-xs text-gray-500 dark:text-zinc-400">
                Inga klara uppgifter
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {(
          [
            ["Pågår", goal.pagarTasks, goal.pagarCount, goal.pagarPoints],
            [
              "Kvar, nästa i ordning",
              goal.kvarTasks,
              goal.kvarCount,
              goal.kvarPoints,
            ],
          ] as const
        ).map(([title, list, count, points]) => (
          <div key={title}>
            <div className="flex items-baseline justify-between gap-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-zinc-400">
                {title}
              </h4>
              <span className="text-xs tabular-nums text-gray-600 dark:text-zinc-400">
                {count} · {points} p
              </span>
            </div>
            <ul className="mt-2 divide-y divide-gray-200 dark:divide-zinc-800">
              {list.map((t) => (
                <li key={t.id} className="flex items-start gap-2 py-2 text-xs">
                  <PointsBrick
                    points={t.points}
                    proposed={t.proposed}
                    confirmer={data.confirmer}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-gray-900 dark:text-zinc-100">
                      {t.heading}
                    </p>
                    <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
                      {t.owner ?? "Utan utförare"}
                      {t.initiativeKey ? ` · ${t.initiativeKey}` : ""}
                    </p>
                    {t.splitHint ? (
                      <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
                        Dela upp om det går
                      </p>
                    ) : null}
                    {t.proposed ? (
                      <p className="mt-0.5 text-gray-500 dark:text-zinc-400">
                        Föreslagen, väntar på {data.confirmer}
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
              {list.length === 0 ? (
                <li className="py-2 text-xs text-gray-500 dark:text-zinc-400">
                  Inga uppgifter
                </li>
              ) : null}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FokusTab({
  data,
  period,
  onPeriodChange,
  onPeriodAnchorChange,
  initialExpandId = null,
  initialHelpOpen = false,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(initialExpandId)
  const [helpOpen, setHelpOpen] = useState(initialHelpOpen)

  const effectByObjective = useMemo(() => {
    const m = new Map<string, DriftFocusData["effectMetrics"][number]>()
    for (const e of data.effectMetrics) m.set(e.objectiveId, e)
    return m
  }, [data.effectMetrics])

  const maxBotPoints = Math.max(1, ...data.bots.map((b) => b.totalPoints))

  return (
    <div className="space-y-8 overflow-x-clip">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg bg-gray-100 p-0.5 dark:bg-zinc-800"
            role="group"
            aria-label="Period"
          >
            {(
              [
                ["week", "Vecka"],
                ["month", "Månad"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={cn(
                  "h-8 rounded-md px-3 text-sm font-medium",
                  period === value
                    ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                    : "text-gray-700 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-white",
                )}
                onClick={() => onPeriodChange(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Föregående period"
              onClick={() => onPeriodAnchorChange(data.prevPeriodAnchorYmd)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 text-center">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {data.period.rangeLabel}
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {data.period.rangeHint}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-700 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Nästa period"
              onClick={() => onPeriodAnchorChange(data.nextPeriodAnchorYmd)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-sm text-gray-700 underline-offset-2 hover:underline dark:text-zinc-300"
          aria-expanded={helpOpen}
          onClick={() => setHelpOpen((v) => !v)}
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden />
          Så räknas poäng
        </button>
      </div>

      {helpOpen ? (
        <div className="max-w-2xl rounded-xl border border-gray-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            Så räknas poäng
          </p>
          <div className="mt-2 max-w-2xl space-y-2 text-xs leading-5 text-gray-700 dark:text-zinc-300">
            <p>
              Skala: 1 ≈ en halv dag, 2 ≈ en dag, 4 ≈ två dagar, 8 ≈ fyra dagar.
              En uppgift på 8 p delas upp om det går.
            </p>
            <p>
              Utföraren föreslår poängen, {data.confirmer} bekräftar. Streckad
              bricka betyder föreslagen, inte bekräftad. Saknad poäng visas som –
              p.
            </p>
            <p>
              Poängen räknas den vecka uppgiften blev Klart (mån–sön, svensk tid)
              och går till utföraren. Vid arbete av flera botar delas uppgiften i
              deluppgifter.
            </p>
            {data.company === "pact" ? (
              <>
                <p>
                  Målandelar för PACT, beslutade av Pierre: mål 1: 35 %, mål 2: 35
                  %, mål 3: 15 %, mål 4–6: 15 % tillsammans. Staplarna visar andel
                  av periodens poäng, strecken målandelen.
                </p>
                <p>
                  Signalen slår till om mål 1–2 får under 60 % av periodens
                  poäng, eller om något av mål 3–6 får fler poäng än mål 1 eller
                  mål 2.
                </p>
              </>
            ) : (
              <p>
                Dirty Wine visar «mål 1 fick flest poäng» tills Léa har bestämt
                målandelar och signalregel. PACT:s 60 %-regel och målandelar
                gäller inte här.
              </p>
            )}
          </div>
        </div>
      ) : null}

      <section aria-labelledby="fokus-signal-heading" className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span
            className={cn(
              "inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-xs font-medium",
              data.signal.kind === "omfordela"
                ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-300"
                : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300",
            )}
          >
            {data.signal.pillLabel}
          </span>
          <h2
            id="fokus-signal-heading"
            className="text-sm font-semibold text-gray-900 dark:text-white"
          >
            {data.signal.headline}
          </h2>
        </div>
        {data.signal.reason ? (
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {data.signal.reason}
          </p>
        ) : null}

        <div className="relative pt-1" role="img" aria-label="Poäng per mål">
          <div className="flex h-4 overflow-hidden rounded bg-gray-100 dark:bg-zinc-800">
            {data.goals.map((g) =>
              g.donePoints > 0 && data.totalDonePoints > 0 ? (
                <div
                  key={g.id}
                  className={cn("h-full", focusGoalColorClass(g.rank))}
                  style={{
                    width: `${(g.donePoints / data.totalDonePoints) * 100}%`,
                  }}
                  title={`Mål ${g.rank} ${g.shortLabel}: ${g.donePoints} p`}
                />
              ) : null,
            )}
          </div>
          {data.cumulativeTargetMarkers.length > 0 ? (
            <div className="pointer-events-none absolute inset-x-0 top-1 h-4">
              {data.cumulativeTargetMarkers.map((m) => (
                <div
                  key={m}
                  className="absolute -top-1 -bottom-1 w-px bg-gray-800 dark:bg-zinc-100"
                  style={{ left: `${m}%` }}
                  title={`Målandel ${m} %`}
                />
              ))}
            </div>
          ) : null}
          <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
            {data.goals.map((g) => (
              <li
                key={g.id}
                className="inline-flex items-center gap-2 text-xs text-gray-700 dark:text-zinc-300"
              >
                <span
                  className={cn(
                    "h-2 w-2 shrink-0 rounded-sm",
                    focusGoalColorClass(g.rank),
                  )}
                />
                <span>
                  {g.rank} {g.shortLabel}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="fokus-per-mal">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2
            id="fokus-per-mal"
            className="text-sm font-semibold text-gray-900 dark:text-white"
          >
            Fokus per mål
          </h2>
          <p className="text-xs tabular-nums text-gray-600 dark:text-zinc-400">
            {data.totalDonePoints} p klart {data.period.shortLabel}
          </p>
        </div>

        <div className="hidden border-b border-gray-200 pb-2 text-xs font-medium text-gray-500 dark:border-[#1F1F23] dark:text-zinc-400 lg:grid lg:grid-cols-[minmax(14rem,22rem)_minmax(0,1fr)_3.25rem_3.75rem_3.75rem] lg:gap-3">
          <div>Mål</div>
          <div>Poäng klart</div>
          <div className="text-right">Klart</div>
          <div className="text-right">Pågår</div>
          <div className="text-right">Kvar</div>
        </div>

        <div>
          {data.goals.map((goal) => {
            const open = expandedId === goal.id
            const effect = effectByObjective.get(goal.id)
            return (
              <div
                key={goal.id}
                className="border-b border-gray-200 dark:border-[#1F1F23]"
              >
                <button
                  type="button"
                  className="w-full py-3 text-left"
                  aria-expanded={open}
                  onClick={() =>
                    setExpandedId((id) => (id === goal.id ? null : goal.id))
                  }
                >
                  {/* Mobile */}
                  <div className="space-y-1.5 lg:hidden">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <span
                          className={cn(
                            "mt-0.5 text-gray-400 transition-transform dark:text-zinc-500",
                            open && "rotate-90",
                          )}
                          aria-hidden
                        >
                          ▸
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {goal.rank} {goal.title}
                        </span>
                      </div>
                      <span className="shrink-0 text-right text-sm tabular-nums text-gray-900 dark:text-white">
                        {goal.donePoints} p · {pct(goal.sharePct)} ·{" "}
                        {goal.targetLabel}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pl-5 text-xs text-gray-600 dark:text-zinc-400">
                      <div className="flex flex-wrap items-center gap-2">
                        {effect && !effect.unlinked ? (
                          <>
                            <span>{effect.currentLabel}</span>
                            <span>{data.period.shortLabel}</span>
                            {effect.exampleData ? (
                              <span className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 dark:border-zinc-600">
                                Exempeldata
                              </span>
                            ) : (
                              <span className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 dark:border-zinc-600">
                                ej kopplat
                              </span>
                            )}
                          </>
                        ) : goal.effectMetricKey ? (
                          <span className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 dark:border-zinc-600">
                            ej kopplat
                          </span>
                        ) : null}
                      </div>
                      <span>
                        {goal.doneCount} klart · {goal.pagarCount} pågår ·{" "}
                        {goal.kvarCount} kvar
                      </span>
                    </div>
                  </div>

                  {/* Desktop */}
                  <div className="hidden lg:grid lg:grid-cols-[minmax(14rem,22rem)_minmax(0,1fr)_3.25rem_3.75rem_3.75rem] lg:items-center lg:gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <span
                        className={cn(
                          "mt-0.5 text-gray-400 transition-transform dark:text-zinc-500",
                          open && "rotate-90",
                        )}
                        aria-hidden
                      >
                        ▸
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {goal.rank} {goal.title}
                        </p>
                        {effect && !effect.unlinked ? (
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-zinc-400">
                            <span>
                              {effect.currentLabel} {data.period.shortLabel}
                            </span>
                            <Sparkline values={effect.values} />
                            <span>{effect.sourceLabel}</span>
                            {effect.exampleData ? (
                              <span className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 dark:border-zinc-600">
                                Exempeldata
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex min-w-0 items-center gap-3">
                      <GoalMiniBar
                        sharePct={goal.sharePct}
                        targetShare={goal.targetShare}
                        targetGroup={goal.targetGroup}
                        rank={goal.rank}
                      />
                      <div className="w-28 shrink-0 text-right text-sm">
                        <p className="font-medium tabular-nums text-gray-900 dark:text-white">
                          {goal.donePoints} p
                        </p>
                        <p className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                          {pct(goal.sharePct)} · {goal.targetLabel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-sm tabular-nums text-gray-900 dark:text-white">
                      {goal.doneCount}
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums text-gray-900 dark:text-white">
                        {goal.pagarCount}
                      </p>
                      <p className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                        {goal.pagarPoints} p
                      </p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="tabular-nums text-gray-900 dark:text-white">
                        {goal.kvarCount}
                      </p>
                      <p className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                        {goal.kvarPoints} p
                      </p>
                    </div>
                  </div>
                </button>
                {open ? (
                  <ExpandedGoal goal={goal} data={data} effect={effect} />
                ) : null}
              </div>
            )
          })}

          {data.groupSummaries.map((g) => (
            <div
              key={g.key}
              className="border-b border-gray-200 py-3 dark:border-[#1F1F23]"
            >
              <div className="hidden lg:grid lg:grid-cols-[minmax(14rem,22rem)_minmax(0,1fr)_3.25rem_3.75rem_3.75rem] lg:items-center lg:gap-3">
                <p className="pl-5 text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {g.label}
                </p>
                <div className="flex min-w-0 items-center gap-3">
                  <GoalMiniBar
                    sharePct={g.sharePct}
                    targetShare={g.targetShare}
                    targetGroup={null}
                    rank={4}
                  />
                  <div className="w-28 shrink-0 text-right text-sm">
                    <p className="font-medium tabular-nums text-gray-900 dark:text-white">
                      {g.donePoints} p
                    </p>
                    <p className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                      {pct(g.sharePct)}
                      {g.targetShare != null
                        ? ` · mål ${Math.round(g.targetShare)} %`
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm tabular-nums text-gray-900 dark:text-white">
                  {g.doneCount}
                </div>
                <div className="text-right text-sm tabular-nums text-gray-500 dark:text-zinc-400">
                  {g.pagarCount}
                </div>
                <div className="text-right text-sm tabular-nums text-gray-500 dark:text-zinc-400">
                  {g.kvarCount}
                </div>
              </div>
              <div className="flex items-start justify-between gap-3 lg:hidden">
                <p className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                  {g.label}
                </p>
                <div className="text-right text-sm tabular-nums">
                  <p className="text-gray-900 dark:text-white">
                    {g.donePoints} p · {pct(g.sharePct)}
                    {g.targetShare != null
                      ? ` · mål ${Math.round(g.targetShare)} %`
                      : ""}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    {g.doneCount} klart
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-col gap-1 text-xs text-gray-600 dark:text-zinc-400 sm:flex-row sm:justify-between">
          <p>
            Totalt klart {data.totalDonePoints} p · {data.totalDoneTasks}{" "}
            uppgifter
          </p>
          <p>
            Ej prioriterade ({data.unprioritizedCount}) och pausade (
            {data.pausedCount}) räknas inte
          </p>
        </div>
      </section>

      <section aria-labelledby="poang-per-bot">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2
            id="poang-per-bot"
            className="text-sm font-semibold text-gray-900 dark:text-white"
          >
            Poäng per bot
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-400">
            {data.confirmer} fördelar om · {data.period.shortLabel}
          </p>
        </div>
        <ul>
          {data.bots.map((bot) => (
            <li
              key={bot.name}
              className="flex items-center gap-4 border-b border-gray-100 py-2 dark:border-zinc-900"
            >
              <span className="w-20 shrink-0 truncate text-sm text-gray-900 dark:text-zinc-100">
                {bot.name}
              </span>
              <div
                className="flex h-2 min-w-0 flex-1 overflow-hidden rounded-sm bg-gray-100 dark:bg-zinc-800"
                role="img"
                aria-label={`${bot.totalPoints} poäng`}
                style={{
                  maxWidth: `${(bot.totalPoints / maxBotPoints) * 100}%`,
                }}
              >
                {bot.segments.map((seg) => (
                  <div
                    key={seg.rank}
                    className={cn("h-full", focusGoalColorClass(seg.rank))}
                    style={{
                      width: `${(seg.points / bot.totalPoints) * 100}%`,
                    }}
                  />
                ))}
              </div>
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-gray-900 dark:text-white">
                {bot.totalPoints} p
              </span>
            </li>
          ))}
          {data.bots.length === 0 ? (
            <li className="py-2 text-sm text-gray-500 dark:text-zinc-400">
              Inga poäng i perioden
            </li>
          ) : null}
        </ul>
      </section>

      {period === "month" ? (
        <>
          <section aria-labelledby="fokus-trend">
            <h2
              id="fokus-trend"
              className="mb-3 text-sm font-semibold text-gray-900 dark:text-white"
            >
              Klart per vecka, senaste 6 veckorna
            </h2>

            {/* Mobile &lt; sm: stacked week rows — no horizontal scroll at 390. */}
            <ul className="space-y-3 sm:hidden" data-fokus-trend-mobile>
              {data.trendWeeks.map((w, weekIdx) => {
                const segments = data.trendByGoal.map((g) => ({
                  rank: g.rank,
                  points: g.pointsPerWeek[weekIdx] ?? 0,
                }))
                const total = segments.reduce((s, x) => s + x.points, 0)
                const topPoints = segments
                  .filter((s) => s.rank === 1 || s.rank === 2)
                  .reduce((s, x) => s + x.points, 0)
                const topShare =
                  total > 0 ? Math.round((topPoints / total) * 100) : 0
                return (
                  <li
                    key={w.isoWeek}
                    className="border-b border-gray-100 pb-3 dark:border-zinc-900"
                  >
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {w.shortLabel}
                      </span>
                      <span className="tabular-nums text-gray-900 dark:text-white">
                        {total} p
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-zinc-400">
                      mål 1–2: {topShare} %
                    </p>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-sm bg-gray-100 dark:bg-zinc-800">
                      {segments
                        .filter((s) => s.points > 0)
                        .map((s) => (
                          <div
                            key={s.rank}
                            className={cn("h-full", focusGoalColorClass(s.rank))}
                            style={{
                              width: `${(s.points / Math.max(1, total)) * 100}%`,
                            }}
                            title={`Mål ${s.rank}: ${s.points} p`}
                          />
                        ))}
                    </div>
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600 dark:text-zinc-400">
                      {segments.map((s) => (
                        <li key={s.rank} className="tabular-nums">
                          <span
                            className={cn(
                              "mr-1 inline-block h-2 w-2 rounded-sm align-middle",
                              focusGoalColorClass(s.rank),
                              s.points === 0 && "opacity-30",
                            )}
                            aria-hidden
                          />
                          {s.rank}: {s.points}
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>

            {/* Desktop sm+: wide goal×week table (unchanged). */}
            <div className="hidden overflow-x-auto sm:block" data-fokus-trend-desktop>
              <table className="w-full min-w-[36rem] text-left text-xs">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 dark:border-[#1F1F23] dark:text-zinc-400">
                    <th className="py-2 pr-3 font-medium">Mål</th>
                    {data.trendWeeks.map((w) => (
                      <th
                        key={w.isoWeek}
                        className="px-1 py-2 text-center font-medium"
                      >
                        {w.shortLabel}
                      </th>
                    ))}
                    <th className="py-2 pl-3 font-medium">Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trendByGoal.map((row) => {
                    const max = Math.max(1, ...row.pointsPerWeek)
                    return (
                      <tr
                        key={row.objectiveId}
                        className="border-b border-gray-100 dark:border-zinc-900"
                      >
                        <td className="py-2 pr-3 text-sm text-gray-900 dark:text-zinc-100">
                          {row.rank} {row.shortLabel}
                        </td>
                        {row.pointsPerWeek.map((p, i) => (
                          <td key={i} className="px-1 py-2 align-bottom">
                            <div className="mx-auto flex h-[60px] w-full max-w-[1.75rem] flex-col items-center justify-end gap-1">
                              <span
                                className={cn(
                                  "tabular-nums",
                                  i === row.pointsPerWeek.length - 1
                                    ? "font-semibold text-gray-900 dark:text-white"
                                    : "text-gray-500 dark:text-zinc-400",
                                )}
                              >
                                {p}
                              </span>
                              <div
                                className={cn(
                                  "w-full rounded-sm",
                                  focusGoalColorClass(row.rank),
                                  i < row.pointsPerWeek.length - 1 &&
                                    "opacity-40",
                                )}
                                style={{
                                  height: `${Math.max(4, (p / max) * 36)}px`,
                                }}
                              />
                            </div>
                          </td>
                        ))}
                        <td className="py-2 pl-3 text-sm">
                          <p className="tabular-nums text-gray-900 dark:text-white">
                            {row.sum} p på 6 veckor
                          </p>
                          <p className="text-xs text-gray-500 dark:text-zinc-400">
                            {row.deltaVsFirst >= 0 ? "+" : ""}
                            {row.deltaVsFirst} p mot{" "}
                            {data.trendWeeks[0]?.shortLabel}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section aria-labelledby="fokus-effekt" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id="fokus-effekt"
                className="text-sm font-semibold text-gray-900 dark:text-white"
              >
                Effektmått per vecka, källa Saga
              </h2>
              <span className="rounded border border-dashed border-gray-300 px-1.5 py-0.5 text-xs text-gray-500 dark:border-zinc-600 dark:text-zinc-400">
                Exempeldata
              </span>
            </div>
            {data.effectMetrics.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                Inga effektmått kopplade.
              </p>
            ) : (
              <ul className="space-y-4">
                {data.effectMetrics.map((m) => (
                  <li key={m.metricKey} className="text-sm">
                    <p className="text-gray-900 dark:text-zinc-100">
                      {m.rank} {m.label}
                    </p>
                    {/* Mobile: stacked week rows */}
                    <ul className="mt-2 space-y-1 sm:hidden">
                      {m.values.map((v, i) => (
                        <li
                          key={i}
                          className="flex justify-between gap-3 text-xs tabular-nums text-gray-600 dark:text-zinc-400"
                        >
                          <span>
                            {data.trendWeeks[i]?.shortLabel ?? `v.${i + 1}`}
                          </span>
                          <span>
                            {m.metricKey === "checkout_completion_rate"
                              ? `${String(v).replace(".", ",")}%`
                              : v}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {/* Desktop: 6-col grid */}
                    <div className="mt-2 hidden grid-cols-6 gap-1 text-center text-xs tabular-nums text-gray-600 dark:text-zinc-400 sm:grid">
                      {m.values.map((v, i) => (
                        <div key={i}>
                          {m.metricKey === "checkout_completion_rate"
                            ? `${String(v).replace(".", ",")}%`
                            : v}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 hidden justify-end sm:flex">
                      <Sparkline values={m.values} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
