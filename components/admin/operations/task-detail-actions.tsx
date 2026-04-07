"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { updateTask, updateTaskAssignees } from "@/lib/actions/operations"
import type {
  TaskDetail,
  ProjectMin,
  ObjectiveMin,
  AdminUserMin,
} from "@/lib/types/operations"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

interface Props {
  task: TaskDetail
  projects: ProjectMin[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
}

export function TaskDetailActions({
  task,
  projects,
  objectives,
  admins,
}: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [objectiveId, setObjectiveId] = useState<string | null>(
    task.objective_id ?? null
  )
  const [projectId, setProjectId] = useState<string | null>(
    task.project_id ?? null
  )

  useEffect(() => {
    setObjectiveId(task.objective_id ?? null)
    setProjectId(task.project_id ?? null)
  }, [task.objective_id, task.project_id, task.id])

  const filteredProjects = useMemo(() => {
    if (objectiveId == null) return projects
    return projects.filter(
      (p) =>
        (p.objective_id ?? null) === objectiveId ||
        (projectId != null && p.id === projectId)
    )
  }, [projects, objectiveId, projectId])

  async function handleUpdate(
    field: string,
    value: string | number | null
  ) {
    setSaving(true)
    try {
      await updateTask(task.id, { [field]: value })
      toast.success("Saved")
      router.refresh()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleObjectiveSelect(v: string) {
    const newObjectiveId = v === "__none__" ? null : v
    const currentProj =
      projectId != null ? projects.find((p) => p.id === projectId) : null
    const mustClearProject =
      currentProj != null &&
      newObjectiveId != null &&
      (currentProj.objective_id ?? null) !== newObjectiveId

    setSaving(true)
    try {
      await updateTask(task.id, {
        objective_id: newObjectiveId,
        ...(mustClearProject ? { project_id: null } : {}),
      })
      setObjectiveId(newObjectiveId)
      if (mustClearProject) setProjectId(null)
      toast.success("Saved")
      router.refresh()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  async function handleProjectSelect(v: string) {
    const newProjectId = v === "__none__" ? null : v
    setSaving(true)
    try {
      await updateTask(task.id, { project_id: newProjectId })
      setProjectId(newProjectId)
      toast.success("Saved")
      router.refresh()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const fieldClass =
    "h-9 text-sm rounded-lg border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-zinc-900/40 text-gray-900 dark:text-zinc-100"

  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] p-4 bg-white dark:bg-[#0F0F12] space-y-4">
      <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Details
      </h2>

      {/* Status */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Status</Label>
        <Select
          defaultValue={task.status}
          onValueChange={(v) => handleUpdate("status", v)}
          disabled={saving}
        >
          <SelectTrigger className={fieldClass}>
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

      {/* Priority */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Priority</Label>
        <Select
          defaultValue={task.priority}
          onValueChange={(v) => handleUpdate("priority", v)}
          disabled={saving}
        >
          <SelectTrigger className={fieldClass}>
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

      {/* Assignees (multi) */}
      <div className="space-y-2">
        <Label className="text-xs text-gray-600 dark:text-gray-400">
          Assignees
        </Label>
        <p className="text-[11px] text-gray-500 dark:text-gray-500">
          First selected is primary for legacy filters. Toggle to add or remove.
        </p>
        <ul className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {admins.map((a) => {
            const isChecked =
              task.assignees && task.assignees.length > 0
                ? task.assignees.some((x) => x.id === a.id)
                : task.assigned_to === a.id
            return (
              <li key={a.id} className="flex items-center gap-2">
                <Checkbox
                  id={`td-assign-${task.id}-${a.id}`}
                  checked={isChecked}
                  disabled={saving}
                  onCheckedChange={(v) => {
                    const on = v === true
                    setSaving(true)
                    void (async () => {
                      try {
                        const set = new Set(
                          (
                            task.assignees?.length
                              ? task.assignees.map((x) => x.id)
                              : task.assigned_to
                                ? [task.assigned_to]
                                : []
                          ).filter(Boolean) as string[]
                        )
                        if (on) set.add(a.id)
                        else set.delete(a.id)
                        await updateTaskAssignees(task.id, [...set])
                        toast.success("Saved")
                        router.refresh()
                      } catch {
                        toast.error("Failed to save")
                      } finally {
                        setSaving(false)
                      }
                    })()
                  }}
                />
                <label
                  htmlFor={`td-assign-${task.id}-${a.id}`}
                  className="text-xs text-gray-800 dark:text-gray-200 cursor-pointer"
                >
                  {a.email}
                </label>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Due date */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Due Date</Label>
        <Input
          type="date"
          className={fieldClass}
          defaultValue={task.due_date ?? ""}
          onChange={(e) =>
            handleUpdate("due_date", e.target.value || null)
          }
          disabled={saving}
        />
      </div>

      {/* Objective first — project list filters to this objective */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Objective</Label>
        <div className="flex items-center gap-1">
          <Select
            value={objectiveId ?? "__none__"}
            onValueChange={(v) => void handleObjectiveSelect(v)}
            disabled={saving}
          >
            <SelectTrigger className={`${fieldClass} flex-1`}>
              <SelectValue placeholder="No objective" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No objective</SelectItem>
              {objectives.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {objectiveId && (
            <Link
              href={`/admin/operations/objectives/${objectiveId}`}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Project — only projects under the selected objective (plus current if mismatch) */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Project</Label>
        {objectiveId ? (
          <p className="text-[11px] text-gray-500 dark:text-gray-500 pb-0.5">
            Only projects linked to this objective are shown.
          </p>
        ) : null}
        <div className="flex items-center gap-1">
          <Select
            value={projectId ?? "__none__"}
            onValueChange={(v) => void handleProjectSelect(v)}
            disabled={saving}
          >
            <SelectTrigger className={`${fieldClass} flex-1`}>
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {filteredProjects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {projectId && (
            <Link
              href={`/admin/operations/projects/${projectId}`}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Estimated hours */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Estimated Hours</Label>
        <Input
          type="number"
          step="0.5"
          min="0"
          className={fieldClass}
          defaultValue={task.estimated_hours ?? ""}
          onChange={(e) =>
            handleUpdate(
              "estimated_hours",
              e.target.value ? parseFloat(e.target.value) : null
            )
          }
          disabled={saving}
        />
      </div>

      {/* Meta */}
      <div className="pt-2 border-t border-gray-100 dark:border-[#1F1F23] space-y-1">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Created{" "}
          {new Date(task.created_at).toLocaleDateString("sv-SE", {
            timeZone: "UTC",
          })}
        </p>
        {task.completed_at && (
          <p className="text-xs text-green-600 dark:text-green-400">
            Completed{" "}
            {new Date(task.completed_at).toLocaleDateString("sv-SE", {
              timeZone: "UTC",
            })}
          </p>
        )}
      </div>
    </div>
  )
}
