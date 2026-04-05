import { Badge } from "@/components/ui/badge"
import type { GoalStatus } from "@/lib/types/operations"

interface Props {
  status: GoalStatus
}

const config: Record<GoalStatus, { label: string; className: string }> = {
  active: {
    label: "Active",
    className:
      "border-violet-300 text-violet-800 bg-violet-50 dark:border-violet-600 dark:text-violet-300 dark:bg-violet-950/50",
  },
  completed: {
    label: "Completed",
    className:
      "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/50",
  },
  paused: {
    label: "Paused",
    className:
      "border-amber-300 text-amber-800 bg-amber-50 dark:border-amber-700 dark:text-amber-300 dark:bg-amber-950/50",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "border-gray-300 text-gray-500 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/40",
  },
}

export function GoalStatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? config.active
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
