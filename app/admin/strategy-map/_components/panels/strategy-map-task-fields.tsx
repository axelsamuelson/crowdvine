"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateTask, updateTaskAssignees } from "@/lib/actions/operations"
import type { AdminUserMin, Objective, Project, Task } from "@/lib/types/operations"

const fieldClass =
  "h-9 text-sm rounded-lg border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-zinc-900/40 text-gray-900 dark:text-zinc-100"

type Props = {
  task: Task
  objectives: Objective[]
  projects: Project[]
  admins: AdminUserMin[]
  onTaskUpdated: (task: Task) => void
}

export function StrategyMapTaskFields({
  task,
  objectives,
  projects,
  admins,
  onTaskUpdated,
}: Props) {
  const [pending, start] = useTransition()

  const projectsForObjective = projects.filter(
    (p) =>
      !task.objective_id ||
      !p.objective_id ||
      p.objective_id === task.objective_id
  )

  function run<T>(fn: () => Promise<T>) {
    start(async () => {
      try {
        await fn()
      } catch {
        toast.error("Kunde inte spara")
      }
    })
  }

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-900/40 p-3">
      <p className="text-xs font-medium text-gray-700 dark:text-zinc-300">
        Redigera kopplingar
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-zinc-400">
          Objective
        </Label>
        <Select
          disabled={pending}
          value={task.objective_id ?? "__none__"}
          onValueChange={(val) => {
            run(async () => {
              const objective_id = val === "__none__" ? null : val
              let project_id = task.project_id
              if (objective_id && project_id) {
                const p = projects.find((x) => x.id === project_id)
                if (p?.objective_id && p.objective_id !== objective_id) {
                  project_id = null
                }
              }
              if (!objective_id) project_id = null
              const t = await updateTask(task.id, { objective_id, project_id })
              onTaskUpdated(t)
              toast.success("Sparat")
            })
          }}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Inget objective" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Inget objective</SelectItem>
            {objectives.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-zinc-400">
          Projekt
        </Label>
        <Select
          disabled={pending}
          value={task.project_id ?? "__none__"}
          onValueChange={(val) => {
            run(async () => {
              const project_id = val === "__none__" ? null : val
              const p = project_id
                ? projects.find((x) => x.id === project_id)
                : null
              const objective_id = p?.objective_id ?? task.objective_id
              const t = await updateTask(task.id, {
                project_id,
                objective_id,
              })
              onTaskUpdated(t)
              toast.success("Sparat")
            })
          }}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Inget projekt" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Inget projekt</SelectItem>
            {projectsForObjective.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-gray-600 dark:text-zinc-400">
          Ansvariga
        </Label>
        <p className="text-[11px] text-gray-500 dark:text-zinc-500">
          Välj en eller flera. Första i listan blir primär assignee i äldre
          vyer.
        </p>
        <ul className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {admins.map((a) => {
            const isChecked =
              task.assignees && task.assignees.length > 0
                ? task.assignees.some((x) => x.id === a.id)
                : task.assigned_to === a.id

            return (
              <li key={a.id} className="flex items-center gap-2">
                <Checkbox
                  id={`sm-assign-${task.id}-${a.id}`}
                  checked={isChecked}
                  disabled={pending}
                  onCheckedChange={(v) => {
                    const on = v === true
                    run(async () => {
                      const set = new Set(
                        (task.assignees?.length
                          ? task.assignees.map((x) => x.id)
                          : task.assigned_to
                            ? [task.assigned_to]
                            : []
                        ).filter(Boolean) as string[]
                      )
                      if (on) set.add(a.id)
                      else set.delete(a.id)
                      const t = await updateTaskAssignees(
                        task.id,
                        [...set]
                      )
                      onTaskUpdated(t)
                      toast.success("Sparat")
                    })
                  }}
                />
                <label
                  htmlFor={`sm-assign-${task.id}-${a.id}`}
                  className="text-xs text-gray-800 dark:text-zinc-200 cursor-pointer leading-snug"
                >
                  {a.email}
                </label>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
