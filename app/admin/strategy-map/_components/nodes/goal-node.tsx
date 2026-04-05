"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Flag } from "lucide-react"
import { Card } from "@/components/ui/card"
import { GoalStatusBadge } from "@/components/admin/operations/goal-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import type { Goal } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { useStrategyMapHighlight } from "../strategy-map-highlight-context"

export type GoalNodeData = {
  record: Goal
  isOrphan?: boolean
  searchDimmed?: boolean
}

function GoalNodeInner({ id, data, selected }: NodeProps<GoalNodeData>) {
  const g = data.record
  const { isDimmed } = useStrategyMapHighlight(id)
  const progress = g.progress ?? 0
  const dimmed = isDimmed || Boolean(data.searchDimmed)
  const objCount = g.objective_count ?? g.objectives?.length ?? 0

  return (
    <>
      <Card
        className={cn(
          "min-w-[280px] max-w-[340px] rounded-xl border border-violet-300 border-l-[6px] border-l-violet-500 bg-violet-50 text-zinc-900 shadow-sm transition-shadow dark:border-violet-600 dark:border-l-violet-400 dark:bg-violet-950/60 dark:text-zinc-50",
          selected && "shadow-lg ring-2 ring-violet-400/50",
          !selected &&
            "hover:shadow-md hover:border-violet-400 dark:hover:border-violet-500",
          data.isOrphan && "border-dashed",
          dimmed && "opacity-30"
        )}
      >
        <div className="flex items-start gap-2.5 p-3.5">
          <div className="mt-0.5 rounded-md bg-violet-200/80 p-2 dark:bg-violet-900/70">
            <Flag
              className="h-5 w-5 text-violet-800 dark:text-violet-200"
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-[15px] font-semibold leading-snug text-zinc-900 dark:text-zinc-50 line-clamp-2">
              {g.title}
            </p>
            <GoalStatusBadge status={g.status} />
            <ProgressBar value={progress} size="sm" />
            <p className="text-[11px] text-violet-900/80 dark:text-violet-100/90">
              {objCount} objective{objCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </Card>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !border-2 !border-violet-500 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
    </>
  )
}

export const GoalNode = memo(GoalNodeInner)
