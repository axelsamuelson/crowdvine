"use client"

import { useState } from "react"
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
import { updateTask } from "@/lib/actions/operations"
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

      {/* Assignee */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Assignee</Label>
        <Select
          defaultValue={task.assigned_to ?? "__none__"}
          onValueChange={(v) =>
            handleUpdate("assigned_to", v === "__none__" ? null : v)
          }
          disabled={saving}
        >
          <SelectTrigger className={fieldClass}>
            <SelectValue placeholder="Unassigned" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">Unassigned</SelectItem>
            {admins.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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

      {/* Project */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Project</Label>
        <div className="flex items-center gap-1">
          <Select
            defaultValue={task.project_id ?? "__none__"}
            onValueChange={(v) =>
              handleUpdate("project_id", v === "__none__" ? null : v)
            }
            disabled={saving}
          >
            <SelectTrigger className={`${fieldClass} flex-1`}>
              <SelectValue placeholder="No project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {task.project_id && (
            <Link
              href={`/admin/operations/projects/${task.project_id}`}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Objective */}
      <div className="space-y-1.5">
        <Label className="text-xs text-gray-600 dark:text-gray-400">Objective</Label>
        <div className="flex items-center gap-1">
          <Select
            defaultValue={task.objective_id ?? "__none__"}
            onValueChange={(v) =>
              handleUpdate("objective_id", v === "__none__" ? null : v)
            }
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
          {task.objective_id && (
            <Link
              href={`/admin/operations/okrs/${task.objective_id}`}
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
