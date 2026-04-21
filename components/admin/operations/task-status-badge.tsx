import { Badge } from "@/components/ui/badge"
import type { TaskStatus } from "@/lib/types/operations"

interface Props {
  status: TaskStatus
}

const config: Record<TaskStatus, { label: string; className: string }> = {
  todo: {
    label: "Todo",
    className:
      "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/50",
  },
  in_progress: {
    label: "In Progress",
    className:
      "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  },
  blocked: {
    label: "Blocked",
    className:
      "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/50",
  },
  review: {
    label: "Review",
    className:
      "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/50",
  },
  paused: {
    label: "Paused",
    className:
      "border-zinc-400 text-zinc-600 bg-zinc-100 dark:border-zinc-500 dark:text-zinc-300 dark:bg-zinc-800/60",
  },
  done: {
    label: "Done",
    className:
      "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/50",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-gray-200 text-gray-400 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
  },
}

export function TaskStatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? config.todo
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
