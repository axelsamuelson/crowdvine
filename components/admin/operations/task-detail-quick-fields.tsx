"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateTask } from "@/lib/actions/operations"
import type { TaskPriority, TaskStatus } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { taskDetailPrimaryLabelClass } from "@/components/admin/operations/task-detail-primary-label"

const statusTriggerClass: Record<TaskStatus, string> = {
  todo:
    "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/50",
  in_progress:
    "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  blocked:
    "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/50",
  review:
    "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/50",
  done:
    "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/50",
  cancelled:
    "border-gray-200 text-gray-400 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
}

const priorityTriggerClass: Record<TaskPriority, string> = {
  low:
    "border-gray-300 text-gray-500 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/50",
  medium:
    "border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  high:
    "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950/50",
  urgent:
    "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/50",
}

interface Props {
  taskId: string
  status: TaskStatus
  priority: TaskPriority
}

export function TaskDetailQuickFields({ taskId, status, priority }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function patch(field: "status" | "priority", value: string) {
    startTransition(async () => {
      try {
        await updateTask(taskId, { [field]: value })
        toast.success("Sparat")
        router.refresh()
      } catch {
        toast.error("Kunde inte spara")
      }
    })
  }

  const st = statusTriggerClass[status] ?? statusTriggerClass.todo
  const pr = priorityTriggerClass[priority] ?? priorityTriggerClass.medium

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          id={`task-status-label-${taskId}`}
          className={cn("shrink-0", taskDetailPrimaryLabelClass)}
        >
          Status
        </span>
        <Select
          value={status}
          onValueChange={(v) => patch("status", v)}
          disabled={pending}
        >
          <SelectTrigger
            aria-labelledby={`task-status-label-${taskId}`}
            className={cn(
              "h-7 w-auto min-w-[5.75rem] gap-0.5 rounded-md border px-2 py-0 text-[11px] font-medium leading-tight shadow-none focus:ring-1 [&_svg]:size-3.5",
              st,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todo">Todo</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="blocked">Blocked</SelectItem>
            <SelectItem value="review">Review</SelectItem>
            <SelectItem value="done">Done</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <span
          id={`task-priority-label-${taskId}`}
          className={cn("shrink-0", taskDetailPrimaryLabelClass)}
        >
          Prioritet
        </span>
        <Select
          value={priority}
          onValueChange={(v) => patch("priority", v)}
          disabled={pending}
        >
          <SelectTrigger
            aria-labelledby={`task-priority-label-${taskId}`}
            className={cn(
              "h-7 w-auto min-w-[5rem] gap-0.5 rounded-md border px-2 py-0 text-[11px] font-medium leading-tight shadow-none focus:ring-1 [&_svg]:size-3.5",
              pr,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
