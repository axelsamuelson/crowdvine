"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
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
import { deleteTask } from "@/lib/actions/operations"

interface Props {
  taskId: string
  /** Om satt: efter radering till projektets sida (annars tasks-listan). */
  projectId?: string | null
}

export function TaskDetailDelete({ taskId, projectId = null }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    try {
      await deleteTask(taskId)
      toast.success("Task deleted")
      const href =
        projectId != null && projectId !== ""
          ? `/admin/operations/projects/${projectId}`
          : "/admin/operations/tasks"
      router.push(href)
      router.refresh()
    } catch {
      toast.error("Failed to delete task")
    }
  }

  return (
    <>
      <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50/80 dark:bg-red-950/20 p-4">
        <p className="text-xs text-red-800/90 dark:text-red-300/90 mb-3">
          Remove this task from the list. The task is soft-deleted and can be
          recovered if needed.
        </p>
        <Button
          type="button"
          variant="outline"
          className="w-full border-red-300 bg-red-600 text-white hover:bg-red-700 hover:text-white dark:border-red-800 dark:bg-red-700 dark:hover:bg-red-600"
          onClick={() => setOpen(true)}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Delete task
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="rounded-xl border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-zinc-100">
              Delete task?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-zinc-400">
              This will soft-delete the task. It can be recovered if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-lg text-xs font-medium">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleDelete()
              }}
              className="rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
