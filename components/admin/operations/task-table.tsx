"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Unlink, Trash2, Pencil } from "lucide-react"
import { TaskStatusBadge } from "./task-status-badge"
import { TaskPriorityBadge } from "./task-priority-badge"
import { TaskFormDialog } from "./task-form-dialog"
import { deleteTask } from "@/lib/actions/operations"
import type {
  Task,
  ProjectMin,
  ObjectiveMin,
  AdminUserMin,
} from "@/lib/types/operations"

interface Props {
  tasks: Task[]
  projects: ProjectMin[]
  objectives: ObjectiveMin[]
  admins: AdminUserMin[]
  showProject?: boolean
  showObjective?: boolean
}

export function TaskTable({
  tasks,
  projects,
  objectives,
  admins,
  showProject = true,
  showObjective = true,
}: Props) {
  const router = useRouter()
  const today = new Date().toISOString().split("T")[0]

  const [editTask, setEditTask] = useState<Task | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === tasks.length
        ? new Set()
        : new Set(tasks.map((t) => t.id))
    )
  }

  async function handleDelete() {
    if (!deleteId) return
    try {
      await deleteTask(deleteId)
      toast.success("Task deleted")
    } catch {
      toast.error("Failed to delete task")
    } finally {
      setDeleteId(null)
    }
  }

  function isOverdue(task: Task): boolean {
    return (
      !!task.due_date &&
      task.due_date < today &&
      task.status !== "done" &&
      task.status !== "cancelled"
    )
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 dark:border-[#1F1F23] bg-white dark:bg-[#0F0F12] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-zinc-900/70 border-b border-gray-200 dark:border-zinc-800">
              <TableHead className="w-10 text-xs font-medium text-gray-600 dark:text-zinc-400">
                <Checkbox
                  checked={
                    tasks.length > 0 && selected.size === tasks.length
                  }
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Title</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Status</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Priority</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Assignee</TableHead>
              <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Due Date</TableHead>
              {showProject && <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Project</TableHead>}
              {showObjective && <TableHead className="text-xs font-medium text-gray-600 dark:text-zinc-400">Objective</TableHead>}
              <TableHead className="w-20 text-xs font-medium text-gray-600 dark:text-zinc-400" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={
                    7 + (showProject ? 1 : 0) + (showObjective ? 1 : 0)
                  }
                  className="text-center py-10 text-gray-600 dark:text-gray-400"
                >
                  No tasks found
                </TableCell>
              </TableRow>
            )}
            {tasks.map((task) => (
              <TableRow
                key={task.id}
                className="cursor-pointer border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50 dark:hover:bg-zinc-800/50"
                onClick={() =>
                  router.push(`/admin/operations/tasks/${task.id}`)
                }
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selected.has(task.id)}
                    onCheckedChange={() => toggleSelect(task.id)}
                    aria-label="Select task"
                  />
                </TableCell>

                <TableCell className="font-medium max-w-[260px]">
                  <div className="flex items-center gap-2">
                    {!task.project_id && (
                      <span title="Not linked to a project" className="flex-shrink-0">
                        <Unlink className="h-3 w-3 text-amber-500 dark:text-amber-400" />
                      </span>
                    )}
                    <span className="truncate text-gray-900 dark:text-gray-100">{task.title}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <TaskStatusBadge status={task.status} />
                </TableCell>

                <TableCell>
                  <TaskPriorityBadge priority={task.priority} />
                </TableCell>

                <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                  {task.assignee?.email ? (
                    task.assignee.email.split("@")[0]
                  ) : (
                    <span className="text-gray-500 dark:text-gray-400">
                      Unassigned
                    </span>
                  )}
                </TableCell>

                <TableCell
                  className={
                    isOverdue(task)
                      ? "text-red-600 dark:text-red-400 text-sm font-medium"
                      : "text-sm text-gray-700 dark:text-gray-300"
                  }
                >
                  {task.due_date ?? (
                    <span className="text-gray-500 dark:text-gray-400">—</span>
                  )}
                </TableCell>

                {showProject && (
                  <TableCell className="text-sm text-gray-700 dark:text-gray-300">
                    {task.project?.name ?? (
                      <span className="text-gray-500 dark:text-gray-400">—</span>
                    )}
                  </TableCell>
                )}

                {showObjective && (
                  <TableCell className="text-sm text-gray-700 dark:text-gray-300 max-w-[160px]">
                    <span className="truncate block">
                      {task.objective?.title ?? (
                        <span className="text-gray-500 dark:text-gray-400">
                          —
                        </span>
                      )}
                    </span>
                  </TableCell>
                )}

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-gray-600 dark:text-zinc-400"
                      onClick={() => setEditTask(task)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                      onClick={() => setDeleteId(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TaskFormDialog
        open={!!editTask}
        onOpenChange={(open) => {
          if (!open) setEditTask(null)
        }}
        task={editTask}
        projects={projects}
        objectives={objectives}
        admins={admins}
      />

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null)
        }}
      >
        <AlertDialogContent className="rounded-xl border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">Delete task?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
              This will soft-delete the task. It can be recovered if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-medium">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
