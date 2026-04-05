"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Target } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ObjectiveStatusBadge } from "@/components/admin/operations/objective-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import type { Objective } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { useStrategyMapHighlight } from "../strategy-map-highlight-context"

export type ObjectiveNodeData = {
  record: Objective
  isOrphan?: boolean
  searchDimmed?: boolean
}

function ObjectiveNodeInner({ id, data, selected }: NodeProps<ObjectiveNodeData>) {
  const o = data.record
  const { isDimmed } = useStrategyMapHighlight(id)
  const progress = o.progress ?? 0
  const dimmed = isDimmed || Boolean(data.searchDimmed)

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2.5 !border-2 !border-blue-400 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
      <Card
        className={cn(
          "min-w-[260px] max-w-[300px] rounded-xl border border-blue-200 border-l-4 border-l-blue-500 bg-blue-50 text-zinc-900 shadow-sm transition-shadow dark:border-blue-700 dark:border-l-blue-400 dark:bg-blue-950/70 dark:text-zinc-50",
          selected && "shadow-lg ring-2 ring-blue-400/50",
          !selected && "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
          data.isOrphan && "border-dashed",
          dimmed && "opacity-30"
        )}
      >
        <div className="flex items-start gap-2 p-3">
          <div className="mt-0.5 rounded-md bg-blue-100 p-1.5 dark:bg-blue-900/60">
            <Target className="h-4 w-4 text-blue-700 dark:text-blue-300" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-50 line-clamp-2">
              {o.title}
            </p>
            <ObjectiveStatusBadge status={o.status} />
            <ProgressBar value={progress} size="sm" />
          </div>
        </div>
      </Card>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!size-2.5 !border-2 !border-blue-400 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
    </>
  )
}

export const ObjectiveNode = memo(ObjectiveNodeInner)
