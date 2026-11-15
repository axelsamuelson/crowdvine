"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import { ChevronDown, ChevronRight, UserRound, X } from "lucide-react"
import { formatQueueDeadlineLabel } from "@/lib/operations/drift/build-overview"
import type {
  DriftCompanyFilter,
  DriftMalObjective,
  DriftOverviewData,
  DriftPagarTask,
  DriftPipelineObjective,
  DriftPipelineTaskCard,
  DriftQueueItem,
  DriftTab,
  DriftTaskDetail,
  DriftUnprioritizedTask,
  DriftWeekItem,
} from "@/lib/operations/drift/types"
import { cn } from "@/lib/utils"
import { DriftDetailPanel } from "./drift-detail-panel"

const OPEN_LINK_CLASS =
  "shrink-0 text-sm font-medium text-gray-900 underline underline-offset-2 decoration-gray-300 hover:text-gray-700 dark:text-zinc-100 dark:decoration-zinc-500 dark:hover:text-zinc-200"

const CHIP_CLASS =
  "inline-flex max-w-full items-center gap-1 rounded-md border border-gray-200 bg-transparent px-2 py-0.5 text-xs text-gray-700 dark:border-zinc-600 dark:text-zinc-300"

const INIT_TAG_CLASS =
  "inline-flex max-w-full items-center gap-1 text-xs text-gray-600 dark:text-zinc-400"

const WAIT_YOU_BADGE_CLASS =
  "inline-flex items-center rounded-md border border-gray-900 px-2 py-0.5 text-xs font-medium text-gray-900 dark:border-zinc-200 dark:text-zinc-100"

const WAIT_REVIEW_BADGE_CLASS =
  "inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"

const YELLOW_BADGE =
  "inline-flex items-center rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"

const RED_BADGE =
  "inline-flex items-center rounded-md border border-red-300 bg-red-50 px-2 py-0.5 text-xs font-medium text-red-800 dark:border-red-800 dark:bg-red-950/40 dark:text-red-200"

const TITLE_BREAK =
  "break-words [overflow-wrap:anywhere] [word-break:normal] [hyphens:manual]"

interface Props {
  initialData: DriftOverviewData
  company: DriftCompanyFilter
  owner: string | null
  tab: DriftTab
  godkannande: string | null
}

function buildQuery(opts: {
  company: DriftCompanyFilter
  owner: string | null
  tab: DriftTab
  godkannande?: string | null
}): string {
  const params = new URLSearchParams()
  if (opts.company !== "pact") params.set("company", opts.company)
  if (opts.owner) params.set("owner", opts.owner)
  if (opts.tab !== "oversikt") params.set("tab", opts.tab)
  if (opts.godkannande) params.set("godkannande", opts.godkannande)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

function BadgeForTask({
  badge,
}: {
  badge: "waiting_for_you" | "waiting_for_review" | null
}) {
  if (badge === "waiting_for_you") {
    return <span className={WAIT_YOU_BADGE_CLASS}>Väntar på dig</span>
  }
  if (badge === "waiting_for_review") {
    return <span className={WAIT_REVIEW_BADGE_CLASS}>Väntar på granskning</span>
  }
  return null
}

function ObjectiveChip({
  objective,
}: {
  objective: NonNullable<DriftPagarTask["objective"]>
}) {
  return (
    <span className={CHIP_CLASS} title={objective.title}>
      <span className="font-medium tabular-nums">{objective.rank}</span>
      <span className={cn("truncate", TITLE_BREAK)}>{objective.shortLabel}</span>
    </span>
  )
}

function InitiativeTag({
  initiative,
}: {
  initiative: NonNullable<DriftPagarTask["initiative"]>
}) {
  return (
    <span className={INIT_TAG_CLASS} title={initiative.title}>
      <span className="font-medium text-gray-500 dark:text-zinc-500">
        {initiative.key}
      </span>
      <span className={cn("truncate", TITLE_BREAK)}>{initiative.title}</span>
    </span>
  )
}

function QueueRow({
  item,
  onOpen,
}: {
  item: DriftQueueItem
  onOpen: () => void
}) {
  return (
    <article className="flex items-start justify-between gap-3 border-b border-gray-100 py-3 last:border-b-0 dark:border-zinc-800">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
              item.overdue ? "bg-red-500" : "bg-gray-300 dark:bg-zinc-600",
            )}
            aria-hidden
          />
          <h3 className={cn("text-sm font-medium text-gray-900 dark:text-zinc-100", TITLE_BREAK)}>
            {item.title}
          </h3>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 pl-3.5 text-xs text-gray-500 dark:text-zinc-400">
          <span>{item.agent}</span>
          {item.deadline ? (
            <span className={item.overdue ? "font-medium text-red-600 dark:text-red-400" : ""}>
              {formatQueueDeadlineLabel(item.deadline, item.overdue)}
            </span>
          ) : null}
        </div>
        {item.question ? (
          <p className="mt-1 line-clamp-2 pl-3.5 text-xs text-gray-600 dark:text-zinc-400">
            {item.question}
          </p>
        ) : null}
      </div>
      <button type="button" className={OPEN_LINK_CLASS} onClick={onOpen}>
        Öppna rad
      </button>
    </article>
  )
}

function PagarRow({
  task,
  onOpen,
}: {
  task: DriftPagarTask
  onOpen: () => void
}) {
  return (
    <article
      className={cn(
        "rounded-lg border px-4 py-3",
        task.startedWithoutInitiative
          ? "border-red-300 bg-red-50/60 dark:border-red-800 dark:bg-red-950/20"
          : "border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]",
      )}
    >
      <button type="button" className="w-full text-left" onClick={onOpen}>
        <h3
          className={cn(
            "text-sm font-semibold text-gray-900 dark:text-zinc-100",
            TITLE_BREAK,
          )}
        >
          {task.heading}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {task.owner ? (
            <span className="text-xs text-gray-600 dark:text-zinc-400">
              {task.owner}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Utan utförare</span>
          )}
          {task.objective ? <ObjectiveChip objective={task.objective} /> : null}
          {task.initiative ? (
            <InitiativeTag initiative={task.initiative} />
          ) : null}
          {task.belowRankLabel ? (
            <span className="text-xs text-gray-500 dark:text-zinc-500">
              {task.belowRankLabel}
            </span>
          ) : null}
          <BadgeForTask badge={task.badge} />
          {task.startedWithoutInitiative ? (
            <span className={RED_BADGE}>Påbörjad utan initiativ</span>
          ) : task.unprioritized ? (
            <span className={YELLOW_BADGE}>Ej prioriterad</span>
          ) : null}
        </div>
        {task.startedWithoutInitiative ? (
          <p className="mt-2 text-xs text-red-700 dark:text-red-300">
            Påbörjad utan initiativ. Välj initiativ eller pausa uppgiften.
          </p>
        ) : null}
      </button>
    </article>
  )
}

function WeekRow({
  item,
  onOpen,
}: {
  item: DriftWeekItem
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      className="flex w-full items-start justify-between gap-3 border-b border-gray-100 py-3 text-left last:border-b-0 dark:border-zinc-800"
      onClick={onOpen}
    >
      <div className="min-w-0 flex-1">
        <h3
          className={cn(
            "text-sm font-medium text-gray-900 dark:text-zinc-100",
            TITLE_BREAK,
          )}
        >
          {item.heading}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {item.objective ? <ObjectiveChip objective={item.objective} /> : null}
          {item.initiative ? (
            <InitiativeTag initiative={item.initiative} />
          ) : null}
          {item.unprioritized ? (
            <span className={YELLOW_BADGE}>Ej prioriterad</span>
          ) : null}
        </div>
      </div>
      <span className="shrink-0 text-xs text-gray-500 dark:text-zinc-400">
        {item.atLabel}
      </span>
    </button>
  )
}

function PipelineCard({
  card,
  onOpen,
}: {
  card: DriftPipelineTaskCard
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-lg border px-3 py-3 text-left",
        card.startedWithoutInitiative
          ? "border-red-300 bg-red-50/70 dark:border-red-800 dark:bg-red-950/30"
          : card.unprioritized
            ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20"
            : "border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]",
      )}
    >
      <p
        className={cn(
          "text-sm font-medium leading-snug text-gray-900 dark:text-zinc-100",
          TITLE_BREAK,
        )}
      >
        {card.heading}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {card.owner ? (
          <span className="text-xs text-gray-600 dark:text-zinc-400">
            {card.owner}
          </span>
        ) : (
          <span className="text-xs text-gray-400">Utan utförare</span>
        )}
        {card.startedWithoutInitiative ? (
          <span className={RED_BADGE}>Ej prioriterad</span>
        ) : card.unprioritized ? (
          <span className={YELLOW_BADGE}>Ej prioriterad</span>
        ) : null}
        {card.belowRank ? (
          <span className="text-xs text-gray-500">↑ Pågår under rang</span>
        ) : null}
        <BadgeForTask badge={card.badge} />
        {card.atLabel ? (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">
            {card.atLabel}
          </span>
        ) : null}
      </div>
    </button>
  )
}

function ProgressBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0
  return (
    <div className="w-28">
      <p className="mb-1 text-right text-xs text-gray-500 dark:text-zinc-400">
        Klart {done} av {total}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function MalObjectiveCard({
  objective,
  botFilter,
  onOpenTask,
}: {
  objective: DriftMalObjective
  botFilter: string | null
  onOpenTask: (detail: DriftTaskDetail) => void
}) {
  const [expanded, setExpanded] = useState(objective.defaultExpanded)
  const [showAllByInit, setShowAllByInit] = useState<Record<string, boolean>>(
    {},
  )

  return (
    <section className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <button
        type="button"
        className="flex w-full items-start gap-3 px-4 py-4 text-left sm:px-5"
        onClick={() => setExpanded((v) => !v)}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-100 text-sm font-semibold tabular-nums text-gray-800 dark:bg-zinc-800 dark:text-zinc-100">
          {objective.rank}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              "text-base font-semibold text-gray-900 dark:text-white",
              TITLE_BREAK,
            )}
          >
            {objective.title}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            {objective.priorityLabel}
            {" · "}
            {objective.initiativeCount} initiativ
            {objective.pagarCount > 0
              ? ` · ${objective.pagarCount} pågår`
              : ""}
            {botFilter ? ` · filter ${botFilter}` : ""}
          </p>
        </div>
        <ProgressBar done={objective.doneCount} total={objective.totalCount} />
        {expanded ? (
          <ChevronDown className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
        ) : (
          <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-gray-100 px-4 py-4 sm:px-5 dark:border-zinc-800">
          {objective.emptyForFilter ? (
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Inget för {botFilter} i det här målet.
            </p>
          ) : (
            objective.initiatives.map((init) => {
              const showAll = showAllByInit[init.id]
              const rows = showAll ? init.allTasks : init.visibleTasks
              return (
                <div key={init.id} className="space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                      <span className="text-gray-500 dark:text-zinc-400">
                        {init.key}
                      </span>{" "}
                      {init.title}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      Ansvarig {init.ownerAgent}
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-zinc-500">
                    {init.pagarCount} pågår · {init.nastaCount} nästa ·{" "}
                    {init.klartWeekCount} klart
                  </p>
                  <ul className="space-y-2">
                    {rows.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2 text-left"
                          onClick={() => onOpenTask(row.detail)}
                        >
                          <span className="mt-0.5 w-4 shrink-0 text-xs tabular-nums text-gray-400">
                            {row.place}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={cn(
                                "text-sm text-gray-900 dark:text-zinc-100",
                                TITLE_BREAK,
                              )}
                            >
                              {row.heading}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "text-xs",
                                  row.status === "pagar"
                                    ? "text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-zinc-400",
                                )}
                              >
                                <span
                                  className={cn(
                                    "mr-1.5 inline-block h-1.5 w-1.5 rounded-full",
                                    row.status === "pagar"
                                      ? "bg-blue-500"
                                      : "bg-gray-300 dark:bg-zinc-600",
                                  )}
                                />
                                {row.statusLabel}
                                {row.owner ? ` · ${row.owner}` : ""}
                              </span>
                              <BadgeForTask badge={row.badge} />
                              {row.belowRank ? (
                                <span className="text-xs text-gray-500">
                                  ↑ Pågår under rang
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {init.hiddenTaskCount > 0 && !showAll ? (
                    <button
                      type="button"
                      className="text-xs font-medium text-gray-600 underline dark:text-zinc-400"
                      onClick={() =>
                        setShowAllByInit((s) => ({ ...s, [init.id]: true }))
                      }
                    >
                      Visa alla {init.allTasks.length} uppgifter
                    </button>
                  ) : null}
                  {init.pausedCount > 0 ? (
                    <p className="text-xs text-gray-500">
                      Visa {init.pausedCount} pausade
                    </p>
                  ) : null}
                  {init.klartWeekCount > 0 ? (
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {init.klartWeekCount} klar
                      {init.klartWeekCount === 1 ? "" : "a"} den här veckan
                    </p>
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      ) : null}
    </section>
  )
}

export function DriftOverviewClient({
  initialData,
  company,
  owner,
  tab,
  godkannande,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const data = initialData
  const [detail, setDetail] = useState<DriftTaskDetail | null>(null)
  const [botMenuOpen, setBotMenuOpen] = useState(false)
  // Stable id — avoid useId() hydration mismatch on aria-controls across SSR/CSR.
  const botMenuId = "drift-bot-menu"

  const [pipelineExpanded, setPipelineExpanded] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        data.pipelineObjectives.map((o) => [o.id, o.defaultExpanded]),
      ),
  )

  useEffect(() => {
    if (!godkannande) return
    const q = data.queue.find((item) => item.id === godkannande)
    if (!q) return
    setDetail({
      id: q.id,
      heading: q.title,
      description: [q.question, q.recommendation]
        .filter(Boolean)
        .join("\n\n"),
      owner: q.agent,
      initiativeOwner: null,
      objectiveId: null,
      objectiveLabel: null,
      initiativeId: null,
      initiativeLabel: null,
      priorityLabel: null,
      sortOrderLabel: null,
      statusLabel: q.overdue ? "Förfallen" : "Väntar",
      dateLabel: q.deadline
        ? formatQueueDeadlineLabel(q.deadline, q.overdue)
        : "—",
      prNumber: null,
      prUrl: null,
      unprioritized: false,
      startedWithoutInitiative: false,
    })
  }, [godkannande, data.queue])

  function navigate(next: {
    company?: DriftCompanyFilter
    owner?: string | null
    tab?: DriftTab
    godkannande?: string | null
  }) {
    const qs = buildQuery({
      company: next.company ?? company,
      owner: next.owner === undefined ? owner : next.owner,
      tab: next.tab ?? tab,
      godkannande: next.godkannande ?? null,
    })
    router.push(`${pathname}${qs}`)
  }

  const firstName = useMemo(() => {
    // Display-only; queue section title uses Axel as in sketch when unknown.
    return "Axel"
  }, [])

  const unprioritizedPipelineCount =
    data.pipelineUnprioritized.pagar.length +
    data.pipelineUnprioritized.pagang.length +
    data.pipelineUnprioritized.klart.length

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              Driftöversikt
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-zinc-400">
              {data.companySubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-lg border border-gray-200 p-0.5 dark:border-zinc-700"
              role="group"
              aria-label="Bolag"
            >
              {(
                [
                  ["pact", "PACT"],
                  ["dirtywine", "Dirty Wine"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium",
                    company === value
                      ? "bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-gray-600 hover:bg-gray-50 dark:text-zinc-300 dark:hover:bg-zinc-800",
                  )}
                  onClick={() => navigate({ company: value, owner: null })}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative inline-flex items-center gap-1">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                aria-haspopup="listbox"
                aria-expanded={botMenuOpen}
                aria-controls={botMenuId}
                onClick={() => setBotMenuOpen((v) => !v)}
              >
                <UserRound className="h-3.5 w-3.5" aria-hidden />
                {owner ?? "Alla botar"}
              </button>
              {owner ? (
                <button
                  type="button"
                  aria-label="Rensa botfilter"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-1.5 text-gray-800 hover:bg-gray-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                  onClick={() => {
                    navigate({ owner: null })
                    setBotMenuOpen(false)
                  }}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
              {botMenuOpen ? (
                <ul
                  id={botMenuId}
                  role="listbox"
                  className="absolute right-0 z-20 mt-1 max-h-64 w-48 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
                >
                  <li>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
                      onClick={() => {
                        navigate({ owner: null })
                        setBotMenuOpen(false)
                      }}
                    >
                      Alla botar
                    </button>
                  </li>
                  {data.ownerOptions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-zinc-800"
                        onClick={() => {
                          navigate({ owner: name })
                          setBotMenuOpen(false)
                        }}
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <p className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-gray-700 dark:text-zinc-300">
          <span>
            <strong className="font-semibold">{data.summary.waiting}</strong>{" "}
            väntar på dig
          </span>
          <span>
            <strong className="font-semibold">{data.summary.pagar}</strong>{" "}
            pågår
          </span>
          <span>
            <strong className="font-semibold">{data.summary.pagang}</strong>{" "}
            på gång
          </span>
          <span>
            <strong className="font-semibold">{data.summary.klartWeek}</strong>{" "}
            klart denna vecka
          </span>
          {data.summary.unprioritized > 0 ? (
            <span className="font-medium text-amber-700 dark:text-amber-300">
              {data.summary.unprioritized} ej prioriterade
            </span>
          ) : null}
        </p>

        <nav
          className="flex gap-6 border-b border-gray-200 dark:border-zinc-800"
          aria-label="Driftflikar"
        >
          {(
            [
              ["oversikt", "Översikt"],
              ["mal", "Mål"],
              ["pipeline", "Pipeline"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={cn(
                "border-b-2 pb-2.5 text-sm font-medium",
                tab === value
                  ? "border-gray-900 text-gray-900 dark:border-zinc-100 dark:text-white"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200",
              )}
              onClick={() => navigate({ tab: value })}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "oversikt" ? (
        <div className="space-y-8">
          {data.startedWithoutInitiativeCount > 0 &&
          data.startedWithoutInitiativePreview ? (
            <div className="flex flex-col gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-red-800 dark:bg-red-950/30">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">
                  {data.startedWithoutInitiativeCount} uppgift
                  {data.startedWithoutInitiativeCount === 1 ? "" : "er"} pågår
                  utan initiativ
                </p>
                <p className="mt-1 text-sm text-red-800 dark:text-red-200">
                  {data.startedWithoutInitiativePreview.owner
                    ? `${data.startedWithoutInitiativePreview.owner} · `
                    : "Utan utförare · "}
                  {data.startedWithoutInitiativePreview.heading}
                  {data.startedWithoutInitiativePreview.objectiveLabel
                    ? `. Målet är ${data.startedWithoutInitiativePreview.objectiveLabel}, men initiativ saknas.`
                    : ". Initiativ saknas."}{" "}
                  Inget ska påbörjas utan mål och initiativ.
                </p>
              </div>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-2 text-sm font-medium text-red-900 dark:border-red-700 dark:bg-red-950 dark:text-red-100"
                onClick={() => navigate({ tab: "mal" })}
              >
                Visa ej prioriterade ({data.summary.unprioritized})
              </button>
            </div>
          ) : null}

          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Väntar på {firstName}
              </h2>
              <p className="text-sm text-gray-500 dark:text-zinc-400">
                {data.summary.waiting} frågor
                {data.summary.waitingOverdue > 0 ? (
                  <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                    {data.summary.waitingOverdue} förfallen
                    {data.summary.waitingOverdue === 1 ? "" : "a"}
                  </span>
                ) : null}
              </p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
              {data.queue.length === 0 ? (
                <p className="py-6 text-sm text-gray-500">Inga öppna frågor.</p>
              ) : (
                data.queue.slice(0, 5).map((item) => (
                  <QueueRow
                    key={item.id}
                    item={item}
                    onOpen={() =>
                      navigate({ godkannande: item.id, tab: "oversikt" })
                    }
                  />
                ))
              )}
            </div>
            {data.queue.length > 5 ? (
              <p className="mt-2 text-sm text-gray-500">
                Visa alla {data.queue.length}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-gray-500 dark:text-zinc-500">
              Svaras i chatten med Elsa.
            </p>
          </section>

          <section>
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Pågår
              </h2>
              <p className="text-xs text-gray-500">Målordning</p>
            </div>
            <div className="space-y-2">
              {data.pagarTasks.length === 0 ? (
                <p className="text-sm text-gray-500">Inget pågår just nu.</p>
              ) : (
                data.pagarTasks.map((task) => (
                  <PagarRow
                    key={task.id}
                    task={task}
                    onOpen={() => setDetail(task.detail)}
                  />
                ))
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Den här veckan
              </h2>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-500">Senast klart</span>
                <button
                  type="button"
                  className={OPEN_LINK_CLASS}
                  onClick={() => navigate({ tab: "pipeline" })}
                >
                  Se allt i Pipeline
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white px-4 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
              {data.weekItems.length === 0 ? (
                <p className="py-6 text-sm text-gray-500">Inget klart denna vecka.</p>
              ) : (
                data.weekItems.map((item) => (
                  <WeekRow
                    key={item.id}
                    item={item}
                    onOpen={() => setDetail(item.detail)}
                  />
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "mal" ? (
        <div className="space-y-6">
          {data.unprioritizedTasks.length > 0 ? (
            <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <h2 className="text-base font-semibold text-amber-950 dark:text-amber-100">
                Ej prioriterad
              </h2>
              <p className="text-sm text-amber-900/80 dark:text-amber-100/80">
                Uppgifter utan mål eller initiativ. Påbörjade utan initiativ
                visas i rött.
              </p>
              <ul className="space-y-2">
                {data.unprioritizedTasks.map((task: DriftUnprioritizedTask) => (
                  <li key={task.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-lg border px-3 py-3 text-left",
                        task.startedWithoutInitiative
                          ? "border-red-300 bg-white dark:border-red-800 dark:bg-red-950/30"
                          : "border-amber-200 bg-white dark:border-amber-800 dark:bg-zinc-900",
                      )}
                      onClick={() => setDetail(task.detail)}
                    >
                      <span
                        className={cn(
                          "text-sm font-medium text-gray-900 dark:text-zinc-100",
                          TITLE_BREAK,
                        )}
                      >
                        {task.heading}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={
                            task.startedWithoutInitiative
                              ? RED_BADGE
                              : YELLOW_BADGE
                          }
                        >
                          Ej prioriterad
                        </span>
                        {task.startedWithoutInitiative ? (
                          <span className="text-xs text-red-700 dark:text-red-300">
                            Påbörjad utan initiativ
                          </span>
                        ) : null}
                        <span className="text-xs text-gray-500">
                          {task.statusLabel}
                          {task.owner ? ` · ${task.owner}` : ""}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Mål i prioritetsordning
            </h2>
            <span className="text-xs text-gray-500">Målordning</span>
          </div>

          <div className="space-y-4">
            {data.malObjectives.map((obj) => (
              <MalObjectiveCard
                key={obj.id}
                objective={obj}
                botFilter={owner}
                onOpenTask={setDetail}
              />
            ))}
            {data.malObjectives.length === 0 ? (
              <p className="text-sm text-gray-500">
                Inga mål för {company === "dirtywine" ? "Dirty Wine" : "PACT"}{" "}
                ännu.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "pipeline" ? (
        <div className="space-y-6">
          {unprioritizedPipelineCount > 0 ? (
            <section className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-800 dark:bg-amber-950/20">
              <h2 className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                Ej prioriterat ({data.summary.unprioritized} uppgifter utan
                initiativ)
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {(
                  [
                    ["Pågår", data.pipelineUnprioritized.pagar, "text-blue-600"],
                    [
                      "På gång",
                      data.pipelineUnprioritized.pagang,
                      "text-gray-600",
                    ],
                    [
                      "Klart",
                      data.pipelineUnprioritized.klart,
                      "text-emerald-600",
                    ],
                  ] as const
                ).map(([title, cards, titleClass]) => (
                  <div key={title}>
                    <h3 className={cn("mb-2 text-xs font-medium", titleClass)}>
                      {title} ({cards.length})
                    </h3>
                    <div className="space-y-2">
                      {cards.length === 0 ? (
                        <p className="text-xs text-gray-500">Inget just nu</p>
                      ) : (
                        cards.map((card) => (
                          <PipelineCard
                            key={card.id}
                            card={card}
                            onOpen={() => setDetail(card.detail)}
                          />
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {data.pipelineObjectives.map((obj: DriftPipelineObjective) => {
            const open = pipelineExpanded[obj.id] ?? obj.defaultExpanded
            return (
              <section
                key={obj.id}
                className="rounded-xl border border-gray-200 dark:border-[#1F1F23]"
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-3 text-left"
                  onClick={() =>
                    setPipelineExpanded((s) => ({ ...s, [obj.id]: !open }))
                  }
                >
                  {open ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {obj.rank} {obj.shortLabel}
                  </span>
                  <span className="text-sm text-gray-500">— {obj.title}</span>
                  <span className="ml-auto text-xs text-gray-500">
                    {obj.summaryLine}
                  </span>
                </button>
                {open ? (
                  <div className="space-y-6 border-t border-gray-100 px-4 py-4 dark:border-zinc-800">
                    {obj.initiatives.map((init) => (
                      <div key={init.id}>
                        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                            <span className="text-gray-500">{init.key}</span>{" "}
                            {init.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            Ansvarig: {init.ownerAgent}
                          </p>
                        </div>
                        <div className="grid gap-4 md:grid-cols-3">
                          {(
                            [
                              ["Pågår", init.columns.pagar, "text-blue-600"],
                              ["På gång", init.columns.pagang, "text-gray-600"],
                              ["Klart", init.columns.klart, "text-emerald-600"],
                            ] as const
                          ).map(([title, cards, titleClass]) => (
                            <div key={title}>
                              <h4
                                className={cn(
                                  "mb-2 text-xs font-medium",
                                  titleClass,
                                )}
                              >
                                {title} ({cards.length})
                              </h4>
                              <div className="space-y-2">
                                {cards.length === 0 ? (
                                  <p className="text-xs text-gray-500">
                                    Inget just nu
                                  </p>
                                ) : (
                                  cards.map((card) => (
                                    <PipelineCard
                                      key={card.id}
                                      card={card}
                                      onOpen={() => setDetail(card.detail)}
                                    />
                                  ))
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      ) : null}

      <DriftDetailPanel
        detail={detail}
        open={!!detail}
        onClose={() => setDetail(null)}
        onShowInPipeline={() => {
          setDetail(null)
          navigate({ tab: "pipeline" })
        }}
      />

      <p className="sr-only">
        Uppdaterad {data.generatedAtLabel}.{" "}
        <Link href="/admin/operations/objectives">Hantera mål</Link>
      </p>
    </div>
  )
}
