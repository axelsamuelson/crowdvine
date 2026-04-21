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
import { updateProject } from "@/lib/actions/operations"
import type { ProjectPriority, ProjectStatus } from "@/lib/types/operations"
import { cn } from "@/lib/utils"
import { taskDetailPrimaryLabelClass } from "@/components/admin/operations/task-detail-primary-label"

const statusTriggerClass: Record<ProjectStatus, string> = {
  planned:
    "border-gray-300 text-gray-600 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/50",
  active:
    "border-blue-300 text-blue-700 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  on_hold:
    "border-amber-300 text-amber-700 bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:bg-amber-950/50",
  paused:
    "border-zinc-400 text-zinc-600 bg-zinc-100 dark:border-zinc-500 dark:text-zinc-300 dark:bg-zinc-800/50",
  completed:
    "border-green-300 text-green-700 bg-green-50 dark:border-green-700 dark:text-green-400 dark:bg-green-950/50",
  archived:
    "border-gray-200 text-gray-400 bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:bg-gray-900/30",
}

const priorityTriggerClass: Record<ProjectPriority, string> = {
  low:
    "border-gray-300 text-gray-500 bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:bg-gray-900/50",
  medium:
    "border-blue-300 text-blue-600 bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:bg-blue-950/50",
  high:
    "border-orange-300 text-orange-700 bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:bg-orange-950/50",
  critical:
    "border-red-300 text-red-700 bg-red-50 dark:border-red-700 dark:text-red-400 dark:bg-red-950/50",
}

const STATUSES: ProjectStatus[] = [
  "planned",
  "active",
  "on_hold",
  "paused",
  "completed",
  "archived",
]

const PRIORITIES: ProjectPriority[] = ["low", "medium", "high", "critical"]

interface Props {
  projectId: string
  status: ProjectStatus
  priority: ProjectPriority
}

export function ProjectDetailQuickFields({
  projectId,
  status,
  priority,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function patch(field: "status" | "priority", value: string) {
    startTransition(async () => {
      try {
        await updateProject(projectId, { [field]: value })
        toast.success("Sparat")
        router.refresh()
      } catch {
        toast.error("Kunde inte spara")
      }
    })
  }

  const st = statusTriggerClass[status] ?? statusTriggerClass.planned
  const pr = priorityTriggerClass[priority] ?? priorityTriggerClass.medium

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex min-w-0 items-center gap-1.5">
        <span
          id={`project-status-label-${projectId}`}
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
            aria-labelledby={`project-status-label-${projectId}`}
            className={cn(
              "h-7 w-auto min-w-[6.25rem] gap-0.5 rounded-md border px-2 py-0 text-[11px] font-medium leading-tight shadow-none focus:ring-1 [&_svg]:size-3.5",
              st,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replace("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex min-w-0 items-center gap-1.5">
        <span
          id={`project-priority-label-${projectId}`}
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
            aria-labelledby={`project-priority-label-${projectId}`}
            className={cn(
              "h-7 w-auto min-w-[5rem] gap-0.5 rounded-md border px-2 py-0 text-[11px] font-medium leading-tight shadow-none focus:ring-1 [&_svg]:size-3.5",
              pr,
            )}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITIES.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}
