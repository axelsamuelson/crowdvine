"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"
import {
  ChevronDown,
  ChevronRight,
  Inbox,
  Loader2,
  SlidersHorizontal,
  X,
} from "lucide-react"
import {
  ADMIN_FORM_FIELDS_CLASS,
  ADMIN_OUTLINE_BUTTON_CLASS,
} from "@/lib/admin-form-styles"
import { formatQueueDeadlineLabel } from "@/lib/operations/drift/build-overview"
import type {
  DriftBotRow,
  DriftCompanyFilter,
  DriftOverviewData,
  DriftPagarBotGroup,
  DriftPipelineProject,
  DriftPipelineTaskCard,
  DriftQueueItem,
  DriftTab,
  DriftTaskDetail,
} from "@/lib/operations/drift/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DriftDetailPanel } from "./drift-detail-panel"

const OPEN_LINK_CLASS =
  "shrink-0 pt-0.5 text-sm font-medium text-gray-900 underline underline-offset-2 decoration-gray-300 hover:text-gray-700 dark:text-zinc-100 dark:decoration-zinc-500 dark:hover:text-zinc-200"

const SOURCE_BADGE_CLASS =
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"

const PROJECT_TAG_CLASS =
  "inline-flex items-center rounded-md border border-gray-200 bg-transparent px-2 py-0.5 text-xs font-medium text-gray-700 dark:border-zinc-600 dark:text-zinc-300"

const WAIT_YOU_BADGE_CLASS =
  "inline-flex items-center rounded-md border border-gray-900 px-2 py-0.5 text-xs font-medium text-gray-900 dark:border-zinc-200 dark:text-zinc-100"

const WAIT_REVIEW_BADGE_CLASS =
  "inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500 dark:bg-zinc-800 dark:text-zinc-400"

const PAUSED_BADGE_CLASS =
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"

const ARCHIVED_BADGE_CLASS =
  "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-zinc-100 text-zinc-600 dark:bg-zinc-800/60 dark:text-zinc-300"

type CompanyOption = DriftCompanyFilter

interface Props {
  initialData: DriftOverviewData
  company: CompanyOption
  owner: string | null
  projectId: string | null
  tab: DriftTab
  godkannande: string | null
}

function sourceBadgeLabel(source: "pr" | "ops_agent_log" | null): string | null {
  if (source === "pr") return "PR"
  if (source === "ops_agent_log") return "Logg"
  return null
}

function buildQuery(opts: {
  company: CompanyOption
  owner: string | null
  projectId: string | null
  tab: DriftTab
  godkannande?: string | null
}): string {
  const params = new URLSearchParams()
  if (opts.company !== "both") params.set("company", opts.company)
  if (opts.owner) params.set("owner", opts.owner)
  if (opts.projectId) params.set("project", opts.projectId)
  if (opts.tab !== "oversikt") params.set("tab", opts.tab)
  if (opts.godkannande) params.set("godkannande", opts.godkannande)
  const qs = params.toString()
  return qs ? `?${qs}` : ""
}

function projectCountsLine(p: DriftPipelineProject): string {
  const parts = [
    `Pågår ${p.counts.pagar}`,
    `På gång ${p.counts.pagang}`,
    `Backlog ${p.counts.backlog}`,
    `Klart ${p.counts.klartWeek} den här veckan`,
  ]
  if (p.counts.older > 0) parts.push(`+${p.counts.older} äldre`)
  if (p.counts.cancelled > 0) parts.push(`Avbrutna ${p.counts.cancelled}`)
  return parts.join(" · ")
}

function TaskCard({ card }: { card: DriftPipelineTaskCard }) {
  const badge = sourceBadgeLabel(card.source)
  return (
    <article className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <Link
        href={card.href}
        className="block text-sm font-medium leading-snug text-gray-900 line-clamp-2 hover:underline dark:text-zinc-100"
        title={card.heading}
      >
        {card.heading}
      </Link>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        {card.owner ? (
          <span className="text-xs text-gray-600 dark:text-zinc-400">
            {card.owner}
          </span>
        ) : null}
        {badge ? <span className={SOURCE_BADGE_CLASS}>{badge}</span> : null}
        {card.paused ? <span className={PAUSED_BADGE_CLASS}>Pausad</span> : null}
        {card.atLabel ? (
          <span className="text-xs text-gray-500 dark:text-zinc-400">
            {card.atLabel}
          </span>
        ) : null}
      </div>
    </article>
  )
}

function PipelineColumn({
  title,
  titleClass,
  cards,
  older,
  showOlder,
  onToggleOlder,
}: {
  title: string
  titleClass: string
  cards: DriftPipelineTaskCard[]
  older?: DriftPipelineTaskCard[]
  showOlder?: boolean
  onToggleOlder?: () => void
}) {
  const [showMore, setShowMore] = useState(false)
  const visible = showMore ? cards : cards.slice(0, 4)
  const rest = cards.length - visible.length

  return (
    <div className="min-w-0">
      <h4 className={cn("mb-3 text-xs font-medium", titleClass)}>
        {title} ({cards.length})
      </h4>
      <div className="space-y-2">
        {cards.length === 0 ? (
          <p className="px-0.5 py-4 text-xs text-gray-500 dark:text-zinc-500">
            Inget just nu
          </p>
        ) : (
          visible.map((c) => <TaskCard key={c.id} card={c} />)
        )}
        {rest > 0 ? (
          <button
            type="button"
            className="w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
            onClick={() => setShowMore(true)}
          >
            Visa {rest} till
          </button>
        ) : null}
        {older && older.length > 0 ? (
          <>
            {showOlder
              ? older.map((c) => <TaskCard key={c.id} card={c} />)
              : null}
            <button
              type="button"
              className="w-full rounded-lg px-2 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
              onClick={onToggleOlder}
            >
              {showOlder
                ? "Dölj äldre"
                : `Visa äldre (${older.length}), upp till 30 dagar`}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

function QueueRow({
  item,
  highlighted,
  defaultExpanded,
}: {
  item: DriftQueueItem
  highlighted: boolean
  defaultExpanded: boolean
}) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const deadlineLabel = formatQueueDeadlineLabel(item.deadline, item.overdue)

  return (
    <article
      id={`godkannande-${item.id}`}
      className={cn(
        "px-5 py-4",
        highlighted &&
          "bg-amber-50/60 dark:bg-amber-950/20 ring-1 ring-inset ring-amber-200 dark:ring-amber-900/40",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-2 h-1.5 w-1.5 shrink-0 rounded-full",
            item.overdue
              ? "bg-red-500"
              : "bg-gray-300 dark:bg-zinc-600",
          )}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                {item.title}
              </h3>
            </button>
            <Link href={item.openHref} className={OPEN_LINK_CLASS}>
              Öppna rad
            </Link>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
            {item.agent}
            {deadlineLabel ? (
              <>
                {" · "}
                <span
                  className={cn(
                    "text-xs",
                    item.overdue
                      ? "font-medium text-red-600 dark:text-red-400"
                      : "text-gray-500 dark:text-zinc-400",
                  )}
                >
                  {deadlineLabel}
                </span>
              </>
            ) : null}
          </p>
          {!expanded && item.question ? (
            <p className="mt-1 truncate text-sm text-gray-600 dark:text-zinc-400">
              {item.question}
            </p>
          ) : null}
          {expanded ? (
            <div className="mt-3">
              {item.question ? (
                <p className="text-sm leading-relaxed text-gray-700 dark:text-zinc-300">
                  {item.question}
                </p>
              ) : null}
              {item.recommendation ? (
                <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
                  <span className="font-medium text-gray-800 dark:text-zinc-200">
                    Rekommendation.
                  </span>{" "}
                  {item.recommendation}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function BotVantarCell({ bot }: { bot: DriftBotRow }) {
  if (bot.vantarTone === "none") {
    return (
      <span className="whitespace-nowrap text-left text-xs text-gray-400 dark:text-zinc-500">
        —
      </span>
    )
  }
  if (bot.vantarTone === "red") {
    return (
      <span className="whitespace-nowrap text-left text-xs font-medium text-red-600 dark:text-red-400">
        {bot.vantarPa}
      </span>
    )
  }
  return (
    <span className="whitespace-nowrap text-left text-xs font-medium text-gray-700 dark:text-zinc-300">
      {bot.vantarPa}
    </span>
  )
}

export function DriftOverviewClient({
  initialData,
  company,
  owner,
  projectId,
  tab: initialTab,
  godkannande,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const data = initialData
  const [tab, setTab] = useState<DriftTab>(initialTab)
  const [showAllQueue, setShowAllQueue] = useState(false)
  const [showSilentBots, setShowSilentBots] = useState(false)
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(
    () => projectId,
  )
  const [showOlderByProject, setShowOlderByProject] = useState<
    Record<string, boolean>
  >({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [draftOwner, setDraftOwner] = useState(owner ?? "")
  const [draftProject, setDraftProject] = useState(projectId ?? "")
  const [navigating, setNavigating] = useState(false)
  const [filterPortalReady, setFilterPortalReady] = useState(false)
  const [detail, setDetail] = useState<DriftTaskDetail | null>(null)
  const [collapsedPagarOwners, setCollapsedPagarOwners] = useState<
    Record<string, boolean>
  >({})
  const weekRef = useRef<HTMLHeadingElement | null>(null)
  const projectSectionRefs = useRef<Record<string, HTMLElement | null>>({})
  const filterTitleId = useId()
  const filtersActive = Boolean(owner || projectId)

  useEffect(() => {
    setFilterPortalReady(true)
  }, [])

  useEffect(() => {
    setTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    setDraftOwner(owner ?? "")
    setDraftProject(projectId ?? "")
  }, [owner, projectId])

  useEffect(() => {
    setNavigating(false)
  }, [company, owner, projectId, initialTab, data.generatedAtLabel])

  useEffect(() => {
    if (godkannande) {
      setShowAllQueue(true)
      const el = document.getElementById(`godkannande-${godkannande}`)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [godkannande])

  // v4.1: expand only when ?project= is set — never default to alphabetical first.
  useEffect(() => {
    setExpandedProjectId(projectId)
  }, [projectId])

  useEffect(() => {
    if (
      expandedProjectId &&
      !data.projects.some((p) => p.id === expandedProjectId)
    ) {
      setExpandedProjectId(null)
    }
  }, [data.projects, expandedProjectId])

  useEffect(() => {
    if (initialTab !== "pipeline" || !projectId) return
    const el = projectSectionRefs.current[projectId]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [initialTab, projectId, data.projects])

  const pushParams = useCallback(
    (next: {
      company?: CompanyOption
      owner?: string | null
      projectId?: string | null
      tab?: DriftTab
      godkannande?: string | null
    }) => {
      setNavigating(true)
      const qs = buildQuery({
        company: next.company ?? company,
        owner: next.owner === undefined ? owner : next.owner,
        projectId: next.projectId === undefined ? projectId : next.projectId,
        tab: next.tab ?? tab,
        godkannande:
          next.godkannande === undefined ? godkannande : next.godkannande,
      })
      router.push(`${pathname}${qs}`)
    },
    [company, owner, projectId, tab, godkannande, pathname, router],
  )

  const selectTab = useCallback(
    (next: DriftTab) => {
      setTab(next)
      pushParams({ tab: next })
    },
    [pushParams],
  )

  const openDetail = useCallback((next: DriftTaskDetail) => {
    setDetail(next)
  }, [])

  const closeDetail = useCallback(() => {
    setDetail(null)
  }, [])

  const showInPipeline = useCallback(
    (nextProjectId: string | null) => {
      setDetail(null)
      setExpandedProjectId(nextProjectId)
      pushParams({
        tab: "pipeline",
        projectId: nextProjectId,
        godkannande: null,
      })
    },
    [pushParams],
  )

  const togglePagarGroup = useCallback((ownerKey: string) => {
    setCollapsedPagarOwners((prev) => ({
      ...prev,
      [ownerKey]: !prev[ownerKey],
    }))
  }, [])

  const onSummaryClick = (target: "oversikt" | "pipeline" | "veckan") => {
    if (target === "pipeline") {
      selectTab("pipeline")
      return
    }
    setTab("oversikt")
    pushParams({ tab: "oversikt" })
    if (target === "veckan") {
      requestAnimationFrame(() => {
        weekRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }

  const activeBots = useMemo(
    () =>
      data.bots.filter((b) => {
        if (!b.silent) return true
        if (owner && b.name.toLowerCase() === owner.toLowerCase()) return true
        return false
      }),
    [data.bots, owner],
  )
  const silentBots = useMemo(
    () =>
      data.bots.filter((b) => {
        if (!b.silent) return false
        if (owner && b.name.toLowerCase() === owner.toLowerCase()) return false
        return true
      }),
    [data.bots, owner],
  )

  const topQueue = data.queue.slice(0, 3)
  const restQueue = data.queue.slice(3)

  const ownerLabel =
    owner === "__none__" ? "Utan ägare" : owner
  const projectLabel = projectId
    ? data.projectOptions.find((p) => p.id === projectId)?.name ??
      (projectId === "__unassigned__" ? "Utan projektkoppling" : projectId)
    : null

  const applyFilters = () => {
    setFilterOpen(false)
    pushParams({
      owner: draftOwner || null,
      projectId: draftProject || null,
    })
  }

  const clearFilters = () => {
    setDraftOwner("")
    setDraftProject("")
    setFilterOpen(false)
    pushParams({ owner: null, projectId: null })
  }

  const companyButtons: { value: CompanyOption; label: string }[] = [
    { value: "pact", label: "PACT" },
    { value: "dirtywine", label: "Dirty Wine" },
    { value: "both", label: "Båda" },
  ]

  const tabs: { id: DriftTab; label: string }[] = [
    { id: "oversikt", label: "Översikt" },
    { id: "botar", label: "Botar" },
    { id: "pipeline", label: "Pipeline" },
  ]

  return (
    <div className="space-y-8">
      {navigating ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-zinc-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Uppdaterar…
        </div>
      ) : null}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Driftöversikt
          </h1>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1 sm:flex-none">
              <div
                className="inline-flex w-full rounded-lg bg-gray-100 p-0.5 dark:bg-zinc-800 sm:w-auto"
                role="group"
                aria-label="Företag"
              >
                {companyButtons.map((c) => {
                  const on = company === c.value
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={on}
                      className={cn(
                        "h-8 flex-1 px-3 text-sm font-medium sm:flex-none",
                        on
                          ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                          : "text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white",
                      )}
                      onClick={() => pushParams({ company: c.value })}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              type="button"
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              aria-haspopup="dialog"
              aria-expanded={filterOpen}
              onClick={() => setFilterOpen(true)}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
              Filter
            </button>
          </div>
        </div>

        {(owner || projectId) && (
          <div className="flex flex-wrap items-center gap-2">
            {owner ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                onClick={() => pushParams({ owner: null })}
              >
                Ägare: {ownerLabel}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : null}
            {projectId ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-zinc-800 dark:text-zinc-300"
                onClick={() => pushParams({ projectId: null })}
              >
                Projekt: {projectLabel}
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            ) : null}
            <button
              type="button"
              className="text-xs font-medium text-gray-600 underline underline-offset-2 decoration-gray-300 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
              onClick={clearFilters}
            >
              Rensa
            </button>
          </div>
        )}

        <p
          className="text-xs leading-relaxed text-gray-600 sm:text-sm dark:text-zinc-300"
          aria-label="Sammanfattning"
        >
          <SummaryBtn
            n={data.summary.waiting}
            label="väntar på dig"
            onClick={() => onSummaryClick("oversikt")}
          />
          <Sep />
          <SummaryBtn
            n={data.summary.pagar}
            label="pågår"
            onClick={() => onSummaryClick("pipeline")}
          />
          <Sep />
          <SummaryBtn
            n={data.summary.pagang}
            label="på gång"
            onClick={() => onSummaryClick("pipeline")}
          />
          {/* Mobile: Klart on its own line (wrap when the summary is tight at 390). */}
          <span className="hidden text-gray-300 dark:text-zinc-600 sm:inline" aria-hidden="true">
            {" · "}
          </span>
          <br className="sm:hidden" aria-hidden="true" />
          <SummaryBtn
            n={data.summary.klartWeek}
            label="klart denna vecka"
            onClick={() => onSummaryClick("veckan")}
          />
        </p>
      </div>

      <div className="w-full sm:w-auto" role="tablist" aria-label="Avsnitt">
        <div className="flex w-full rounded-lg bg-gray-100 p-1 dark:bg-zinc-800 sm:inline-flex sm:w-auto">
          {tabs.map((t) => {
            const on = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={on}
                id={`tab-${t.id}`}
                aria-controls={`panel-${t.id}`}
                className={cn(
                  "inline-flex h-8 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium sm:flex-none",
                  on
                    ? "bg-white text-gray-900 shadow-sm dark:bg-zinc-900 dark:text-white"
                    : "text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white",
                )}
                onClick={() => selectTab(t.id)}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {tab === "oversikt" ? (
        <div
          id="panel-oversikt"
          role="tabpanel"
          aria-labelledby="tab-oversikt"
          className="space-y-10"
        >
          <section aria-labelledby="vantan-heading">
            <div className="mb-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2
                  id="vantan-heading"
                  className="text-lg font-bold text-gray-900 dark:text-white"
                >
                  Väntar på Axel
                </h2>
                {data.summary.waiting > 0 ? (
                  <p className="text-xs text-gray-500 dark:text-zinc-400">
                    <span className="font-medium tabular-nums text-gray-800 dark:text-zinc-200">
                      {data.summary.waiting}
                    </span>{" "}
                    {data.summary.waiting === 1 ? "fråga" : "frågor"}
                    {data.summary.waitingOverdue > 0 ? (
                      <>
                        <span className="mx-1.5 text-gray-300 dark:text-zinc-600">
                          ·
                        </span>
                        <span className="font-medium text-red-600 dark:text-red-400">
                          {data.summary.waitingOverdue}{" "}
                          {data.summary.waitingOverdue === 1
                            ? "förfallen"
                            : "förfallna"}
                        </span>
                      </>
                    ) : null}
                  </p>
                ) : null}
              </div>
              {filtersActive ? (
                <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                  Visar alla frågor, filtret gäller inte här
                </p>
              ) : null}
            </div>

            {data.queue.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-10 text-center dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                <Inbox
                  className="h-5 w-5 text-gray-400 dark:text-zinc-500"
                  aria-hidden="true"
                />
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  Inget väntar på Axel just nu.
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                <div className="divide-y divide-gray-200 dark:divide-[#1F1F23]">
                  {topQueue.map((item) => (
                    <QueueRow
                      key={item.id}
                      item={item}
                      highlighted={godkannande === item.id}
                      defaultExpanded={godkannande === item.id}
                    />
                  ))}
                </div>
                {showAllQueue && restQueue.length > 0 ? (
                  <div className="divide-y divide-gray-200 border-t border-gray-200 dark:divide-[#1F1F23] dark:border-[#1F1F23]">
                    {restQueue.map((item) => (
                      <QueueRow
                        key={item.id}
                        item={item}
                        highlighted={godkannande === item.id}
                        defaultExpanded={godkannande === item.id}
                      />
                    ))}
                  </div>
                ) : null}
                {data.queue.length > 3 ? (
                  <div className="border-t border-gray-200 px-5 py-3 dark:border-[#1F1F23]">
                    <button
                      type="button"
                      className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-zinc-300 dark:hover:text-white"
                      onClick={() => setShowAllQueue((v) => !v)}
                    >
                      {showAllQueue
                        ? "Visa färre"
                        : `Visa alla ${data.queue.length}`}
                    </button>
                  </div>
                ) : null}
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500 dark:text-zinc-400">
              Svaras i chatten med Elsa.
            </p>
          </section>

          <section aria-labelledby="pagar-heading">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="pagar-heading"
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                Pågår
              </h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                <span className="font-medium tabular-nums text-gray-800 dark:text-zinc-200">
                  {data.summary.pagar}
                </span>{" "}
                uppgifter
              </p>
            </div>
            {data.pagarGroups.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-8 text-center dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                <p className="text-sm text-gray-500 dark:text-zinc-400">
                  Inget pågår just nu.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {data.pagarGroups.map((group) => (
                  <PagarBotGroup
                    key={group.ownerKey}
                    group={group}
                    collapsed={!!collapsedPagarOwners[group.ownerKey]}
                    onToggle={() => togglePagarGroup(group.ownerKey)}
                    onOpen={openDetail}
                  />
                ))}
              </div>
            )}
          </section>

          <section aria-labelledby="veckan-heading">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <h2
                id="veckan-heading"
                ref={weekRef}
                className="text-lg font-bold text-gray-900 dark:text-white"
              >
                Den här veckan
              </h2>
              <button
                type="button"
                className="text-sm font-medium text-gray-600 underline underline-offset-2 decoration-gray-300 hover:text-gray-900 dark:text-zinc-400 dark:decoration-zinc-600 dark:hover:text-white"
                onClick={() => selectTab("pipeline")}
              >
                Se allt i Pipeline
              </button>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
              {data.weekItems.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-gray-500 dark:text-zinc-400">
                  Inget klart denna vecka.
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-[#1F1F23]">
                  {data.weekItems.map((item) => {
                    const badge = sourceBadgeLabel(item.source)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          className="w-full px-5 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-zinc-900/40"
                          onClick={() => openDetail(item.detail)}
                        >
                          <p
                            className="text-sm font-medium leading-snug text-gray-900 line-clamp-2 dark:text-white"
                            title={item.heading}
                          >
                            {item.heading}
                          </p>
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {item.owner ? (
                              <span className="text-xs text-gray-500 dark:text-zinc-400">
                                {item.owner}
                              </span>
                            ) : null}
                            <time className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                              {item.atLabel}
                            </time>
                            {item.projectTag ? (
                              <span className={PROJECT_TAG_CLASS}>
                                {item.projectTag}
                              </span>
                            ) : null}
                            {badge ? (
                              <span className={SOURCE_BADGE_CLASS}>{badge}</span>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "botar" ? (
        <div id="panel-botar" role="tabpanel" aria-labelledby="tab-botar">
          <section aria-labelledby="bots-heading" className="space-y-4">
            <h2
              id="bots-heading"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              Botar
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[36rem] text-left">
                  <thead>
                    <tr className="text-left text-xs font-medium text-gray-500 dark:text-zinc-400">
                      <th className="px-5 py-3 font-medium">Bot</th>
                      <th className="px-5 py-3 font-medium">Ägarområde</th>
                      <th className="px-5 py-3 font-medium">Senaste aktivitet</th>
                      <th className="px-5 py-3 font-medium">Jobbar på</th>
                      <th className="px-5 py-3 font-medium">Väntar på</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeBots.map((bot) => (
                      <BotTableRow key={bot.id} bot={bot} />
                    ))}
                  </tbody>
                  {showSilentBots && silentBots.length > 0 ? (
                    <tbody>
                      {silentBots.map((bot) => (
                        <BotTableRow key={bot.id} bot={bot} quiet />
                      ))}
                    </tbody>
                  ) : null}
                </table>
              </div>

              <div className="divide-y divide-gray-200 dark:divide-[#1F1F23] lg:hidden">
                {activeBots.map((bot) => (
                  <BotMobileCard key={bot.id} bot={bot} />
                ))}
                {showSilentBots && silentBots.length > 0 ? (
                  <div className="divide-y divide-gray-200 dark:divide-[#1F1F23]">
                    {silentBots.map((bot) => (
                      <BotMobileCard key={bot.id} bot={bot} quiet />
                    ))}
                  </div>
                ) : null}
              </div>

              {silentBots.length > 0 ? (
                <div className="border-t border-gray-200 px-5 py-3 dark:border-[#1F1F23]">
                  <button
                    type="button"
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white"
                    onClick={() => setShowSilentBots((v) => !v)}
                  >
                    {showSilentBots
                      ? "Dölj tysta botar"
                      : `Visa ${silentBots.length} tysta botar`}
                  </button>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      {tab === "pipeline" ? (
        <div
          id="panel-pipeline"
          role="tabpanel"
          aria-labelledby="tab-pipeline"
        >
          <section aria-labelledby="pipe-heading" className="space-y-4">
            <h2
              id="pipe-heading"
              className="text-lg font-bold text-gray-900 dark:text-white"
            >
              Pipeline per projekt
            </h2>
            {data.projects.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-5 py-10 text-center dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                <p className="text-sm text-gray-600 dark:text-zinc-400">
                  Inga projekt matchar filtret.
                </p>
                {(owner || projectId) && (
                  <Button
                    type="button"
                    variant="outline"
                    className={cn("mt-4", ADMIN_OUTLINE_BUTTON_CLASS)}
                    onClick={clearFilters}
                  >
                    Rensa
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
                {data.projects.map((project) => {
                  const open = expandedProjectId === project.id
                  return (
                    <section
                      key={project.id}
                      ref={(el) => {
                        projectSectionRefs.current[project.id] = el
                      }}
                      className="border-b border-gray-200 last:border-b-0 dark:border-[#1F1F23]"
                    >
                      <button
                        type="button"
                        className="flex w-full items-start gap-3 px-5 py-4 text-left hover:bg-gray-50/80 dark:hover:bg-zinc-900/40"
                        aria-expanded={open}
                        onClick={() =>
                          setExpandedProjectId(open ? null : project.id)
                        }
                      >
                        {open ? (
                          <ChevronDown
                            className="mt-1 h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500"
                            aria-hidden="true"
                          />
                        ) : (
                          <ChevronRight
                            className="mt-1 h-4 w-4 shrink-0 text-gray-400 dark:text-zinc-500"
                            aria-hidden="true"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                              {project.name}
                            </h3>
                            <span className="text-xs text-gray-500 dark:text-zinc-400">
                              {project.companyLabel}
                            </span>
                            {project.archived ? (
                              <span className={ARCHIVED_BADGE_CLASS}>
                                Arkiverat
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-gray-500 dark:text-zinc-400">
                            {projectCountsLine(project)}
                            {project.lastActivityLabel ? (
                              <>
                                {" · "}
                                <span className="text-xs text-gray-400 dark:text-zinc-500">
                                  Senast {project.lastActivityLabel}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </button>
                      {open ? (
                        <div className="px-5 pb-5">
                          {project.archived ? (
                            <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                              Arkiverat i admin, men har fortfarande öppna
                              uppgifter.
                            </p>
                          ) : null}
                          <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                            <PipelineColumn
                              title="Klart"
                              titleClass="text-emerald-700 dark:text-emerald-400"
                              cards={project.columns.klart}
                              older={project.columns.klartOlder}
                              showOlder={!!showOlderByProject[project.id]}
                              onToggleOlder={() =>
                                setShowOlderByProject((prev) => ({
                                  ...prev,
                                  [project.id]: !prev[project.id],
                                }))
                              }
                            />
                            <PipelineColumn
                              title="Pågår"
                              titleClass="text-blue-700 dark:text-blue-400"
                              cards={project.columns.pagar}
                            />
                            <PipelineColumn
                              title="På gång"
                              titleClass="text-sky-800 dark:text-sky-300"
                              cards={project.columns.pagang}
                            />
                            <PipelineColumn
                              title="Backlog"
                              titleClass="text-gray-600 dark:text-zinc-400"
                              cards={project.columns.backlog}
                            />
                          </div>
                        </div>
                      ) : null}
                    </section>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {filterOpen && filterPortalReady
        ? createPortal(
            <div
              className="fixed inset-0 z-[100]"
              role="dialog"
              aria-modal="true"
              aria-labelledby={filterTitleId}
            >
              <button
                type="button"
                className="absolute inset-0 bg-black/80 lg:bg-black/40"
                aria-label="Stäng filter"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute inset-x-0 bottom-0 z-[101] max-h-[85vh] overflow-y-auto rounded-t-xl border border-gray-200 bg-white p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg dark:border-zinc-800 dark:bg-zinc-900 lg:inset-auto lg:right-8 lg:top-32 lg:w-[22rem] lg:rounded-xl lg:p-5">
                <div
                  className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300 dark:bg-zinc-600 lg:hidden"
                  aria-hidden="true"
                />
                <div className="mb-4 flex items-center justify-between">
                  <h2
                    id={filterTitleId}
                    className="text-lg font-bold text-gray-900 dark:text-white"
                  >
                    Filter
                  </h2>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                    aria-label="Stäng filter"
                    onClick={() => setFilterOpen(false)}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                <div className={cn(ADMIN_FORM_FIELDS_CLASS, "space-y-4")}>
                  <label className="block" htmlFor="drift-filter-owner">
                    <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                      Ägare
                    </span>
                    <select
                      id="drift-filter-owner"
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      value={draftOwner}
                      onChange={(e) => setDraftOwner(e.target.value)}
                    >
                      <option value="">Alla ägare</option>
                      <option value="__none__">Utan ägare</option>
                      {data.ownerOptions.map((name) => (
                        <option key={name} value={name}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block" htmlFor="drift-filter-project">
                    <span className="mb-1 block text-xs font-medium text-gray-700 dark:text-zinc-300">
                      Projekt
                    </span>
                    <select
                      id="drift-filter-project"
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      value={draftProject}
                      onChange={(e) => setDraftProject(e.target.value)}
                    >
                      <option value="">Alla projekt</option>
                      <option value="__unassigned__">Utan projektkoppling</option>
                      {data.projectOptions.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                    onClick={applyFilters}
                  >
                    Visa resultat
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-11 w-full items-center justify-center border text-sm font-medium",
                      ADMIN_OUTLINE_BUTTON_CLASS,
                    )}
                    onClick={clearFilters}
                  >
                    Rensa
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}

      <DriftDetailPanel
        detail={detail}
        open={!!detail}
        onClose={closeDetail}
        onShowInPipeline={showInPipeline}
      />
    </div>
  )
}

function PagarBotGroup({
  group,
  collapsed,
  onToggle,
  onOpen,
}: {
  group: DriftPagarBotGroup
  collapsed: boolean
  onToggle: () => void
  onOpen: (detail: DriftTaskDetail) => void
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left sm:cursor-default"
        aria-expanded={!collapsed}
        onClick={onToggle}
      >
        <div className="flex min-w-0 items-baseline gap-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {group.ownerLabel}
          </h3>
          <span className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
            {group.count}
          </span>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-gray-400 transition-transform sm:hidden dark:text-zinc-500",
            collapsed && "-rotate-90",
          )}
          aria-hidden="true"
        />
      </button>
      <div
        className={cn(
          "divide-y divide-gray-200 border-t border-gray-200 dark:divide-[#1F1F23] dark:border-[#1F1F23]",
          collapsed && "hidden sm:block",
        )}
      >
        {group.tasks.map((task) => (
          <button
            key={task.id}
            type="button"
            className="flex w-full flex-col gap-1.5 px-5 py-3.5 text-left hover:bg-gray-50 dark:hover:bg-zinc-900/40"
            onClick={() => onOpen(task.detail)}
          >
            <p
              className="text-sm font-medium leading-snug text-gray-900 line-clamp-2 dark:text-white"
              title={task.heading}
            >
              {task.heading}
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {task.projectTag ? (
                <span className={PROJECT_TAG_CLASS}>{task.projectTag}</span>
              ) : null}
              {task.badge === "waiting_for_you" ? (
                <span className={WAIT_YOU_BADGE_CLASS}>Väntar på dig</span>
              ) : null}
              {task.badge === "waiting_for_review" ? (
                <span className={WAIT_REVIEW_BADGE_CLASS}>
                  Väntar på granskning
                </span>
              ) : null}
              {task.dateLabel ? (
                <time className="text-xs tabular-nums text-gray-500 dark:text-zinc-400">
                  {task.dateLabel}
                </time>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function Sep() {
  return (
    <span className="text-gray-300 dark:text-zinc-600" aria-hidden="true">
      {" · "}
    </span>
  )
}

function SummaryBtn({
  n,
  label,
  onClick,
}: {
  n: number
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="inline whitespace-nowrap text-left"
      onClick={onClick}
      aria-label={`${n} ${label}`}
    >
      <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
        {n}
      </span>
      <span className="text-gray-500 dark:text-zinc-400"> {label}</span>
    </button>
  )
}

function BotTableRow({
  bot,
  quiet = false,
}: {
  bot: DriftBotRow
  quiet?: boolean
}) {
  return (
    <tr
      className={cn(
        "border-t border-gray-100 dark:border-zinc-800",
        quiet && "opacity-70",
      )}
    >
      <td className="px-5 py-3.5 align-top">
        <div className="text-sm font-medium text-gray-900 dark:text-zinc-100">
          {bot.name}
        </div>
        <div className="mt-0.5 text-xs text-gray-500 dark:text-zinc-500">
          {bot.companyLabel}
        </div>
      </td>
      <td className="px-5 py-3.5 align-top text-sm text-gray-600 dark:text-zinc-400">
        {bot.area || "—"}
      </td>
      <td className="px-5 py-3.5 align-top">
        <div className="text-sm tabular-nums text-gray-700 dark:text-zinc-300">
          {bot.latestAtLabel}
        </div>
        <div
          className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-zinc-500"
          title={bot.latestAction ?? undefined}
        >
          {bot.latestAction}
        </div>
      </td>
      <td className="px-5 py-3.5 align-top text-sm text-gray-700 dark:text-zinc-300">
        <span className="line-clamp-2">{bot.jobbarPa}</span>
      </td>
      <td className="px-5 py-3.5 align-top text-left">
        <BotVantarCell bot={bot} />
      </td>
    </tr>
  )
}

function BotMobileCard({
  bot,
  quiet = false,
}: {
  bot: DriftBotRow
  quiet?: boolean
}) {
  return (
    <article className={cn("px-5 py-4", quiet && "opacity-70")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {bot.name}
          </p>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-400">
            {bot.area || "—"} · {bot.companyLabel}
          </p>
        </div>
        {bot.vantarTone !== "none" ? <BotVantarCell bot={bot} /> : null}
      </div>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
        {bot.latestAtLabel}
        {bot.latestAction ? ` · ${bot.latestAction}` : ""}
      </p>
      <p className="mt-1 text-sm text-gray-700 dark:text-zinc-300">
        Jobbar på {bot.jobbarPa}
      </p>
    </article>
  )
}
