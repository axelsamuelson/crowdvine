"use client"

import { useState, useEffect } from "react"
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd"
import { toast } from "sonner"
import { updateTask } from "@/lib/actions/operations"
import { TaskPriorityBadge } from "./task-priority-badge"
import { TaskStatusBadge } from "./task-status-badge"
import { Unlink } from "lucide-react"
import Link from "next/link"
import type { Task, TaskStatus } from "@/lib/types/operations"

interface Props {
  tasks: Task[]
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo",        label: "Todo"        },
  { status: "in_progress", label: "In Progress" },
  { status: "blocked",     label: "Blocked"     },
  { status: "review",      label: "Review"      },
  { status: "done",        label: "Done"        },
]

const COLUMN_HEADER_COLORS: Record<TaskStatus, string> = {
  todo:        "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400",
  in_progress: "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400",
  blocked:     "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400",
  review:      "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400",
  done:        "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400",
  cancelled:   "border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-400",
}

type ColumnMap = Record<TaskStatus, Task[]>

function buildColumnMap(tasks: Task[]): ColumnMap {
  const map: ColumnMap = {
    todo:        [],
    in_progress: [],
    blocked:     [],
    review:      [],
    done:        [],
    cancelled:   [],
  }
  for (const task of tasks) {
    const col = map[task.status]
    if (col) col.push(task)
  }
  // Sort each column by status_sort_order
  for (const col of Object.values(map)) {
    col.sort((a, b) => a.status_sort_order - b.status_sort_order)
  }
  return map
}

export function TaskBoard({ tasks }: Props) {
  const today = new Date().toISOString().split("T")[0]
  const [columns, setColumns] = useState<ColumnMap>(() =>
    buildColumnMap(tasks)
  )

  // Sync when tasks prop changes (e.g. after server revalidation)
  useEffect(() => {
    setColumns(buildColumnMap(tasks))
  }, [tasks])

  function isOverdue(task: Task): boolean {
    return (
      !!task.due_date &&
      task.due_date < today &&
      task.status !== "done" &&
      task.status !== "cancelled"
    )
  }

  async function onDragEnd(result: DropResult) {
    const { source, destination, draggableId } = result

    // Dropped outside a droppable
    if (!destination) return

    // No change
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return

    const sourceStatus  = source.droppableId as TaskStatus
    const destStatus    = destination.droppableId as TaskStatus

    // Optimistic update
    setColumns((prev) => {
      const next = { ...prev }
      const sourceTasks = [...prev[sourceStatus]]
      const destTasks   =
        sourceStatus === destStatus
          ? sourceTasks
          : [...prev[destStatus]]

      const [moved] = sourceTasks.splice(source.index, 1)
      const updated = { ...moved, status: destStatus }

      if (sourceStatus === destStatus) {
        sourceTasks.splice(destination.index, 0, updated)
        next[sourceStatus] = sourceTasks
      } else {
        destTasks.splice(destination.index, 0, updated)
        next[sourceStatus] = sourceTasks
        next[destStatus]   = destTasks
      }

      return next
    })

    // Persist
    try {
      await updateTask(draggableId, {
        status:            destStatus,
        status_sort_order: destination.index,
      })
    } catch {
      toast.error("Failed to update task")
      // Revert on failure
      setColumns(buildColumnMap(tasks))
    }
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(({ status, label }) => {
          const columnTasks = columns[status] ?? []
          return (
            <div
              key={status}
              className="flex-shrink-0 w-64 flex flex-col gap-2"
            >
              {/* Column header */}
              <div
                className={`flex items-center justify-between px-3 py-2 rounded-lg border ${COLUMN_HEADER_COLORS[status]} bg-white dark:bg-[#0F0F12]`}
              >
                <span className="text-xs font-semibold uppercase tracking-wide">
                  {label}
                </span>
                <span className="text-xs font-medium opacity-60">
                  {columnTasks.length}
                </span>
              </div>

              {/* Droppable area */}
              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex flex-col gap-2 min-h-[120px] rounded-xl p-2 transition-colors ${
                      snapshot.isDraggingOver
                        ? "bg-gray-100 dark:bg-zinc-800/60"
                        : "bg-gray-50 dark:bg-zinc-900/40"
                    }`}
                  >
                    {columnTasks.map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <TaskCard
                              task={task}
                              isDragging={snapshot.isDragging}
                              isOverdue={isOverdue(task)}
                            />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}

                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                        No tasks
                      </p>
                    )}
                  </div>
                )}
              </Droppable>
            </div>
          )
        })}
      </div>
    </DragDropContext>
  )
}

interface TaskCardProps {
  task: Task
  isDragging: boolean
  isOverdue: boolean
}

function TaskCard({ task, isDragging, isOverdue }: TaskCardProps) {
  return (
    <Link
      href={`/admin/operations/tasks/${task.id}`}
      onClick={(e) => {
        // Prevent navigation during drag
        if (isDragging) e.preventDefault()
      }}
      className={`block rounded-lg border bg-white dark:bg-[#0F0F12] p-3 space-y-2 transition-shadow ${
        isDragging
          ? "shadow-lg border-gray-300 dark:border-gray-500"
          : "border-gray-200 dark:border-[#1F1F23] hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"
      }`}
    >
      {/* Unlinked signal */}
      {!task.project_id && (
        <div className="flex items-center gap-1">
          <Unlink className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] text-amber-500 dark:text-amber-400">
            Unlinked
          </span>
        </div>
      )}

      {/* Title */}
      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
        {task.title}
      </p>

      {/* Project */}
      {task.project && (
        <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
          {task.project.name}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 pt-1">
        <TaskPriorityBadge priority={task.priority} />

        <div className="flex items-center gap-1.5 ml-auto">
          {task.due_date && (
            <span
              className={`text-[10px] font-medium ${
                isOverdue
                  ? "text-red-600 dark:text-red-400"
                  : "text-gray-600 dark:text-gray-400"
              }`}
            >
              {task.due_date}
            </span>
          )}
          {task.assignee && (
            <div
              className="w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-[10px] font-medium text-gray-700 dark:text-gray-200"
              title={task.assignee.email}
            >
              {task.assignee.email[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
