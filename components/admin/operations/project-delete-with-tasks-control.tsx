"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { deleteProjectAndTasks } from "@/lib/actions/operations"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type AfterDelete =
  | { mode: "refresh" }
  | { mode: "redirect"; href: string }

export function ProjectDeleteWithTasksControl({
  projectId,
  projectName,
  taskCount,
  expectedObjectiveId,
  afterDelete,
  variant,
  className,
}: {
  projectId: string
  projectName: string
  taskCount: number
  /** Satt på objective-sidan så fel projekt-id inte kan användas. */
  expectedObjectiveId?: string
  afterDelete: AfterDelete
  variant: "icon" | "button"
  className?: string
}) {
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteProjectAndTasks(projectId, expectedObjectiveId)
      toast.success("Project and tasks removed")
      setConfirmOpen(false)
      if (afterDelete.mode === "redirect") {
        router.push(afterDelete.href)
        router.refresh()
      } else {
        router.refresh()
      }
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not delete project"
      )
    } finally {
      setDeleting(false)
    }
  }

  const taskPhrase =
    taskCount === 0
      ? "No tasks are linked to this project."
      : taskCount === 1
        ? "1 task linked to this project will be soft-deleted."
        : `${taskCount} tasks linked to this project will be soft-deleted.`

  return (
    <>
      {variant === "icon" ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "size-9 shrink-0 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-zinc-400 dark:hover:text-red-400 dark:hover:bg-red-950/40",
            className
          )}
          aria-label={`Delete project ${projectName}`}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setConfirmOpen(true)
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          className={cn(
            "border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40",
            className
          )}
          onClick={() => setConfirmOpen(true)}
        >
          <Trash2 className="mr-2 size-4 shrink-0" aria-hidden />
          Delete project and tasks
        </Button>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="border-gray-200 bg-white dark:border-[#1F1F23] dark:bg-[#0F0F12]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">
              Delete project?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
              <span className="block font-medium text-gray-800 dark:text-zinc-200">
                {projectName}
              </span>
              <span className="mt-2 block">
                The project will be soft-deleted. {taskPhrase}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={() => void handleDelete()}
            >
              {deleting ? "Deleting…" : "Delete project & tasks"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
