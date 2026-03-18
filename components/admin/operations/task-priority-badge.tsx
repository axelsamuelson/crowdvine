import { Badge } from "@/components/ui/badge"
import type { TaskPriority } from "@/lib/types/operations"

interface Props {
  priority: TaskPriority
}

const config: Record<TaskPriority, { label: string; className: string }> = {
  low: {
    label: "Low",
    className:
      "border-gray-300 text-gray-500 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/50",
  },
  medium: {
    label: "Medium",
    className:
      "border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  },
  high: {
    label: "High",
    className:
      "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950/50",
  },
  urgent: {
    label: "Urgent",
    className:
      "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/50",
  },
}

export function TaskPriorityBadge({ priority }: Props) {
  const { label, className } = config[priority] ?? config.medium
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
