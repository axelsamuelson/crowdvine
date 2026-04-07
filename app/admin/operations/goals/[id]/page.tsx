import { notFound } from "next/navigation"
import Link from "next/link"
import { getGoal } from "@/lib/actions/operations"
import { getSupabaseAdmin } from "@/lib/supabase-admin"
import {
  getMetricsForObjectives,
  refreshGoalMetricsData,
} from "@/lib/actions/metrics"
import { GoalStatusBadge } from "@/components/admin/operations/goal-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import { CreateGoalButton } from "@/components/admin/operations/create-goal-button"
import { CreateObjectiveButton } from "@/components/admin/operations/create-objective-button"
import { ObjectiveStatusBadge } from "@/components/admin/operations/objective-status-badge"
import { GoalDetailDelete } from "@/components/admin/operations/goal-detail-delete"
import { CreatedMetaLine } from "@/components/admin/operations/created-meta-line"
import { MetricIndicator } from "@/components/admin/operations/metric-indicator"
import { RefreshGoalMetricsButton } from "@/components/admin/operations/refresh-goal-metrics-button"
import { ArrowLeft } from "lucide-react"
import { DetailBreadcrumbTitle } from "@/components/admin/detail-breadcrumb-title"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GoalDetailPage({ params }: PageProps) {
  const { id } = await params
  const goal = await getGoal(id)
  if (!goal) notFound()

  await refreshGoalMetricsData(goal.id)

  const objectives = goal.objectives ?? []
  const metricsByObjective = await getMetricsForObjectives(
    objectives.map((o) => o.id),
  )

  const sb = getSupabaseAdmin()
  const [allGoalsRes, adminsRes] = await Promise.all([
    sb
      .from("admin_goals")
      .select("id, title")
      .is("deleted_at", null)
      .order("title"),
    sb
      .from("profiles")
      .select("id, email")
      .eq("role", "admin")
      .order("email"),
  ])

  const goalOptions = allGoalsRes.data ?? []
  const admins = adminsRes.data ?? []

  return (
    <div className="space-y-6">
      <DetailBreadcrumbTitle title={goal.title} />
      <Link
        href="/admin/operations/goals"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-zinc-100"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
        All Goals
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <GoalStatusBadge status={goal.status} />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white sm:text-2xl break-words">
            {goal.title}
          </h1>
          {goal.description && (
            <p className="text-sm text-gray-600 dark:text-zinc-400 whitespace-pre-wrap">
              {goal.description}
            </p>
          )}
          <CreatedMetaLine
            createdAt={goal.created_at}
            creatorEmail={goal.creator?.email}
            showUnknownIfNoCreator={Boolean(goal.created_by)}
          />
          <div className="pt-2 space-y-2 max-w-md">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-zinc-400">
                Avg. objective progress
              </span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {Math.round(goal.progress ?? 0)}%
              </span>
            </div>
            <ProgressBar value={goal.progress ?? 0} showLabel={false} />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <CreateGoalButton goal={goal} label="Edit Goal" />
          <CreateObjectiveButton
            admins={admins}
            goals={goalOptions}
            defaultGoalId={goal.id}
            label="Add Objective"
          />
          <RefreshGoalMetricsButton goalId={goal.id} />
          <GoalDetailDelete goalId={goal.id} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Objectives ({objectives.length})
        </h2>
        {objectives.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            No objectives linked yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {objectives.map((obj) => (
              <Link
                key={obj.id}
                href={`/admin/operations/objectives/${obj.id}`}
                className="block rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-4 hover:border-gray-300 dark:hover:border-zinc-600 transition-colors"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <ObjectiveStatusBadge status={obj.status} />
                      <span className="text-xs text-gray-500 dark:text-zinc-400">
                        {obj.period}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {obj.title}
                    </h3>
                    {obj.description && (
                      <p className="text-xs text-gray-600 dark:text-zinc-400 line-clamp-2">
                        {obj.description}
                      </p>
                    )}
                    <ProgressBar value={obj.progress ?? 0} size="sm" />
                    {(metricsByObjective.get(obj.id) ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-1">
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
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-semibold text-gray-900 dark:text-white">
                      {obj.progress ?? 0}%
                    </span>
                    <p className="text-xs text-gray-500 dark:text-zinc-400">
                      {obj.project_count ?? 0} projects
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
