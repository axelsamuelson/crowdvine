"use client"

import { memo } from "react"
import { Handle, Position, type NodeProps } from "@xyflow/react"
import { CheckSquare } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { TaskStatusBadge } from "@/components/admin/operations/task-status-badge"
import type { Task } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { useStrategyMapHighlight } from "../strategy-map-highlight-context"

export type TaskNodeData = {
  record: Task
  isOrphan?: boolean
  searchDimmed?: boolean
}

function initials(email: string | undefined): string {
  if (!email) return "?"
  const local = email.split("@")[0] ?? "?"
  return local.slice(0, 2).toUpperCase()
}

function TaskNodeInner({ id, data, selected }: NodeProps<TaskNodeData>) {
  const t = data.record
  const { isDimmed } = useStrategyMapHighlight(id)
  const email = t.assignee?.email
  const dimmed = isDimmed || Boolean(data.searchDimmed)

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!size-2.5 !border-2 !border-emerald-400 !bg-white dark:!bg-zinc-900"
        isConnectable
      />
      <Card
        className={cn(
          "min-w-[220px] max-w-[260px] rounded-xl border border-emerald-200 border-l-4 border-l-emerald-500 bg-emerald-50 text-zinc-900 shadow-sm transition-shadow dark:border-emerald-700 dark:border-l-emerald-400 dark:bg-emerald-950/70 dark:text-zinc-50",
          selected && "shadow-lg ring-2 ring-emerald-400/50",
          !selected &&
            "hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-600",
          data.isOrphan && "border-dashed",
          dimmed && "opacity-30"
        )}
      >
        <div className="flex items-start gap-2 p-2.5">
          <div className="mt-0.5 rounded-md bg-emerald-100 p-1.5 dark:bg-emerald-900/50">
            <CheckSquare
              className="h-3.5 w-3.5 text-emerald-800 dark:text-emerald-200"
              aria-hidden
            />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-xs font-semibold leading-snug text-gray-900 dark:text-white line-clamp-2">
              {t.title}
            </p>
            <TaskStatusBadge status={t.status} />
            <div className="flex items-center gap-2 pt-0.5">
              <Avatar className="h-6 w-6 text-[10px]">
                <AvatarFallback className="bg-emerald-200/80 text-emerald-900 dark:bg-emerald-800 dark:text-emerald-100">
                  {initials(email)}
                </AvatarFallback>
              </Avatar>
              {email && (
                <span className="truncate text-[10px] text-zinc-600 dark:text-zinc-300">
                  {email}
                </span>
              )}
            </div>
          </div>
        </div>
      </Card>
    </>
  )
}

export const TaskNode = memo(TaskNodeInner)
