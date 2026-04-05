"use client"

import { useState, useEffect, useSyncExternalStore } from "react"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { toast } from "sonner"
import { updateTask } from "@/lib/actions/operations"
import { TaskPriorityBadge } from "./task-priority-badge"
import { GripVertical, Unlink } from "lucide-react"
import Link from "next/link"
import type { Task, TaskStatus } from "@/lib/types/operations"

interface Props {
  tasks: Task[]
}

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "Todo" },
  { status: "in_progress", label: "In Progress" },
  { status: "blocked", label: "Blocked" },
  { status: "review", label: "Review" },
  { status: "done", label: "Done" },
]

const COLUMN_HEADER_COLORS: Record<TaskStatus, string> = {
  todo: "border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400",
  in_progress:
    "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400",
  blocked: "border-red-300 text-red-700 dark:border-red-700 dark:text-red-400",
  review:
    "border-amber-300 text-amber-700 dark:border-amber-700 dark:text-amber-400",
  done: "border-green-300 text-green-700 dark:border-green-700 dark:text-green-400",
  cancelled:
    "border-gray-200 text-gray-400 dark:border-gray-700 dark:text-gray-400",
}

type ColumnMap = Record<TaskStatus, Task[]>

function buildColumnMap(tasks: Task[]): ColumnMap {
  const map: ColumnMap = {
    todo: [],
    in_progress: [],
    blocked: [],
    review: [],
    done: [],
    cancelled: [],
  }
  for (const task of tasks) {
    const col = map[task.status]
    if (col) col.push(task)
  }
  for (const col of Object.values(map)) {
    col.sort((a, b) => a.status_sort_order - b.status_sort_order)
  }
  return map
}

function findColumnForTaskId(prev: ColumnMap, taskId: string): TaskStatus | null {
  for (const s of Object.keys(prev) as TaskStatus[]) {
    if (prev[s].some((t) => t.id === taskId)) return s
  }
  return null
}

function isBoardColumnId(id: string): id is TaskStatus {
  return COLUMNS.some((c) => c.status === id)
}

/** Ny kolumnordning efter drag, eller null om inget ändrats. */
function applyDrag(
  prev: ColumnMap,
  activeId: string,
  overId: string
): ColumnMap | null {
  if (activeId === overId) return null

  const srcCol = findColumnForTaskId(prev, activeId)
  if (!srcCol) return null

  let destCol: TaskStatus
  let destIndex: number

  if (isBoardColumnId(overId)) {
    destCol = overId
    destIndex = prev[destCol].length
  } else {
    const oc = findColumnForTaskId(prev, overId)
    if (!oc) return null
    destCol = oc
    destIndex = prev[destCol].findIndex((t) => t.id === overId)
    if (destIndex < 0) return null
  }

  const srcIdx = prev[srcCol].findIndex((t) => t.id === activeId)
  if (srcIdx < 0) return null

  if (srcCol === destCol) {
    if (srcIdx === destIndex) return null
    return {
      ...prev,
      [srcCol]: arrayMove(prev[srcCol], srcIdx, destIndex),
    }
  }

  const task = prev[srcCol][srcIdx]
  const newSrc = prev[srcCol].filter((t) => t.id !== activeId)
  const newDest = [...prev[destCol]]
  newDest.splice(destIndex, 0, { ...task, status: destCol })
  return {
    ...prev,
    [srcCol]: newSrc,
    [destCol]: newDest,
  }
}

const BOARD_LAYOUT_CLASS =
  "-mx-1 flex w-full min-w-0 flex-col gap-4 px-1 pb-4 sm:mx-0 sm:px-0 md:inline-flex md:w-max md:max-w-none md:min-w-max md:flex-row md:items-start md:gap-3 md:pb-4"

/**
 * Whole-card drag only on real desktop-style input. Plain (min-width: 768px)
 * matches phone landscape; listeners on the full card then attach dnd-kit’s
 * document pointermove (non-passive) and block scrolling site-wide while interacting.
 */
function useWholeCardDragLayout(): boolean {
  const query = "(min-width: 768px) and (hover: hover) and (pointer: fine)"
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined") return () => {}
      const mq = window.matchMedia(query)
      mq.addEventListener("change", onChange)
      return () => mq.removeEventListener("change", onChange)
    },
    () => window.matchMedia(query).matches,
    () => false
  )
}

export function TaskBoard({ tasks }: Props) {
  const today = new Date().toISOString().split("T")[0]

  function isOverdue(task: Task): boolean {
    return (
      !!task.due_date &&
      task.due_date < today &&
      task.status !== "done" &&
      task.status !== "cancelled"
    )
  }

  return (
    <div>
      <p className="mb-2 text-xs text-gray-500 dark:text-zinc-400 md:hidden">
        Scrolla på kortets text.{" "}
        <span className="font-medium text-gray-700 dark:text-zinc-300">
          Dra i vänster kant
        </span>{" "}
        (lite åt sidan) för att flytta — ingen långtryckning behövs.
      </p>
      <TaskBoardDnD tasks={tasks} isOverdue={isOverdue} />
    </div>
  )
}

function TaskBoardDnD({
  tasks,
  isOverdue,
}: {
  tasks: Task[]
  isOverdue: (task: Task) => boolean
}) {
  const [columns, setColumns] = useState<ColumnMap>(() =>
    buildColumnMap(tasks)
  )
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  )

  useEffect(() => {
    setColumns(buildColumnMap(tasks))
  }, [tasks])

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return
    // #region agent log
    fetch("/api/debug/agent-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "aae6fd",
        hypothesisId: "H2",
        location: "task-board.tsx:TaskBoardDnD:mount",
        message: "board DnD mounted",
        data: { taskCount: tasks.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
    // #endregion
  }, [])

  const activeTask =
    activeId == null
      ? null
      : (Object.values(columns)
          .flat()
          .find((t) => t.id === activeId) ?? null)

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id))
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)
    if (!over) return

    const activeTaskId = String(active.id)
    const overId = String(over.id)

    const next = applyDrag(columns, activeTaskId, overId)
    if (!next) return

    setColumns(next)
    const col = findColumnForTaskId(next, activeTaskId)
    if (!col) return
    const idx = next[col].findIndex((t) => t.id === activeTaskId)

    try {
      await updateTask(activeTaskId, {
        status: col,
        status_sort_order: idx,
      })
    } catch {
      toast.error("Failed to update task")
      setColumns(buildColumnMap(tasks))
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className={BOARD_LAYOUT_CLASS}>
        {COLUMNS.map(({ status, label }) => {
          const columnTasks = columns[status] ?? []
          const taskIds = columnTasks.map((t) => t.id)
          return (
            <BoardColumn
              key={status}
              status={status}
              label={label}
              columnTasks={columnTasks}
              taskIds={taskIds}
              isOverdue={isOverdue}
            />
          )
        })}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeTask ? (
          <div className="pointer-events-none max-w-[280px] rounded-lg border border-gray-200 bg-white p-3 opacity-95 shadow-xl dark:border-[#1F1F23] dark:bg-[#0F0F12]">
            <TaskCardBody
              task={activeTask}
              isOverdue={isOverdue(activeTask)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BoardColumn({
  status,
  label,
  columnTasks,
  taskIds,
  isOverdue,
}: {
  status: TaskStatus
  label: string
  columnTasks: Task[]
  taskIds: string[]
  isOverdue: (task: Task) => boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: "column", status },
  })

  return (
    <div className="flex w-full flex-shrink-0 flex-col gap-2 md:w-64">
      <div
        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${COLUMN_HEADER_COLORS[status]} bg-white dark:bg-[#0F0F12]`}
      >
        <span className="text-xs font-semibold uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs font-medium opacity-60">
          {columnTasks.length}
        </span>
      </div>

      <div
        ref={setNodeRef}
        className={`flex min-h-[120px] flex-col gap-2 rounded-xl p-2 transition-colors ${
          isOver
            ? "bg-gray-100 dark:bg-zinc-800/60"
            : "bg-gray-50 dark:bg-zinc-900/40"
        }`}
      >
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {columnTasks.map((task) => (
            <SortableTaskCard
              key={task.id}
              task={task}
              columnId={status}
              isOverdue={isOverdue(task)}
            />
          ))}
        </SortableContext>

        {columnTasks.length === 0 && (
          <p className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
            No tasks
          </p>
        )}
      </div>
    </div>
  )
}

function SortableTaskCard({
  task,
  columnId,
  isOverdue,
}: {
  task: Task
  columnId: TaskStatus
  isOverdue: boolean
}) {
  const wholeCardDrag = useWholeCardDragLayout()
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", status: columnId },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

  const shellTone = isDragging
    ? "shadow-lg border-gray-300 dark:border-gray-500"
    : "border-gray-200 dark:border-[#1F1F23] hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm"

  if (wholeCardDrag) {
    return (
      <div ref={setNodeRef} style={style}>
        <Link
          ref={setActivatorNodeRef}
          href={`/admin/operations/tasks/${task.id}`}
          {...listeners}
          {...attributes}
          className={`block min-w-0 space-y-2 overflow-clip rounded-lg border bg-white p-3 transition-shadow dark:bg-[#0F0F12] cursor-grab touch-manipulation active:cursor-grabbing ${shellTone}`}
          title="Håll ned och dra för att flytta kortet"
          aria-label="Håll ned och dra för att flytta uppgift"
        >
          <TaskCardBody task={task} isOverdue={isOverdue} />
        </Link>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch rounded-lg border bg-white dark:bg-[#0F0F12] transition-shadow ${shellTone}`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        className="flex w-12 min-w-12 shrink-0 cursor-grab touch-none items-center justify-center self-stretch rounded-l-lg border-r border-gray-200 bg-gray-50/80 text-gray-400 hover:bg-gray-100 active:cursor-grabbing dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-500 dark:hover:bg-zinc-800/80"
        aria-label="Dra för att flytta uppgift"
        title="Dra här för att flytta kortet"
        {...listeners}
        {...attributes}
      >
        <GripVertical className="h-5 w-5" aria-hidden />
      </button>

      <Link
        href={`/admin/operations/tasks/${task.id}`}
        className="min-w-0 flex-1 touch-manipulation space-y-2 rounded-r-lg p-3"
      >
        <TaskCardBody task={task} isOverdue={isOverdue} />
      </Link>
    </div>
  )
}

function TaskCardBody({
  task,
  isOverdue,
}: {
  task: Task
  isOverdue: boolean
}) {
  return (
    <>
      {!task.project_id && (
        <div className="flex items-center gap-1">
          <Unlink className="h-3 w-3 text-amber-400" />
          <span className="text-[10px] text-amber-500 dark:text-amber-400">
            Unlinked
          </span>
        </div>
      )}

      <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-gray-100">
        {task.title}
      </p>

      {task.project && (
        <p className="truncate text-xs text-gray-600 dark:text-gray-400">
          {task.project.name}
        </p>
      )}

      <div className="flex items-center justify-between gap-2 pt-1">
        <TaskPriorityBadge priority={task.priority} />

        <div className="ml-auto flex items-center gap-1.5">
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
              className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-700 dark:bg-gray-600 dark:text-gray-200"
              title={task.assignee.email}
            >
              {task.assignee.email[0].toUpperCase()}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
