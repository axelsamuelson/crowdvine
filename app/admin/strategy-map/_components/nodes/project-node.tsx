"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Eye, EyeOff, FolderKanban } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ProjectStatusBadge } from "@/components/admin/operations/project-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import type { Project } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { useStrategyMapHighlight } from "../strategy-map-highlight-context"
import { useStrategyMapFocus } from "../strategy-map-focus-context"

export type ProjectNodeData = {
  record: Project
  taskCount?: number
  isOrphan?: boolean
  searchDimmed?: boolean
}

function ProjectNodeInner({ id, data, selected }: NodeProps<ProjectNodeData>) {
  const p = data.record
  const { isDimmed } = useStrategyMapHighlight(id)
  const { focus, toggleProjectFocus } = useStrategyMapFocus()
  const progress = p.progress ?? 0
  const dimmed = isDimmed || Boolean(data.searchDimmed)
  const taskCount = data.taskCount ?? 0
  const isFocusRoot =
    focus?.kind === "project" && focus.id === p.id

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-amber-400 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
      <Card
        className={cn(
          "relative min-w-[240px] max-w-[280px] rounded-xl border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 text-zinc-900 shadow-sm transition-shadow dark:border-amber-700 dark:border-l-amber-400 dark:bg-amber-950/70 dark:text-zinc-50",
          selected && "shadow-lg ring-2 ring-amber-400/50",
          !selected && "hover:shadow-md hover:border-amber-300 dark:hover:border-amber-600",
          data.isOrphan && "border-dashed",
          dimmed && "opacity-30"
        )}
      >
        <button
          type="button"
          aria-label={
            isFocusRoot
              ? "Visa hela strategikartan"
              : "Visa endast detta projekt och kopplade tasks"
          }
          title={
            isFocusRoot
              ? "Visa hela strategikartan"
              : "Fokusera på detta projekt (objective, mål & tasks)"
          }
          className={cn(
            "absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md border border-amber-200/80 bg-white/90 text-amber-900 shadow-sm hover:bg-amber-50 dark:border-amber-700 dark:bg-amber-950/90 dark:text-amber-100 dark:hover:bg-amber-900/80",
            isFocusRoot && "border-indigo-400 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-100"
          )}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            toggleProjectFocus(p.id)
          }}
        >
          {isFocusRoot ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <div className="flex items-start gap-2 p-3 pr-10">
          <div className="mt-0.5 rounded-md bg-amber-100 p-1.5 dark:bg-amber-900/50">
            <FolderKanban
              className="h-4 w-4 text-amber-800 dark:text-amber-200"
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50 line-clamp-2">
              {p.name}
            </p>
            <ProjectStatusBadge status={p.status} />
            <ProgressBar value={progress} size="sm" />
            <p className="text-[11px] text-amber-900/80 dark:text-amber-100/90">
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </Card>
      <Handle
        type="source"
        position={Position.Right}
        className="!size-2.5 !border-2 !border-amber-400 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
    </>
  )
}

export const ProjectNode = memo(ProjectNodeInner)
