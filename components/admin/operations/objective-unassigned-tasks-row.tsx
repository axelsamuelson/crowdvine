"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"

export function ObjectiveUnassignedTasksRow({
  objectiveId,
  taskCount,
  showTopSeparator = true,
}: {
  objectiveId: string
  taskCount: number
  showTopSeparator?: boolean
}) {
  const href = `/admin/operations/objectives/${objectiveId}?tab=tasks`

  return (
    <div
      className={cn(
        "px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900/40",
        showTopSeparator &&
          "border-t border-gray-100 dark:border-[#1F1F23]"
      )}
    >
      <Link
        href={href}
        className="group flex flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">
              Unassigned tasks
            </span>
            <span className="tabular-nums text-xs text-gray-500 dark:text-zinc-400">
              {taskCount} {taskCount === 1 ? "task" : "tasks"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-zinc-500">
            Not a project — only tasks on this objective without a project.
          </p>
        </div>
        <span className="shrink-0 text-xs font-medium text-gray-500 underline-offset-2 group-hover:text-gray-900 group-hover:underline dark:text-zinc-400 dark:group-hover:text-zinc-200">
          Tasks tab →
        </span>
      </Link>
    </div>
  )
}
