"use client"

import Link from "next/link"
import { ProjectStatusBadge } from "@/components/admin/operations/project-status-badge"
import { ProjectDeleteWithTasksControl } from "@/components/admin/operations/project-delete-with-tasks-control"
import { Checkbox } from "@/components/ui/checkbox"
import type { ProjectStatus } from "@/lib/types/operations"
import { cn } from "@/lib/utils"

type ProjectRow = {
  id: string
  name: string
  status: ProjectStatus
  due_date?: string | null
}

export function ObjectiveProjectListRow({
  project,
  objectiveId,
  taskCount,
  selectable = false,
  selected = false,
  onSelectedChange,
}: {
  project: ProjectRow
  objectiveId: string
  taskCount: number
  selectable?: boolean
  selected?: boolean
  onSelectedChange?: (selected: boolean) => void
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3",
        "hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors"
      )}
    >
      {selectable && onSelectedChange ? (
        <div
          className="shrink-0 pt-0.5"
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={selected}
            onCheckedChange={(v) => onSelectedChange(v === true)}
            aria-label={`Select project ${project.name}`}
          />
        </div>
      ) : null}
      <Link
        href={`/admin/operations/projects/${project.id}`}
        className="min-w-0 flex-1 flex items-center justify-between gap-3 text-left"
      >
        <span className="min-w-0 truncate text-sm font-medium text-gray-800 dark:text-gray-200">
          {project.name}
        </span>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
          <span className="tabular-nums text-xs font-medium text-gray-600 dark:text-zinc-400">
            {taskCount} {taskCount === 1 ? "task" : "tasks"}
          </span>
          <ProjectStatusBadge status={project.status} />
          {project.due_date && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {project.due_date}
            </span>
          )}
        </div>
      </Link>
      <ProjectDeleteWithTasksControl
        variant="icon"
        projectId={project.id}
        projectName={project.name}
        taskCount={taskCount}
        expectedObjectiveId={objectiveId}
        afterDelete={{
          mode: "redirect",
          href: `/admin/operations/objectives/${objectiveId}`,
        }}
      />
    </div>
  )
}
