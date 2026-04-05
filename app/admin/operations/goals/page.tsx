import Link from "next/link"
import { Flag } from "lucide-react"
import { getGoals } from "@/lib/actions/operations"
import { GoalStatusBadge } from "@/components/admin/operations/goal-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import { CreateGoalButton } from "@/components/admin/operations/create-goal-button"
import { CreatedMetaLine } from "@/components/admin/operations/created-meta-line"

export default async function GoalsPage() {
  const goals = await getGoals({})

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-950/60 shrink-0">
            <Flag className="w-5 h-5 text-violet-800 dark:text-violet-200" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">
              Goals
            </h1>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mt-0.5">
              {goals.length} goal{goals.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="w-full shrink-0 sm:w-auto [&_button]:w-full sm:[&_button]:w-auto">
          <CreateGoalButton />
        </div>
      </div>

      {goals.length === 0 && (
        <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] p-12 text-center">
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            No goals yet
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {goals.map((g) => (
          <Link
            key={g.id}
            href={`/admin/operations/goals/${g.id}`}
            className="block rounded-xl border border-violet-200 dark:border-violet-900/50 bg-violet-50/40 dark:bg-violet-950/20 p-5 hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <GoalStatusBadge status={g.status} />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {g.title}
                </h2>
                {g.description && (
                  <p className="text-sm text-gray-600 dark:text-zinc-400 line-clamp-2">
                    {g.description}
                  </p>
                )}
                <ProgressBar value={g.progress ?? 0} />
                <CreatedMetaLine
                  createdAt={g.created_at}
                  creatorEmail={g.creator?.email}
                  showUnknownIfNoCreator={Boolean(g.created_by)}
                  className="pt-1"
                />
              </div>
              <div className="flex-shrink-0 space-y-2 sm:text-right sm:min-w-[100px]">
                <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {Math.round(g.progress ?? 0)}%
                </div>
                <div className="space-y-1 text-xs text-gray-600 dark:text-zinc-400">
                  <p>{g.objective_count ?? 0} objectives</p>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
