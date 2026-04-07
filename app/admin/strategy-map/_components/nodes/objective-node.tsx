"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { Eye, EyeOff, Target } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ObjectiveStatusBadge } from "@/components/admin/operations/objective-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import type { Objective } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { useStrategyMapHighlight } from "../strategy-map-highlight-context"
import { useStrategyMapFocus } from "../strategy-map-focus-context"

export type ObjectiveNodeData = {
  record: Objective
  isOrphan?: boolean
  searchDimmed?: boolean
}

function ObjectiveNodeInner({ id, data, selected }: NodeProps<ObjectiveNodeData>) {
  const o = data.record
  const { isDimmed } = useStrategyMapHighlight(id)
  const { focus, toggleObjectiveFocus } = useStrategyMapFocus()
  const progress = o.progress ?? 0
  const dimmed = isDimmed || Boolean(data.searchDimmed)
  const isFocusRoot =
    focus?.kind === "objective" && focus.id === o.id

  return (
    <>
      <Handle
        type="target"
        position={Position.Left}
        className="!size-2.5 !border-2 !border-blue-400 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
      <Card
        className={cn(
          "relative min-w-[260px] max-w-[300px] rounded-xl border border-blue-200 border-l-4 border-l-blue-500 bg-blue-50 text-zinc-900 shadow-sm transition-shadow dark:border-blue-700 dark:border-l-blue-400 dark:bg-blue-950/70 dark:text-zinc-50",
          selected && "shadow-lg ring-2 ring-blue-400/50",
          !selected && "hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600",
          data.isOrphan && "border-dashed",
          dimmed && "opacity-30"
        )}
      >
        <button
          type="button"
          aria-label={
            isFocusRoot
              ? "Visa hela strategikartan"
              : "Visa endast detta objective och underliggande"
          }
          title={
            isFocusRoot
              ? "Visa hela strategikartan"
              : "Fokusera på detta objective (projekt & tasks)"
          }
          className={cn(
            "absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-md border border-blue-200/80 bg-white/90 text-blue-800 shadow-sm hover:bg-blue-50 dark:border-blue-700 dark:bg-blue-950/90 dark:text-blue-200 dark:hover:bg-blue-900/80",
            isFocusRoot && "border-indigo-400 bg-indigo-50 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950 dark:text-indigo-100"
          )}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            toggleObjectiveFocus(o.id)
          }}
        >
          {isFocusRoot ? (
            <EyeOff className="h-3.5 w-3.5" aria-hidden />
          ) : (
            <Eye className="h-3.5 w-3.5" aria-hidden />
          )}
        </button>
        <div className="flex items-start gap-2 p-3 pr-10">
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
        position={Position.Right}
        className="!size-2.5 !border-2 !border-blue-400 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
    </>
  )
}

export const ObjectiveNode = memo(ObjectiveNodeInner)
