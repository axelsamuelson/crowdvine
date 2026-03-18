"use client"

import { useState } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TaskStatusBadge } from "./task-status-badge"
import { TaskPriorityBadge } from "./task-priority-badge"
import { TaskFormDialog } from "./task-form-dialog"
import type {
  Task,
  EntityType,
  ProjectMin,
  ObjectiveMin,
  AdminUserMin,
} from "@/lib/types/operations"

interface Props {
  entity_type: EntityType
  entity_id: string
  entity_label: string
  tasks: Task[]
  projects: ProjectMin[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
}

export function RelatedTasksCard({
  entity_type,
  entity_id,
  entity_label,
  tasks,
  projects,
  objectives,
  admins,
}: Props) {
  const [open, setOpen] = useState(false)

  const today = new Date().toISOString().split("T")[0]

  function isOverdue(task: Task): boolean {
    return (
      !!task.due_date &&
      task.due_date < today &&
      task.status !== "done" &&
      task.status !== "cancelled"
    )
  }

  const openTasks = tasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  )
  const doneTasks = tasks.filter((t) => t.status === "done")

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#1F1F23] bg-gray-50 dark:bg-zinc-900/70">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tasks
            </span>
            {openTasks.length > 0 && (
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {openTasks.length} open
              </span>
            )}
            {doneTasks.length > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                · {doneTasks.length} done
              </span>
            )}
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => setOpen(true)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add Task
          </Button>
        </div>

        {/* Task list */}
        {tasks.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No tasks linked to this {entity_type}
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2 text-xs text-gray-500 dark:text-gray-400"
              onClick={() => setOpen(true)}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create first task
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-[#1F1F23]">
            {tasks.map((task) => (
              <Link
                key={task.id}
                href={`/admin/operations/tasks/${task.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-zinc-900/40 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      task.status === "done" || task.status === "cancelled"
                        ? "line-through text-gray-500 dark:text-gray-400"
                        : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {task.title}
                  </p>
                  {task.project && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate mt-0.5">
                      {task.project.name}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <TaskPriorityBadge priority={task.priority} />
                  <TaskStatusBadge status={task.status} />
                  {task.due_date && (
                    <span
                      className={`text-xs hidden sm:block ${
                        isOverdue(task)
                          ? "text-red-600 dark:text-red-400 font-medium"
                          : "text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {task.due_date}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <TaskFormDialog
        open={open}
        onOpenChange={setOpen}
        projects={projects}
        objectives={objectives}
        admins={admins}
        defaultEntityType={entity_type}
        defaultEntityId={entity_id}
        defaultEntityLabel={entity_label}
      />
    </>
  )
}
