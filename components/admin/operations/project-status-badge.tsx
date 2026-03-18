import { Badge } from "@/components/ui/badge"
import type { ProjectStatus } from "@/lib/types/operations"

interface Props {
  status: ProjectStatus
}

const config: Record<ProjectStatus, { label: string; className: string }> = {
  planned: {
    label: "Planned",
    className:
      "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/50",
  },
  active: {
    label: "Active",
    className:
      "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  },
  on_hold: {
    label: "On Hold",
    className:
      "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/50",
  },
  completed: {
    label: "Completed",
    className:
      "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/50",
  },
  archived: {
    label: "Archived",
    className:
      "border-gray-200 text-gray-400 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
  },
}

export function ProjectStatusBadge({ status }: Props) {
  const { label, className } = config[status] ?? config.planned
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
