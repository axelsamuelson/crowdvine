"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Copy, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
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
import {
  deleteObjective,
  deleteProject,
  deleteTask,
  duplicateTask,
} from "@/lib/actions/operations"
import { GoalStatusBadge } from "@/components/admin/operations/goal-status-badge"
import { ObjectiveStatusBadge } from "@/components/admin/operations/objective-status-badge"
import { ProjectStatusBadge } from "@/components/admin/operations/project-status-badge"
import { TaskStatusBadge } from "@/components/admin/operations/task-status-badge"
import { ProgressBar } from "@/components/admin/operations/progress-bar"
import type {
  AdminUserMin,
  Goal,
  GoalMin,
  KeyResultPickerOption,
  Objective,
  Project,
  Task,
} from "@/lib/types/operations"
import { TaskDetailDescriptionBlock } from "@/components/admin/operations/task-detail-description-block"
import { TaskDetailTitleEditor } from "@/components/admin/operations/task-detail-title-editor"
import { StrategyMapTaskFields } from "./strategy-map-task-fields"
import {
  StrategyMapConnectionsCard,
  type StrategyMapConnectionItem,
} from "./strategy-map-connections-card"
import type { GraphEntityKind } from "../utils/validate-connection"

export type StrategyMapEntityDeletedPayload = {
  kind: "objective" | "project" | "task"
  id: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  kind: GraphEntityKind | null
  record: Goal | Objective | Project | Task | null
  connectionItems?: StrategyMapConnectionItem[]
  /** Uppdaterar lokal kartdata efter soft-delete (strategy map). */
  onEntityDeleted?: (payload: StrategyMapEntityDeletedPayload) => void
  /** Redigera task: objective, projekt, flera assignees (strategy map). */
  taskEditContext?: {
    objectives: Objective[]
    projects: Project[]
    admins: AdminUserMin[]
    goals: GoalMin[]
    keyResultOptions?: KeyResultPickerOption[]
    onTaskUpdated: (task: Task) => void
    onObjectiveCreated?: (objective: Objective) => void
    onProjectCreated?: (project: Project) => void
    onTaskDuplicated?: (task: Task) => void
  }
  /** Vid helskärm: montera Sheet inuti fullscreen-elementet så overlay/fokus fungerar. */
  sheetPortalContainer?: HTMLElement | null
}

export function NodeDetailPanel({
  open,
  onOpenChange,
  kind,
  record,
  connectionItems = [],
  onEntityDeleted,
  taskEditContext,
  sheetPortalContainer,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [dupPending, startDup] = useTransition()

  const canDelete =
    Boolean(record) &&
    (kind === "objective" || kind === "project" || kind === "task")

  async function confirmDelete() {
    if (!record || !kind || !canDelete) return
    const id = record.id
    setDeleting(true)
    try {
      if (kind === "task") await deleteTask(id)
      else if (kind === "project") await deleteProject(id)
      else await deleteObjective(id)

      toast.success(
        kind === "task"
          ? "Task borttagen"
          : kind === "project"
            ? "Projekt borttaget"
            : "Objective borttaget"
      )
      onEntityDeleted?.({ kind, id })
      setDeleteOpen(false)
      onOpenChange(false)
    } catch {
      toast.error("Kunde inte radera")
    } finally {
      setDeleting(false)
    }
  }

  const deleteDescription =
    kind === "task"
      ? "Tasken soft-raderas (dold i listor). Du kan återställa via databas om det behövs."
      : kind === "project"
        ? "Projektet soft-raderas. Tasks som hängde under projektet försvinner från kartan tills de flyttas eller raderas."
        : kind === "objective"
          ? "Objective soft-raderas. Kopplade projekt och tasks tas bort från kartan i den här vyn."
          : ""

  const href =
    kind === "goal" && record
      ? `/admin/operations/goals/${record.id}`
      : kind === "objective" && record
        ? `/admin/operations/objectives/${record.id}`
        : kind === "project" && record
          ? `/admin/operations/projects/${record.id}`
          : kind === "task" && record
            ? `/admin/operations/tasks/${record.id}`
            : null

  const title =
    record && "title" in record
      ? record.title
      : record && "name" in record
        ? record.name
        : ""

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        portalContainer={sheetPortalContainer}
        className={cn(
          "w-full sm:max-w-md overflow-y-auto border-gray-200 bg-white text-gray-900",
          "dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100",
          /* Close (X) — same contrast as admin shell; default was invisible on light sheet + dark: text */
          "[&>button.absolute]:text-gray-700 [&>button.absolute]:hover:text-gray-900",
          "dark:[&>button.absolute]:text-zinc-300 dark:[&>button.absolute]:hover:text-white"
        )}
      >
        <SheetHeader>
          <SheetTitle className="text-left pr-8 text-gray-900 dark:text-zinc-100">
            {kind ? kind.charAt(0).toUpperCase() + kind.slice(1) : "Detalj"}
          </SheetTitle>
        </SheetHeader>

        {!record || !kind ? (
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-4">
            Inget valt.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {kind === "task" && taskEditContext ? (
              <TaskDetailTitleEditor
                taskId={record.id}
                initialTitle={(record as Task).title}
                onSaved={taskEditContext.onTaskUpdated}
                variant="sheet"
              />
            ) : (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 leading-snug">
                {title}
              </h2>
            )}

            {kind === "goal" && (
              <>
                <GoalStatusBadge status={(record as Goal).status} />
                <div>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mb-1">
                    Progress
                  </p>
                  <ProgressBar
                    value={(record as Goal).progress ?? 0}
                    size="sm"
                  />
                </div>
                {(record as Goal).description && (
                  <p className="text-sm text-gray-700 dark:text-zinc-300">
                    {(record as Goal).description}
                  </p>
                )}
              </>
            )}

            {kind === "objective" && (
              <>
                <ObjectiveStatusBadge status={(record as Objective).status} />
                <div>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mb-1">
                    Progress
                  </p>
                  <ProgressBar
                    value={(record as Objective).progress ?? 0}
                    size="sm"
                  />
                </div>
                {(record as Objective).description && (
                  <p className="text-sm text-gray-700 dark:text-zinc-300">
                    {(record as Objective).description}
                  </p>
                )}
              </>
            )}

            {kind === "project" && (
              <>
                <ProjectStatusBadge status={(record as Project).status} />
                <div>
                  <p className="text-xs text-gray-600 dark:text-zinc-400 mb-1">
                    Progress (tasks)
                  </p>
                  <ProgressBar
                    value={(record as Project).progress ?? 0}
                    size="sm"
                  />
                </div>
                {(record as Project).description && (
                  <p className="text-sm text-gray-700 dark:text-zinc-300">
                    {(record as Project).description}
                  </p>
                )}
              </>
            )}

            {kind === "task" && (
              <>
                <TaskStatusBadge status={(record as Task).status} />
                {taskEditContext ? (
                  <TaskDetailDescriptionBlock
                    taskId={record.id}
                    initialDescription={(record as Task).description ?? null}
                    onSaved={taskEditContext.onTaskUpdated}
                    variant="sheet"
                  />
                ) : (
                  (record as Task).description && (
                    <p className="text-sm text-gray-700 dark:text-zinc-300">
                      {(record as Task).description}
                    </p>
                  )
                )}
                {((record as Task).assignees?.length ?? 0) > 0 ? (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                      Ansvariga
                    </p>
                    <ul className="text-xs text-gray-700 dark:text-zinc-300 list-disc pl-4 space-y-0.5">
                      {(record as Task).assignees!.map((a) => (
                        <li key={a.id}>{a.email}</li>
                      ))}
                    </ul>
                  </div>
                ) : (record as Task).assignee?.email ? (
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    Ansvarig: {(record as Task).assignee!.email}
                  </p>
                ) : null}
                {taskEditContext && (
                  <StrategyMapTaskFields
                    task={record as Task}
                    objectives={taskEditContext.objectives}
                    projects={taskEditContext.projects}
                    admins={taskEditContext.admins}
                    goals={taskEditContext.goals}
                    keyResultOptions={
                      taskEditContext.keyResultOptions ?? []
                    }
                    onTaskUpdated={taskEditContext.onTaskUpdated}
                    onObjectiveCreated={taskEditContext.onObjectiveCreated}
                    onProjectCreated={taskEditContext.onProjectCreated}
                  />
                )}
              </>
            )}

            <StrategyMapConnectionsCard items={connectionItems} />

            <div className="flex flex-col gap-2 pt-1">
              {href && (
                <Button
                  asChild
                  variant="default"
                  className="w-full bg-gray-900 text-white hover:bg-gray-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                >
                  <Link href={href}>Öppna full vy</Link>
                </Button>
              )}

              {kind === "task" &&
                record &&
                taskEditContext?.onTaskDuplicated && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={dupPending}
                    className="w-full border-gray-200 dark:border-zinc-700"
                    onClick={() => {
                      startDup(async () => {
                        try {
                          const t = await duplicateTask(record.id)
                          taskEditContext.onTaskDuplicated!(t)
                          toast.success("Task duplicerad")
                        } catch {
                          toast.error("Kunde inte duplicera")
                        }
                      })
                    }}
                  >
                    <Copy className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                    {dupPending ? "Duplicerar…" : "Duplicera task"}
                  </Button>
                )}

              {canDelete && onEntityDeleted && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/40"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4 shrink-0" aria-hidden />
                  {kind === "task"
                    ? "Radera task"
                    : kind === "project"
                      ? "Radera projekt"
                      : "Radera objective"}
                </Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent
          className={cn(
            "border-gray-200 bg-white text-gray-900",
            "dark:border-[#1F1F23] dark:bg-[#0F0F12] dark:text-zinc-100"
          )}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">
              {kind === "task"
                ? "Radera task?"
                : kind === "project"
                  ? "Radera projekt?"
                  : "Radera objective?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
              {deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100">
              Avbryt
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault()
                void confirmDelete()
              }}
            >
              {deleting ? "Raderar…" : "Radera"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
