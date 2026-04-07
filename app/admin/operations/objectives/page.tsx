import { getGoals, getObjectives } from "@/lib/actions/operations"
import { getMetricsForObjectives } from "@/lib/actions/metrics"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import { MetricIndicator } from "@/components/admin/operations/metric-indicator"
import { ObjectiveStatusBadge } from "@/components/admin/operations/objective-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import { CreateObjectiveButton } from "@/components/admin/operations/create-objective-button"
import { CreatedMetaLine } from "@/components/admin/operations/created-meta-line"
import Link from "next/link"
import { Settings, Target } from "lucide-react"
import type { ObjectiveStatus, StrategyArea } from "@/lib/types/operations"

interface PageProps {
  searchParams: Promise<{
    status?: string
    period?: string
    strategy_area?: string
  }>
}

const STRATEGY_COLORS: Record<string, string> = {
  Growth:
    "border-emerald-300 text-emerald-700 bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:bg-emerald-950/50",
  Quality:
    "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  Operations:
    "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950/50",
  Product:
    "border-purple-300 text-purple-700 bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:bg-purple-950/50",
}

export default async function ObjectivesPage({ searchParams }: PageProps) {
  const params = await searchParams
  const sb = getSupabaseAdmin()

  const filters: {
    status?: ObjectiveStatus[]
    period?: string
    strategy_area?: StrategyArea
  } = {}
  if (params.status) filters.status = [params.status as ObjectiveStatus]
  if (params.period) filters.period = params.period
  if (params.strategy_area)
    filters.strategy_area = params.strategy_area as StrategyArea

  const [objectives, goals, adminsRes] = await Promise.all([
    getObjectives(filters),
    getGoals({}),
    sb
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .order("email"),
  ])

  const admins = adminsRes.data ?? []
  const goalOptions = goals.map((g) => ({ id: g.id, title: g.title }))
  const metricsByObjective = await getMetricsForObjectives(
    objectives.map((o) => o.id),
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 shrink-0">
            <Target className="w-5 h-5 text-gray-900 dark:text-zinc-50" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              Objectives
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              {objectives.length} objective{objectives.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end sm:w-auto sm:shrink-0 [&_button]:w-full sm:[&_button]:w-auto">
          <Link
            href="/admin/operations/objectives/settings"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Settings className="h-4 w-4 shrink-0" aria-hidden />
            Settings
          </Link>
          <CreateObjectiveButton admins={admins} goals={goalOptions} />
        </div>
      </div>

      {/* Cards */}
      {objectives.length === 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            No objectives yet
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {objectives.map((obj) => (
          <Link
            key={obj.id}
            href={`/admin/operations/objectives/${obj.id}`}
            className="block rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-5 hover:border-gray-300 dark:hover:border-zinc-600 transition-colors"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              {/* Left */}
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-600 dark:text-zinc-400">
                    {obj.period}
                  </span>
                  {obj.strategy_area && (
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium border ${STRATEGY_COLORS[obj.strategy_area] ?? "border-gray-200 dark:border-zinc-700 text-gray-700 dark:text-zinc-300"}`}
                    >
                      {obj.strategy_area}
                    </span>
                  )}
                  <ObjectiveStatusBadge status={obj.status} />
                </div>

                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {obj.title}
                </h2>

                {obj.description && (
                  <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2">
                    {obj.description}
                  </p>
                )}

                {(metricsByObjective.get(obj.id) ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(metricsByObjective.get(obj.id) ?? []).map((m) => (
                      <MetricIndicator
                        key={m.slug}
                        label={m.label}
                        current={m.current_value}
                        target={m.target_value}
                        unit={m.unit}
                        progress={m.progress}
                      />
                    ))}
                  </div>
                )}

                <ProgressBar value={obj.progress ?? 0} />
                <CreatedMetaLine
                  createdAt={obj.created_at}
                  creatorEmail={obj.creator?.email}
                  showUnknownIfNoCreator={Boolean(obj.created_by)}
                  className="pt-1"
                />
              </div>

              {/* Right */}
              <div className="flex-shrink-0 space-y-2 sm:text-right sm:min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {obj.progress ?? 0}%
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-zinc-400">
                  <p>{obj.key_results?.length ?? 0} key results</p>
                  <p>{obj.project_count ?? 0} projects</p>
                  <p>{obj.open_task_count ?? 0} open tasks</p>
                </div>
                {obj.owner && (
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    {obj.owner.email.split("@")[0]}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
